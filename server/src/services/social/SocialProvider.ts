/**
 * SocialProvider.ts
 * Interface for all social media API adapters.
 */

export interface FeedItemData {
  id: string;
  externalPostId: string;
  permalink: string;
  caption: string;
  mediaType: 'image' | 'video' | 'carousel' | 'text';
  mediaUrls: string[];
  publishedAt: string;
  metrics: {
    likes: number | null;
    comments: number | null;
    shares: number | null;
    impressions: number | null;
    reach: number | null;
    saved: number | null;
    videoViews: number | null;
    provenance: 'API' | 'AI-INFERRED' | 'ESTIMATED' | 'MOCK';
  };
}

export interface SyncFeedResult {
  items: FeedItemData[];
  nextCursor?: string | null;
  totalSynced: number;
}

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  platformPostUrl?: string;
  error?: string;
}

export interface SocialProvider {
  platform: string;
  getAuthUrl(brandId: string, redirectUri: string, state: string): Promise<string>;
  handleCallback(code: string, redirectUri: string, brandId: string): Promise<{
    accountId: string;
    accountHandle: string;
    accountName: string;
    accessToken: string;
    expiresIn?: number;
  }>;
  syncFeed(accountId: string, brandId: string, limit?: number, cursor?: string): Promise<SyncFeedResult>;
  publishPost(accountId: string, post: {
    caption: string;
    mediaUrls?: string[];
    mediaType?: string;
    scheduledAt?: string;
  }): Promise<PublishResult>;
}
