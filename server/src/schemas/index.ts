import { z } from 'zod';

export const PlatformSchema = z.enum(['facebook', 'instagram', 'linkedin', 'x', 'youtube', 'whatsapp']);
export type Platform = z.infer<typeof PlatformSchema>;

export const ContentPlacementItemSchema = z.enum(['feed', 'story', 'reels_shorts']);
export const PlacementSchema = z.union([
  ContentPlacementItemSchema,
  z.array(ContentPlacementItemSchema)
]).default('feed');
export type Placement = z.infer<typeof PlacementSchema>;

export const MediaTypeSchema = z.enum(['image', 'video', 'carousel']);
export type MediaType = z.infer<typeof MediaTypeSchema>;

export const ApprovalStatusSchema = z.enum([
  'Draft',
  'PendingApproval',
  'Approved',
  'ChangesRequested',
  'Rejected',
]);
export type ApprovalStatus = z.infer<typeof ApprovalStatusSchema>;

export const TargetStatusSchema = z.enum([
  'Draft',
  'Scheduled',
  'Processing',
  'Posted',
  'Retrying',
  'Failed',
  'NeedsVerification',
  'Cancelled',
  'Missed',
]);
export type TargetStatus = z.infer<typeof TargetStatusSchema>;

export const ErrorCategorySchema = z.enum([
  'retryable',
  'auth',
  'validation',
  'policy',
  'unknown',
]);
export type ErrorCategory = z.infer<typeof ErrorCategorySchema>;

export const PostCreateSchema = z.object({
  brandId: z.string().min(1),
  title: z.string().min(1).max(255),
  caption: z.string().min(1).max(5000),
  placement: PlacementSchema.default('feed'),
  placements: z.array(ContentPlacementItemSchema).optional(),
  hashtags: z.string().optional().default(''),
  mediaType: MediaTypeSchema.default('image'),
  mediaUrls: z.array(z.string().min(1)).min(1),
  linkUrl: z.string().url().or(z.literal('')).optional().default(''),
  scheduleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  scheduleTime: z.string().regex(/^\d{1,2}:\d{2}(:\d{2})?$/, 'Time must be HH:mm or HH:mm:ss'),
  timezone: z.string().optional().default('Asia/Kolkata'),
  accountIds: z.array(z.string()).min(1),
  approvalStatus: ApprovalStatusSchema.default('Draft'),
  source: z.string().optional().default('dashboard'),
});
export type PostCreateInput = z.infer<typeof PostCreateSchema>;

export const PostUpdateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  caption: z.string().min(1).max(5000).optional(),
  placement: PlacementSchema.optional(),
  placements: z.array(ContentPlacementItemSchema).optional(),
  hashtags: z.string().optional(),
  mediaType: MediaTypeSchema.optional(),
  mediaUrls: z.array(z.string().min(1)).optional(),
  linkUrl: z.string().url().or(z.literal('')).optional(),
  scheduleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  scheduleTime: z.string().regex(/^\d{1,2}:\d{2}(:\d{2})?$/).optional(),
  timezone: z.string().optional(),
});
export type PostUpdateInput = z.infer<typeof PostUpdateSchema>;

export const N8nClaimRequestSchema = z.object({
  execution_id: z.string().min(1),
  limit: z.number().int().min(1).max(50).default(10),
  target_ids: z.array(z.string()).optional(),
});
export type N8nClaimRequest = z.infer<typeof N8nClaimRequestSchema>;

export const N8nCallbackSchema = z.object({
  target_id: z.string().min(1),
  execution_id: z.string().min(1),
  stage: z.enum(['claimed', 'publishing', 'succeeded', 'failed', 'execution_crashed']),
  platform_post_id: z.string().optional(),
  post_url: z.string().optional(),
  error_code: z.string().or(z.number()).optional(),
  error_subcode: z.string().or(z.number()).optional(),
  http_status: z.number().optional(),
  error_message: z.string().optional(),
  meta_trace_id: z.string().optional(),
});
export type N8nCallbackInput = z.infer<typeof N8nCallbackSchema>;

export const SheetRowSchema = z.object({
  post_id: z.string().optional(),
  target_id: z.string().optional(),
  client_id: z.string().optional(),
  brand_id: z.string().optional(),
  brand_name: z.string().optional(),
  platform: PlatformSchema.optional().default('facebook'),
  social_media_id: z.string().optional(),
  post_title: z.string().min(1),
  caption: z.string().min(1),
  hashtags: z.string().optional().default(''),
  media_type: MediaTypeSchema.optional().default('image'),
  media_urls: z.string().optional().default(''),
  link_url: z.string().optional().default(''),
  schedule_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  schedule_time: z.string().regex(/^\d{1,2}:\d{2}(:\d{2})?$/),
  timezone: z.string().optional().default('Asia/Kolkata'),
  scheduled_utc: z.string().optional(),
  approval_status: ApprovalStatusSchema.optional().default('Draft'),
  status: TargetStatusSchema.optional().default('Draft'),
  attempt_count: z.string().optional(),
  last_attempt_at: z.string().optional(),
  next_retry_at: z.string().optional(),
  posted_at: z.string().optional(),
  platform_post_id: z.string().optional(),
  post_url: z.string().optional(),
  error_code: z.string().optional(),
  error_message: z.string().optional(),
  locked_by_execution: z.string().optional(),
  row_version: z.string().optional(),
  updated_at: z.string().optional(),
  sync_note: z.string().optional(),
});
export type SheetRow = z.infer<typeof SheetRowSchema>;
