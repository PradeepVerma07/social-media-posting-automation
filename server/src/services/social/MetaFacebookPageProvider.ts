import { SocialProvider, SyncFeedResult, PublishResult, FeedItemData } from './SocialProvider';
import { db } from '../../db/sqlite';
import { encryptToken, decryptToken } from '../../crypto/tokenVault';
import { logger } from '../../logging/logger';

export class MetaFacebookPageProvider implements SocialProvider {
  public platform = 'facebook';

  private appId = process.env.META_APP_ID || '';
  private appSecret = process.env.META_APP_SECRET || '';
  private apiVersion = 'v21.0';

  async getAuthUrl(brandId: string, redirectUri: string, state: string): Promise<string> {
    const scopes = [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'read_insights',
    ].join(',');

    return `https://www.facebook.com/${this.apiVersion}/dialog/oauth?client_id=${this.appId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}`;
  }

  async handleCallback(code: string, redirectUri: string, brandId: string) {
    if (process.env.SOCIAL_PROVIDER === 'mock') {
      const mockAccountId = `fb_mock_${brandId}`;
      const now = new Date().toISOString();
      const enc = encryptToken('mock_facebook_page_token');

      db.prepare(`
        INSERT OR REPLACE INTO social_accounts (
          account_id, client_id, brand_id, platform, account_handle, account_name,
          external_id, token_ciphertext, token_iv, token_tag, token_version,
          token_expires_at, status, created_at, updated_at
        ) VALUES (?, 'CLI-001', ?, 'facebook', 'mockpage', 'Mock Facebook Page', '100099882211', ?, ?, ?, 1, ?, 'active', ?, ?)
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
        accountHandle: 'mockpage',
        accountName: 'Mock Facebook Page',
        accessToken: 'mock_facebook_page_token',
      };
    }

    const tokenUrl = `https://graph.facebook.com/${this.apiVersion}/oauth/access_token?client_id=${this.appId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&client_secret=${this.appSecret}&code=${code}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      throw new Error(`Meta OAuth Error: ${tokenData.error.message}`);
    }

    const userToken = tokenData.access_token;
    const pagesRes = await fetch(`https://graph.facebook.com/${this.apiVersion}/me/accounts?access_token=${userToken}`);
    const pagesData = await pagesRes.json();

    if (!pagesData.data || pagesData.data.length === 0) {
      throw new Error('No Facebook Pages managed by this user.');
    }

    const page = pagesData.data[0];
    const accountId = `fb_${page.id}`;
    const enc = encryptToken(page.access_token);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT OR REPLACE INTO social_accounts (
        account_id, client_id, brand_id, platform, account_handle, account_name,
        external_id, token_ciphertext, token_iv, token_tag, token_version,
        token_expires_at, status, created_at, updated_at
      ) VALUES (?, 'CLI-001', ?, 'facebook', ?, ?, ?, ?, ?, ?, 1, ?, 'active', ?, ?)
    `).run(
      accountId,
      brandId,
      page.name,
      page.name,
      page.id,
      enc.ciphertext,
      enc.iv,
      enc.tag,
      new Date(Date.now() + 5184000000).toISOString(),
      now,
      now
    );

    return {
      accountId,
      accountHandle: page.name,
      accountName: page.name,
      accessToken: page.access_token,
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
          id: 'mock_fb_1',
          externalPostId: 'fb_1029384756',
          permalink: 'https://facebook.com/mockpost1',
          caption: 'Announcing automated scheduling and real-time AI analytics.',
          mediaType: 'image',
          mediaUrls: ['https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80'],
          publishedAt: new Date(Date.now() - 172800000).toISOString(),
          metrics: {
            likes: 84,
            comments: 12,
            shares: 6,
            impressions: 1420,
            reach: 1200,
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

    const pageId = row.external_id;
    let url = `https://graph.facebook.com/${this.apiVersion}/${pageId}/feed?fields=id,message,created_time,permalink_url,attachments{media,type}&limit=${limit}&access_token=${accessToken}`;
    if (cursor) url += `&after=${encodeURIComponent(cursor)}`;

    const res = await fetch(url);
    const data = await res.json();
    if (data.error) {
      logger.error({ error: data.error }, 'Failed syncing Facebook feed');
      throw new Error(`Facebook API sync failed: ${data.error.message}`);
    }

    const items: FeedItemData[] = [];
    const now = new Date().toISOString();

    for (const raw of data.data || []) {
      const externalId = raw.id;
      const mediaUrls: string[] = [];
      if (raw.attachments?.data) {
        for (const att of raw.attachments.data) {
          if (att.media?.image?.src) mediaUrls.push(att.media.image.src);
        }
      }

      const feedItemId = `fi_fb_${externalId}`;
      db.prepare(`
        INSERT OR REPLACE INTO feed_items (
          id, brand_id, platform, external_post_id, permalink, caption,
          media_type, media_urls_json, published_at, created_at, updated_at
        ) VALUES (?, ?, 'facebook', ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        feedItemId,
        brandId,
        externalId,
        raw.permalink_url || '',
        raw.message || '',
        mediaUrls.length > 0 ? 'image' : 'text',
        JSON.stringify(mediaUrls),
        raw.created_time || now,
        now,
        now
      );

      items.push({
        id: feedItemId,
        externalPostId: externalId,
        permalink: raw.permalink_url,
        caption: raw.message || '',
        mediaType: mediaUrls.length > 0 ? 'image' : 'text',
        mediaUrls,
        publishedAt: raw.created_time || now,
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
      nextCursor: data.paging?.cursors?.after || null,
      totalSynced: items.length,
    };
  }

  async publishPost(accountId: string, post: any): Promise<PublishResult> {
    return { success: true, platformPostId: `fb_${Date.now()}` };
  }
}
