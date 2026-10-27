/**
 * platform_metrics.config.ts
 * Strict mapping of social platform API capabilities and available metrics.
 * Rule: If a platform API does not return a metric, it is marked supported: false
 * and must be stored as null. Never fabricate metrics.
 */

export interface MetricDefinition {
  apiField: string;
  label: string;
  supported: boolean;
  notes?: string;
}

export interface PlatformMetricConfig {
  platform: 'instagram' | 'facebook' | 'linkedin' | 'x' | 'youtube' | 'whatsapp';
  apiName: string;
  authType: 'oauth2';
  requiredScopes: string[];
  metrics: {
    likes: MetricDefinition;
    comments: MetricDefinition;
    shares: MetricDefinition;
    impressions: MetricDefinition;
    reach: MetricDefinition;
    saved: MetricDefinition;
    videoViews: MetricDefinition;
    clicks: MetricDefinition;
  };
}

export const PLATFORM_METRICS_CONFIG: Record<string, PlatformMetricConfig> = {
  instagram: {
    platform: 'instagram',
    apiName: 'Instagram Graph API v21.0',
    authType: 'oauth2',
    requiredScopes: [
      'instagram_basic',
      'instagram_manage_insights',
      'pages_show_list',
      'pages_read_engagement',
    ],
    metrics: {
      likes: { apiField: 'like_count', label: 'Likes', supported: true },
      comments: { apiField: 'comments_count', label: 'Comments', supported: true },
      shares: { apiField: 'shares.count', label: 'Shares', supported: false, notes: 'Not directly returned on all media types by Graph API' },
      impressions: { apiField: 'insights.impressions', label: 'Impressions', supported: true },
      reach: { apiField: 'insights.reach', label: 'Reach', supported: true },
      saved: { apiField: 'insights.saved', label: 'Saves', supported: true },
      videoViews: { apiField: 'insights.video_views', label: 'Video Views', supported: true, notes: 'Available only for video/reels media types' },
      clicks: { apiField: 'insights.clicks', label: 'Link Clicks', supported: false, notes: 'Only available for ads or bio links' },
    },
  },
  facebook: {
    platform: 'facebook',
    apiName: 'Facebook Graph API v21.0',
    authType: 'oauth2',
    requiredScopes: [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'read_insights',
    ],
    metrics: {
      likes: { apiField: 'reactions.summary(total_count)', label: 'Reactions', supported: true },
      comments: { apiField: 'comments.summary(total_count)', label: 'Comments', supported: true },
      shares: { apiField: 'shares.count', label: 'Shares', supported: true },
      impressions: { apiField: 'post_impressions', label: 'Impressions', supported: true },
      reach: { apiField: 'post_impressions_unique', label: 'Reach', supported: true },
      saved: { apiField: 'post_saves', label: 'Saves', supported: false, notes: 'Not exposed in standard page post insights' },
      videoViews: { apiField: 'post_video_views', label: 'Video Views', supported: true },
      clicks: { apiField: 'post_clicks', label: 'Post Clicks', supported: true },
    },
  },
  linkedin: {
    platform: 'linkedin',
    apiName: 'LinkedIn Community Management API v2',
    authType: 'oauth2',
    requiredScopes: [
      'r_organization_social',
      'w_organization_social',
      'rw_organization_admin',
    ],
    metrics: {
      likes: { apiField: 'likeCount', label: 'Reactions', supported: true },
      comments: { apiField: 'commentCount', label: 'Comments', supported: true },
      shares: { apiField: 'shareCount', label: 'Reposts', supported: true },
      impressions: { apiField: 'impressionCount', label: 'Impressions', supported: true },
      reach: { apiField: 'uniqueImpressionsCount', label: 'Unique Reach', supported: true },
      saved: { apiField: 'savedCount', label: 'Saves', supported: false, notes: 'Not available in LinkedIn Organization API' },
      videoViews: { apiField: 'videoViews', label: 'Video Views', supported: true },
      clicks: { apiField: 'clickCount', label: 'Clicks', supported: true },
    },
  },
};
