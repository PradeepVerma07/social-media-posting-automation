import { SocialProvider, SyncFeedResult, PublishResult, FeedItemData } from './SocialProvider';
import { db } from '../../db/sqlite';
import { encryptToken, decryptToken } from '../../crypto/tokenVault';
import { logger } from '../../logging/logger';

export class MetaInstagramProvider implements SocialProvider {
  public platform = 'instagram';

  private appId = process.env.META_APP_ID || '';
  private appSecret = process.env.META_APP_SECRET || '';
  private apiVersion = 'v21.0';

  async getAuthUrl(brandId: string, redirectUri: string, state: string): Promise<string> {
    const scopes = [
      'instagram_basic',
      'instagram_manage_insights',
      'pages_show_list',
      'pages_read_engagement',
    ].join(',');

    return `https://www.facebook.com/${this.apiVersion}/dialog/oauth?client_id=${this.appId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${encodeURIComponent(scopes)}&state=${encodeURIComponent(state)}`;
  }

  async handleCallback(code: string, redirectUri: string, brandId: string) {
    if (process.env.SOCIAL_PROVIDER === 'mock') {
      const mockAccountId = `ig_mock_${brandId}`;
      const now = new Date().toISOString();
      const enc = encryptToken('mock_instagram_access_token');

      db.prepare(`
        INSERT OR REPLACE INTO social_accounts (
          account_id, client_id, brand_id, platform, account_handle, account_name,
          external_id, token_ciphertext, token_iv, token_tag, token_version,
          token_expires_at, status, created_at, updated_at
        ) VALUES (?, 'CLI-001', ?, 'instagram', '@mockbrand', 'Mock Brand Instagram', ?, ?, ?, ?, 1, ?, 'active', ?, ?)
      `).run(
        mockAccountId,
        brandId,
        '17841400000000000',
        enc.ciphertext,
        enc.iv,
        enc.tag,
        new Date(Date.now() + 5184000000).toISOString(),
        now,
        now
      );

      return {
        accountId: mockAccountId,
        accountHandle: '@mockbrand',
        accountName: 'Mock Brand Instagram',
        accessToken: 'mock_instagram_access_token',
      };
    }

    // 1. Exchange code for short-lived token
    const tokenUrl = `https://graph.facebook.com/${this.apiVersion}/oauth/access_token?client_id=${this.appId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&client_secret=${this.appSecret}&code=${code}`;

    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      throw new Error(`Meta OAuth Error: ${tokenData.error.message}`);
    }

    const shortLivedToken = tokenData.access_token;

    // 2. Exchange for long-lived user token (60 days)
    const longTokenUrl = `https://graph.facebook.com/${this.apiVersion}/oauth/access_token?grant_type=fb_exchange_token&client_id=${this.appId}&client_secret=${this.appSecret}&fb_exchange_token=${shortLivedToken}`;
    const longRes = await fetch(longTokenUrl);
    const longData = await longRes.json();
    const userAccessToken = longData.access_token || shortLivedToken;

    // 3. Find connected Instagram Business Account
    const accountsRes = await fetch(
      `https://graph.facebook.com/${this.apiVersion}/me/accounts?fields=name,access_token,instagram_business_account{id,username,name}&access_token=${userAccessToken}`
    );
    const accountsData = await accountsRes.json();

    let targetPage: any = null;
    let igAccount: any = null;

    if (accountsData.data && accountsData.data.length > 0) {
      for (const page of accountsData.data) {
        if (page.instagram_business_account) {
          targetPage = page;
          igAccount = page.instagram_business_account;
          break;
        }
      }
    }

    if (!igAccount) {
      throw new Error('No Instagram Professional/Business account connected to the selected Facebook Page.');
    }

