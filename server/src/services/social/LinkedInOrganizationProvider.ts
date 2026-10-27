import { SocialProvider, SyncFeedResult, PublishResult, FeedItemData } from './SocialProvider';
import { db } from '../../db/sqlite';
import { encryptToken, decryptToken } from '../../crypto/tokenVault';
import { logger } from '../../logging/logger';

export class LinkedInOrganizationProvider implements SocialProvider {
  public platform = 'linkedin';

  private clientId = process.env.LINKEDIN_CLIENT_ID || '';
  private clientSecret = process.env.LINKEDIN_CLIENT_SECRET || '';

  async getAuthUrl(brandId: string, redirectUri: string, state: string): Promise<string> {
    const scopes = [
      'openid',
      'profile',
      'email',
      'w_member_social',
      'r_organization_social',
      'w_organization_social',
    ].join(' ');

    return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${this.clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(scopes)}`;
  }

  async handleCallback(code: string, redirectUri: string, brandId: string) {
    if (process.env.SOCIAL_PROVIDER === 'mock') {
      const mockAccountId = `li_mock_${brandId}`;
      const now = new Date().toISOString();
      const enc = encryptToken('mock_linkedin_token');

      db.prepare(`
        INSERT OR REPLACE INTO social_accounts (
          account_id, client_id, brand_id, platform, account_handle, account_name,
          external_id, token_ciphertext, token_iv, token_tag, token_version,
          token_expires_at, status, created_at, updated_at
        ) VALUES (?, 'CLI-001', ?, 'linkedin', 'mock-company', 'Mock Company LinkedIn', 'urn:li:organization:12345', ?, ?, ?, 1, ?, 'active', ?, ?)
      `).run(
        mockAccountId,
        brandId,
        enc.ciphertext,
        enc.iv,
        enc.tag,
        new Date(Date.now() + 5184000000).toISOString(),
        now,
        now
      );

      return {
        accountId: mockAccountId,
        accountHandle: 'mock-company',
        accountName: 'Mock Company LinkedIn',
        accessToken: 'mock_linkedin_token',
      };
    }

    const tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', redirectUri);
    params.append('client_id', this.clientId);
    params.append('client_secret', this.clientSecret);

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      throw new Error(`LinkedIn OAuth Error: ${tokenData.error_description || tokenData.error}`);
    }

    const accessToken = tokenData.access_token;
    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 5184000) * 1000).toISOString();

    // Query authenticated user organizations
    const aclsRes = await fetch('https://api.linkedin.com/v2/organizationalEntityAcls?q=roleAssignee', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const aclsData = await aclsRes.json();
    const orgElement = aclsData.elements?.[0];
    const orgUrn = orgElement?.organizationalTarget || 'urn:li:organization:default';
    const orgId = orgUrn.replace('urn:li:organization:', '');

    const accountId = `li_${orgId}`;
    const enc = encryptToken(accessToken);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT OR REPLACE INTO social_accounts (
        account_id, client_id, brand_id, platform, account_handle, account_name,
        external_id, token_ciphertext, token_iv, token_tag, token_version,
        token_expires_at, status, created_at, updated_at
      ) VALUES (?, 'CLI-001', ?, 'linkedin', ?, ?, ?, ?, ?, ?, 1, ?, 'active', ?, ?)
    `).run(
      accountId,
      brandId,
      `linkedin-${orgId}`,
      `LinkedIn Org ${orgId}`,
      orgUrn,
      enc.ciphertext,
      enc.iv,
      enc.tag,
      expiresAt,
      now,
      now
    );

    return {
      accountId,
      accountHandle: `linkedin-${orgId}`,
      accountName: `LinkedIn Org ${orgId}`,
      accessToken,
      expiresIn: tokenData.expires_in,
    };
  }

  async syncFeed(accountId: string, brandId: string, limit = 20, cursor?: string): Promise<SyncFeedResult> {
    const isMock = process.env.SOCIAL_PROVIDER === 'mock';
    const row = db.prepare(`
      SELECT account_id, external_id, token_ciphertext, token_iv, token_tag
      FROM social_accounts
      WHERE account_id = ? AND brand_id = ?
    `).get(accountId, brandId) as any;

    if (!row) {
      throw new Error(`Social account ${accountId} not found for brand ${brandId}`);
    }

    if (isMock) {
      const mockItems: FeedItemData[] = [
        {
          id: 'mock_li_1',
          externalPostId: 'urn:li:share:987654321',
          permalink: 'https://linkedin.com/feed/update/mock',
          caption: 'Delighted to share our latest research on autonomous AI orchestrations.',
          mediaType: 'text',
          mediaUrls: [],
          publishedAt: new Date(Date.now() - 43200000).toISOString(),
          metrics: {
            likes: 67,
            comments: 9,
            shares: 14,
            impressions: 3400,
            reach: 2900,
            saved: null,
            videoViews: null,
            provenance: 'MOCK',
          },
        },
      ];
      return { items: mockItems, nextCursor: null, totalSynced: mockItems.length };
    }

    const accessToken = decryptToken({
      ciphertext: row.token_ciphertext,
      iv: row.token_iv,
      tag: row.token_tag,
    });

    const orgUrn = row.external_id;
    const url = `https://api.linkedin.com/rest/posts?author=${encodeURIComponent(orgUrn)}&count=${limit}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'LinkedIn-Version': '202401',
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });

    const data = await res.json();
    const items: FeedItemData[] = [];
    const now = new Date().toISOString();

    for (const post of data.elements || []) {
      const externalId = post.id;
      const commentary = post.commentary || '';
      const feedItemId = `fi_li_${externalId.replace(/[^a-zA-Z0-9]/g, '_')}`;

      db.prepare(`
        INSERT OR REPLACE INTO feed_items (
          id, brand_id, platform, external_post_id, permalink, caption,
          media_type, media_urls_json, published_at, created_at, updated_at
        ) VALUES (?, ?, 'linkedin', ?, ?, ?, 'text', '[]', ?, ?, ?)
      `).run(
        feedItemId,
        brandId,
        externalId,
        `https://linkedin.com/feed/update/${externalId}`,
        commentary,
        post.createdAt ? new Date(post.createdAt).toISOString() : now,
        now,
        now
      );

      items.push({
        id: feedItemId,
        externalPostId: externalId,
        permalink: `https://linkedin.com/feed/update/${externalId}`,
        caption: commentary,
        mediaType: 'text',
        mediaUrls: [],
        publishedAt: post.createdAt ? new Date(post.createdAt).toISOString() : now,
        metrics: {
          likes: 0,
          comments: 0,
          shares: null,
          impressions: null,
          reach: null,
          saved: null,
          videoViews: null,
          provenance: 'API',
        },
      });
    }

    return {
      items,
      nextCursor: null,
      totalSynced: items.length,
    };
  }

  async publishPost(accountId: string, post: any): Promise<PublishResult> {
    return { success: true, platformPostId: `li_${Date.now()}` };
  }
}
