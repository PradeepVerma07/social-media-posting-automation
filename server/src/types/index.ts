export type RoleName =
  | 'Super Admin'
  | 'Admin'
  | 'Content Manager'
  | 'Approver'
  | 'Analyst'
  | 'Client';

export interface User {
  id: number;
  email: string;
  fullName: string;
  avatarUrl?: string;
  phone?: string;
  role: RoleName;
  tenantScope?: string;
  isActive: boolean;
  twoFactorEnabled?: boolean;
  password?: string;
  createdAt: string;
}

export interface BrandTokens {
  metaAccessToken?: string;
  facebookPageId?: string;
  facebookPageName?: string;
  facebookPageToken?: string;
  instagramBusinessId?: string;
  instagramHandle?: string;
  linkedinUrn?: string;
  linkedinAccessToken?: string;
  xApiKey?: string;
  xApiSecret?: string;
  xBearerToken?: string;
  youtubeChannelId?: string;
  youtubeAccessToken?: string;
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  timezone: string;
  country: string;
  defaultApproverId?: number;
  defaultHashtags?: string;
  defaultKeywords?: string;
  isActive: boolean;
  connectedAccountsCount?: number;
  tokens?: BrandTokens;
}

export type SocialPlatform = 'linkedin' | 'facebook' | 'instagram' | 'x' | 'youtube' | 'whatsapp';

export type ContentPlacement = 'feed' | 'story' | 'reels_shorts';

export interface SocialAccount {
  id: number;
  brandId: number;
  platform: SocialPlatform;
  accountName: string;
  accountHandle?: string;
  profileImageUrl?: string;
  connectionStatus: 'connected' | 'expired' | 'disconnected' | 'error';
  tokenExpiresAt?: string;
  lastSuccessfulPublishAt?: string;
  lastErrorMessage?: string;
  accessToken?: string;
  socialMediaId?: string;
}

export type ApprovalStatus =
  | 'draft'
  | 'in_review'
  | 'revision_requested'
  | 'approved'
  | 'rejected'
  | 'overdue';

export type PublishingStatus =
  | 'idle'
  | 'scheduled'
  | 'processing'
  | 'published'
  | 'partially_published'
  | 'failed'
  | 'cancelled';

export interface PostPlatformConfig {
  platform: SocialPlatform;
  captionOverride?: string;
  publishingStatus: 'pending' | 'publishing' | 'success' | 'failed';
  platformPostId?: string;
  platformPostUrl?: string;
  errorMessage?: string;
  publishedAt?: string;
}

export interface PostMediaItem {
  id: number;
  postId: number;
  mediaType: 'image' | 'video' | 'document';
  fileUrl: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  altText?: string;
}

export interface PostComment {
  id: number;
  postId: number;
  userId: number;
  userFullName: string;
  userAvatarUrl?: string;
  userRole: RoleName;
  commentText: string;
  isSystemMessage: boolean;
  attachmentUrl?: string;
  replyToCommentId?: number;
  isEdited: boolean;
  createdAt: string;
}

export interface PostVersion {
  id: number;
  postId: number;
  versionNumber: number;
  changedByUserId: number;
  changedByName: string;
  masterCaption: string;
  scheduledAt?: string;
  changeSummary?: string;
  createdAt: string;
}

export interface Post {
  id: number;
  brandId: number;
  brandName: string;
  campaignId?: number;
  campaignName?: string;
  createdByUserId: number;
  createdByName: string;
  assignedApproverId?: number;
  assignedApproverName?: string;
  title: string;
  masterCaption: string;
  firstComment?: string;
  hashtags?: string;
  keywords?: string;
  targetUrl?: string;
  internalTags?: string;
  country: string;
  timezone: string;
  scheduledAt?: string;
  publishedAt?: string;
  approvalStatus: ApprovalStatus;
  publishingStatus: PublishingStatus;
  rejectionReason?: string;
  versionNumber: number;
  isLocked: boolean;
  externalSheetId?: string;
  placement?: ContentPlacement | ContentPlacement[];
  placements?: ContentPlacement[];
  platforms: PostPlatformConfig[];
  media: PostMediaItem[];
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowMapping {
  id: number;
  workflowName: string;
  n8nWorkflowId: string;
  webhookPath: string;
  description?: string;
  isActive: boolean;
  averageDurationMs: number;
  successCount: number;
  failureCount: number;
  lastExecutedAt?: string;
  lastResultStatus?: string;
}

export interface WorkflowExecution {
  id: number;
  executionId: string;
  n8nWorkflowId: string;
  workflowName: string;
  postId?: number;
  postTitle?: string;
  brandId?: number;
  brandName?: string;
  initiatedByUserId: number;
  initiatedByName: string;
  triggerType: 'manual' | 'schedule' | 'webhook_callback' | 'retry';
  status: 'queued' | 'running' | 'success' | 'partial_success' | 'failed' | 'cancelled';
  durationMs?: number;
  startedAt: string;
  finishedAt?: string;
  startedAtIst?: string;
  startedAtIstTime?: string;
  finishedAtIst?: string;
  sanitizedInput?: Record<string, any>;
  perPlatformResults?: Record<string, { status: string; url?: string; error?: string }>;
  errorSummary?: string;
}

export interface AnalyticsOverview {
  totalScheduledPosts: number;
  totalPublishedPosts: number;
  pendingApprovals: number;
  rejectedPosts: number;
  failedAutomations: number;
  activeWorkflows: number;
  connectedPlatforms: number;
  totalEngagement: number;
  totalImpressions: number;
  totalReach: number;
  engagementRate: number;
  publishedByPlatform: Record<SocialPlatform, number>;
  scheduledByPlatform?: Record<string, number>;
  approvalBreakdown: Record<ApprovalStatus, number>;
  nextScheduledDisplay?: string | null;
  brandBreakdown?: Array<{
    brandId: number;
    brandName: string;
    brandSlug: string;
    publishedCount: number;
    engagement: number;
    impressions: number;
    reach: number;
  }>;
}

export interface MultiBrandPublishRequest {
  brandIds: number[];
  platforms: SocialPlatform[];
  placement?: ContentPlacement | ContentPlacement[];
  placements?: ContentPlacement[];
  title?: string;
  masterCaption: string;
  firstComment?: string;
  hashtags?: string;
  keywords?: string;
  targetUrl?: string;
  mediaUrls?: string[];
  platformOverrides?: Record<string, string>;
  campaignName?: string;
}

export interface BrandPublishResult {
  brandId: number;
  brandName: string;
  brandSlug: string;
  postId: number;
  postTitle: string;
  executionId: string;
  status: 'success' | 'partial_success' | 'failed';
  platformResults: Record<string, { status: string; url?: string; error?: string }>;
}

export interface MultiBrandPublishResponse {
  success: boolean;
  summary: {
    totalBrands: number;
    totalPlatforms: number;
    totalDispatchedPosts: number;
    publishedAt: string;
    latencyMs: number;
  };
  brandReports: BrandPublishResult[];
}

export interface InAppNotification {
  id: number;
  userId: number;
  eventType: string;
  title: string;
  message: string;
  linkUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: number;
  userId?: number;
  userEmail?: string;
  action: string;
  entityType: string;
  entityId?: number;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}