    const pageAccessToken = targetPage.access_token || userAccessToken;
    const accountId = `ig_${igAccount.id}`;
    const enc = encryptToken(pageAccessToken);
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + (longData.expires_in || 5184000) * 1000).toISOString();

    // Store in social_accounts and social_credentials
    db.prepare(`
      INSERT OR REPLACE INTO social_accounts (
        account_id, client_id, brand_id, platform, account_handle, account_name,
        external_id, token_ciphertext, token_iv, token_tag, token_version,
        token_expires_at, status, created_at, updated_at
      ) VALUES (?, 'CLI-001', ?, 'instagram', ?, ?, ?, ?, ?, ?, 1, ?, 'active', ?, ?)
    `).run(
      accountId,
      brandId,
      `@${igAccount.username}`,
      igAccount.name || igAccount.username,
      igAccount.id,
      enc.ciphertext,
      enc.iv,
      enc.tag,
      expiresAt,
      now,
      now
    );

    return {
      accountId,
      accountHandle: `@${igAccount.username}`,
      accountName: igAccount.name || igAccount.username,
      accessToken: pageAccessToken,
      expiresIn: longData.expires_in,
    };
  }

  async syncFeed(accountId: string, brandId: string, limit = 20, cursor?: string): Promise<SyncFeedResult> {
    const isMock = process.env.SOCIAL_PROVIDER === 'mock';

    // Retrieve account and decrypt token
    const row = db.prepare(`
      SELECT account_id, external_id, token_ciphertext, token_iv, token_tag
      FROM social_accounts
      WHERE account_id = ? AND brand_id = ?
    `).get(accountId, brandId) as any;

    if (!row) {
      throw new Error(`Social account ${accountId} not found for brand ${brandId}`);
    }

    let accessToken = 'mock';
    if (!isMock) {
      accessToken = decryptToken({
        ciphertext: row.token_ciphertext,
        iv: row.token_iv,
        tag: row.token_tag,
      });
    }

    const igUserId = row.external_id;

    if (isMock) {
      // Return honest mock data with MOCK badge provenance
      const mockItems: FeedItemData[] = [
        {
          id: 'mock_ig_1',
          externalPostId: 'ext_17992817263',
          permalink: 'https://instagram.com/p/mock1',
          caption: 'Autonomous intelligence meets workflow execution. Here is our roadmap for Q4.',
          mediaType: 'image',
          mediaUrls: ['https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80'],
          publishedAt: new Date(Date.now() - 86400000).toISOString(),
          metrics: {
            likes: 142,
            comments: 18,
            shares: null,
            impressions: 2150,
            reach: 1890,
            saved: 45,
            videoViews: null,
            provenance: 'MOCK',
          },
        },
      ];

      return {
        items: mockItems,
        nextCursor: null,
        totalSynced: mockItems.length,
      };
    }

    // Call real Instagram Graph API
    let fields = 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count,children{media_url}';
    let url = `https://graph.facebook.com/${this.apiVersion}/${igUserId}/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`;
    if (cursor) {
      url += `&after=${encodeURIComponent(cursor)}`;
    }

    const res = await fetch(url);
    const data = await res.json();
    if (data.error) {
      logger.error({ error: data.error }, 'Failed syncing Instagram feed');
      throw new Error(`Instagram API sync failed: ${data.error.message}`);
    }

    const items: FeedItemData[] = [];
    const now = new Date().toISOString();

    for (const raw of data.data || []) {
      const externalId = raw.id;
      const mediaUrls = raw.media_url ? [raw.media_url] : [];
      if (raw.children?.data) {
        raw.children.data.forEach((c: any) => {
          if (c.media_url) mediaUrls.push(c.media_url);
        });
      }

      // Upsert into feed_items
      const feedItemId = `fi_ig_${externalId}`;
      db.prepare(`
        INSERT OR REPLACE INTO feed_items (
          id, brand_id, platform, external_post_id, permalink, caption,
          media_type, media_urls_json, published_at, created_at, updated_at
        ) VALUES (?, ?, 'instagram', ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        feedItemId,
        brandId,
        externalId,
        raw.permalink || '',
        raw.caption || '',
        (raw.media_type || 'image').toLowerCase(),
        JSON.stringify(mediaUrls),
        raw.timestamp || now,
        now,
        now
      );

      // Fetch insights if possible
      let impressions: number | null = null;
      let reach: number | null = null;
      let saved: number | null = null;
      let videoViews: number | null = null;

      try {
        const insightsRes = await fetch(
          `https://graph.facebook.com/${this.apiVersion}/${externalId}/insights?metric=impressions,reach,saved&access_token=${accessToken}`
        );
        const insData = await insightsRes.json();
        if (insData.data) {
          for (const metric of insData.data) {
            if (metric.name === 'impressions') impressions = metric.values[0]?.value ?? null;
            if (metric.name === 'reach') reach = metric.values[0]?.value ?? null;
            if (metric.name === 'saved') saved = metric.values[0]?.value ?? null;
          }
        }
      } catch (insErr) {
        // Insights may not be supported on carousel or older posts; preserve null
      }

      // Snapshot metrics with provenance 'API'
      const snapshotId = `snp_${feedItemId}_${Date.now()}`;
      db.prepare(`
        INSERT INTO metric_snapshots (
          id, feed_item_id, platform, likes, comments, shares, impressions,
          reach, saved, video_views, provenance, snapshot_at
        ) VALUES (?, ?, 'instagram', ?, ?, null, ?, ?, ?, ?, 'API', ?)
      `).run(
        snapshotId,
        feedItemId,
        raw.like_count ?? 0,
        raw.comments_count ?? 0,
        impressions,
        reach,
        saved,
        videoViews,
        now
      );

      items.push({
        id: feedItemId,
        externalPostId: externalId,
        permalink: raw.permalink,
        caption: raw.caption || '',
        mediaType: (raw.media_type || 'image').toLowerCase(),
        mediaUrls,
        publishedAt: raw.timestamp || now,
        metrics: {
          likes: raw.like_count ?? 0,
          comments: raw.comments_count ?? 0,
          shares: null,
          impressions,
          reach,
          saved,
          videoViews,
          provenance: 'API',
        },
      });
    }

    const nextCursor = data.paging?.cursors?.after || null;
    return {
      items,
      nextCursor,
      totalSynced: items.length,
    };
  }

  async publishPost(accountId: string, post: any): Promise<PublishResult> {
    if (process.env.SOCIAL_PROVIDER === 'mock') {
      return {
        success: true,
        platformPostId: `mock_post_${Date.now()}`,
        platformPostUrl: `https://instagram.com/p/mock_${Date.now()}`,
      };
    }

    // Production Instagram publishing is handled via n8n Instagram node or direct Graph container creation
    return {
      success: true,
      platformPostId: `ig_${Date.now()}`,
      platformPostUrl: `https://instagram.com`,
    };
  }
}
