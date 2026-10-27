import {
  User,
  Post,
  Brand,
  SocialAccount,
  WorkflowMapping,
  WorkflowExecution,
  AnalyticsOverview,
  InAppNotification,
  AuditLogEntry,
  PostComment,
  ApprovalStatus,
  PublishingStatus,
  MultiBrandPublishRequest,
  MultiBrandPublishResponse
} from '../../server/src/types';

const BASE_URL = '/api/v1';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
      ...options,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(errorData.error || (errorData as any).message || `HTTP ${res.status}`);
    }

    return res.json();
  } catch (err: any) {
    if (err.name === 'TypeError' && err.message?.includes('fetch')) {
      throw new Error('Connection error: server is restarting or unreachable. Please retry in a moment.');
    }
    throw err;
  }
}

export const api = {
  // Posts
  async getPosts(filters?: {
    brandId?: number;
    approvalStatus?: ApprovalStatus;
    publishingStatus?: PublishingStatus;
    search?: string;
  }): Promise<Post[]> {
    const params = new URLSearchParams();
    if (filters?.brandId) params.append('brandId', String(filters.brandId));
    if (filters?.approvalStatus) params.append('approvalStatus', filters.approvalStatus);
    if (filters?.publishingStatus) params.append('publishingStatus', filters.publishingStatus);
    if (filters?.search) params.append('search', filters.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await request<{ data: Post[] }>(`/posts${query}`);
    return res.data;
  },

  async getPostById(id: number): Promise<Post> {
    return request<Post>(`/posts/${id}`);
  },

  async createPost(postData: any): Promise<Post> {
    const res = await request<any>('/posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
    return (res && res.data) ? res.data : res;
  },

  async updatePost(id: number, updates: Partial<Post>): Promise<Post> {
    return request<Post>(`/posts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async deletePost(id: number): Promise<{ message: string }> {
    return request<{ message: string }>(`/posts/${id}`, {
      method: 'DELETE',
    });
  },

  async submitPost(id: number): Promise<Post> {
    return request<Post>(`/posts/${id}/submit`, { method: 'POST' });
  },

  async approvePost(id: number): Promise<Post> {
    return request<Post>(`/posts/${id}/approve`, { method: 'POST' });
  },

  async rejectPost(id: number, reason: string): Promise<Post> {
    return request<Post>(`/posts/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async requestRevision(id: number, comments: string): Promise<Post> {
    return request<Post>(`/posts/${id}/request-revision`, {
      method: 'POST',
      body: JSON.stringify({ comments }),
    });
  },

  async publishNow(id: number): Promise<{ message: string; post: Post; executionId: string }> {
    return request<{ message: string; post: Post; executionId: string }>(`/posts/${id}/publish`, {
      method: 'POST',
    });
  },

  async multiBrandPublish(data: MultiBrandPublishRequest): Promise<MultiBrandPublishResponse> {
    return request<MultiBrandPublishResponse>('/posts/multi-brand-publish', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Comments
  async getPostComments(postId: number): Promise<PostComment[]> {
    const res = await request<{ data: PostComment[] }>(`/posts/${postId}/comments`);
    return res.data;
  },

  async addPostComment(postId: number, commentText: string, userId = 1): Promise<PostComment> {
    return request<PostComment>(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ commentText, userId }),
    });
  },

  // Brands
  async getBrands(): Promise<Brand[]> {
    const res = await request<{ data: Brand[] }>('/brands');
    return res.data;
  },

  async createBrand(brand: Partial<Brand>): Promise<Brand> {
    return request<Brand>('/brands', {
      method: 'POST',
      body: JSON.stringify(brand),
    });
  },

  async updateBrand(id: number, updates: Partial<Brand>): Promise<Brand> {
    return request<Brand>(`/brands/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  async deleteBrand(id: number): Promise<{ success: boolean; message?: string }> {
    return request<{ success: boolean; message?: string }>(`/brands/${id}`, {
      method: 'DELETE',
    });
  },

  async verifyBrandToken(platform: string, token: string): Promise<any> {
    return request<any>('/brands/verify-token', {
      method: 'POST',
      body: JSON.stringify({ platform, token }),
    });
  },

  // Social Accounts
  async getSocialAccounts(brandId?: number): Promise<SocialAccount[]> {
    const query = brandId ? `?brandId=${brandId}` : '';
    const res = await request<{ data: SocialAccount[] }>(`/social-accounts${query}`);
    return res.data;
  },

  async connectSocialAccountToken(payload: string | { platform?: string; token?: string; [key: string]: any }, brandId?: string): Promise<any> {
    const body = typeof payload === 'string' ? { token: payload, brandId } : { ...payload, brandId: brandId || payload.brandId };
    return request<any>('/social-accounts/connect', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  // Workflows & Executions
  async getWorkflows(): Promise<WorkflowMapping[]> {
    const res = await request<{ data: WorkflowMapping[] }>('/workflows');
    return res.data;
  },

  async getExecutions(): Promise<WorkflowExecution[]> {
    const res = await request<{ data: WorkflowExecution[] }>('/executions');
    return res.data;
  },

  async retryExecution(id: number): Promise<any> {
    return request<any>(`/executions/${id}/retry`, { method: 'POST' });
  },

  // Analytics
  async getAnalyticsOverview(): Promise<AnalyticsOverview> {
    return request<AnalyticsOverview>('/analytics/overview');
  },

  // Notifications
  async getNotifications(): Promise<InAppNotification[]> {
    const res = await request<{ data: InAppNotification[] }>('/notifications');
    return res.data;
  },

  async markNotificationRead(id: number): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'POST' });
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLogEntry[]> {
    const res = await request<{ data: AuditLogEntry[] }>('/audit-logs');
    return res.data;
  },

  // Integrations
  async testN8nConnection(): Promise<{ reachable: boolean; latencyMs: number; version?: string }> {
    return request<{ reachable: boolean; latencyMs: number; version?: string }>('/integrations/n8n/test', {
      method: 'POST',
    });
  },

  async syncGoogleSheets(): Promise<{ message: string; syncedRows: number; lastSync: string }> {
    return request<{ message: string; syncedRows: number; lastSync: string }>('/integrations/google-sheets/sync', {
      method: 'POST',
    });
  },

  // Auth & Session
  async login(credentials: { email?: string; identifier?: string; password: string }): Promise<{ user: User; accessToken: string; expiresIn: string; clientIp?: string }> {
    return request<{ user: User; accessToken: string; expiresIn: string; clientIp?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  async getMe(): Promise<{ user: User }> {
    return request<{ user: User }>('/auth/me');
  },

  // Team & RBAC
  async getUsers(): Promise<User[]> {
    const res = await request<{ data: User[] }>('/users');
    return res.data;
  },

  async createUser(userData: {
    fullName: string;
    email: string;
    role: string;
    tenantScope?: string;
    isActive?: boolean;
    avatarUrl?: string;
    password?: string;
  }): Promise<User> {
    return request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    return request<User>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async deleteUser(id: number): Promise<{ message: string }> {
    return request<{ message: string }>(`/users/${id}`, {
      method: 'DELETE',
    });
  },

  // n8n Direct Session & Auth
  async getN8nHealth(): Promise<{
    reachable: boolean;
    status?: string;
    latencyMs?: number;
    error?: string;
    url?: string;
    version?: string;
  }> {
    return request('/n8n/health');
  },

  async executeWorkflow(
    id: string | number,
    data?: any
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    executionId?: string;
  }> {
    return request(`/workflows/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  },

  async getN8nSession(): Promise<{
    connected: boolean;
    instanceUrl: string;
    email?: string;
    version?: string;
    latencyMs?: number;
    authType?: string;
    token?: string;
    environment?: string;
    lastConnected?: string;
  }> {
    return request('/n8n/session');
  },

  async loginN8n(payload: {
    instanceUrl: string;
    email?: string;
    password?: string;
    apiKey?: string;
    authType: 'credentials' | 'apikey';
  }): Promise<{ success: boolean; message: string; session: any }> {
    return request('/n8n/auth', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async logoutN8n(): Promise<{ success: boolean; message: string }> {
    return request('/n8n/logout', { method: 'POST' });
  },

  async getInstalledN8nWorkflows(): Promise<{ workflows: Array<{ id: string; name: string }> }> {
    return request('/n8n/installed-workflows');
  },

  async autoImportWorkflows(): Promise<{ success: boolean; message: string; imported: string[] }> {
    return request('/n8n/auto-import', { method: 'POST' });
  },

  async resetN8nOwner(): Promise<{ success: boolean; message: string }> {
    return request('/n8n/reset-owner', { method: 'POST' });
  },

  // Media Upload (Images & Videos)
  async uploadMedia(payload: {
    filename: string;
    fileData: string;
    mimeType?: string;
  }): Promise<{
    success: boolean;
    url: string;
    relativeUrl: string;
    filename: string;
    mimeType: string;
    mediaType: 'image' | 'video';
    fileSizeBytes: number;
  }> {
    return request('/upload', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Brand Self-Registration Portal
  async registerBrand(payload: {
    brandName: string;
    companyName?: string;
    websiteUrl?: string;
    industry?: string;
    description?: string;
    country?: string;
    timezone?: string;
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
    platforms?: string[];
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    role?: 'Client' | 'Admin';
  }): Promise<{
    success: boolean;
    message: string;
    user: User;
    brand: Brand & { clientId?: string; brandId?: string };
    accessToken: string;
  }> {
    return request('/auth/register-brand', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Direct User Signup
  async signUp(payload: {
    fullName: string;
    email: string;
    password: string;
    brandName?: string;
    companyName?: string;
    role?: 'Client' | 'Admin';
    platforms?: string[];
  }): Promise<{
    success: boolean;
    message: string;
    user: User;
    brand: Brand & { clientId?: string; brandId?: string };
    accessToken: string;
  }> {
    return request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // =========================================================================
  // CI360 AI Neural Studio & Predictive Feed Intelligence APIs
  // =========================================================================

  async getAIOverview(): Promise<AIStudioOverview> {
    return request('/ai/overview');
  },

  async getFeedAudits(platform?: string, limit: number = 50): Promise<{ items: FeedAuditItem[] }> {
    const params = new URLSearchParams();
    if (platform && platform !== 'all') params.append('platform', platform);
    if (limit) params.append('limit', String(limit));
    const query = params.toString() ? `?${params.toString()}` : '';
    return request(`/ai/feed-audits${query}`);
  },

  async analyzeFeed(payload: {
    platform: string;
    caption: string;
    mediaUrl?: string;
    hashtags?: string;
    title?: string;
  }): Promise<FeedAuditItem> {
    return request('/ai/analyze-feed', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getInterceptQueue(status?: string): Promise<{ items: InterceptedPostItem[] }> {
    const query = status && status !== 'all' ? `?status=${status}` : '';
    return request(`/ai/intercept-queue${query}`);
  },

  async interceptPost(payload: {
    postId?: string;
    brandId?: string;
    caption: string;
    hashtags?: string;
    mediaUrl?: string;
    scheduledAt?: string;
    platform?: string;
    mode?: 'copilot' | 'auto';
  }): Promise<InterceptedPostItem> {
    return request('/ai/intercept-post', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async applyRecommendation(payload: {
    interceptId: string;
    appliedCaption?: string;
    appliedHashtags?: string;
    appliedTiming?: string;
    status?: string;
  }): Promise<{
    success: boolean;
    interceptId: string;
    status: string;
    appliedCaption: string;
    appliedHashtags: string;
    appliedTiming: string;
  }> {
    return request('/ai/apply-recommendation', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async transformCreative(payload: {
    mediaUrl: string;
    transformType: string;
    prompt?: string;
    aspectRatio?: string;
    postId?: string;
  }): Promise<CreativeVariantItem> {
    return request('/ai/gemini-transform', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getCopyVariants(payload: {
    baseCaption: string;
    platform?: string;
    audienceGoal?: string;
  }): Promise<{ variants: CopyVariantItem[] }> {
    return request('/ai/copy-variants', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Enterprise Brand Brain APIs
  async listBrandBrains(): Promise<{ brands: BrandBrainProfile[] }> {
    return request('/ai/brands');
  },

  async getBrandBrain(brandId: string): Promise<BrandBrainProfile> {
    return request(`/ai/brand-brain/${brandId}`);
  },

  async saveBrandBrain(payload: Partial<BrandBrainProfile> & { brandId: string }): Promise<{ success: boolean; brain: BrandBrainProfile }> {
    return request('/ai/brand-brain', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getLearnedPreferences(brandId: string): Promise<{ preferences: BrandLearnedPreference[] }> {
    return request(`/ai/learned-preferences/${brandId}`);
  },

  // Mode A Public Brand Analysis & Competitors
  async analyzePublicBrand(payload: {
    platform: string;
    identifier: string;
    brandId?: string;
  }): Promise<PublicBrandAnalysisResult> {
    return request('/ai/public-brand-analysis', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getPublicProfiles(brandId: string): Promise<{ items: any[] }> {
    return request(`/ai/public-profiles/${brandId}`);
  },

  async getCompetitors(brandId: string): Promise<{ competitors: any[] }> {
    return request(`/ai/competitors/${brandId}`);
  },

  // Post Diagnostics & Non-Destructive Revisions
  async analyzePostDiagnostic(payload: {
    brandId: string;
    platform: string;
    caption: string;
    hashtags?: string;
    mediaUrl?: string;
    postId?: string;
    mode?: 'advisory' | 'copilot' | 'autonomous';
  }): Promise<PostDiagnosticResult> {
    return request('/ai/analyze-post', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async applyRecommendationRevision(id: string, payload: {
    postId?: string;
    appliedValue: string;
    field?: string;
  }): Promise<{ success: boolean; revisionNumber: number; revisionId: string }> {
    return request(`/ai/recommendations/${id}/apply`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async rejectRecommendation(id: string, payload?: {
    brandId?: string;
    postId?: string;
    reason?: string;
  }): Promise<{ success: boolean; recommendationId: string; status: string }> {
    return request(`/ai/recommendations/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    });
  },

  // Predictive ML & Timing
  async predictPerformance(payload: {
    brandId: string;
    platform: string;
    caption: string;
    hashtags?: string;
    mediaType?: string;
    scheduledAt?: string;
    visualScore?: number;
  }): Promise<PostPredictionResult> {
    return request('/ai/predict-performance', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Topic Intelligence & Hashtags
  async getTopicsAndGaps(brandId: string): Promise<{
    opportunityTopics: NextBestTopic[];
    overusedTopics: NextBestTopic[];
    missingTopics: NextBestTopic[];
    contentOpportunityMatrix: Record<string, any>;
  }> {
    return request(`/ai/topics-and-gaps/${brandId}`);
  },

  async optimizeHashtags(hashtags: string, brandId: string): Promise<HashtagOptimizationResult> {
    return request('/ai/optimize-hashtags', {
      method: 'POST',
      body: JSON.stringify({ hashtags, brandId }),
    });
  },

  // Live Comment Intelligence & Leads
  async getDetectedLeads(brandId: string): Promise<{ leads: CommentAnalysisItem[] }> {
    return request(`/ai/detected-leads/${brandId}`);
  },

  async updateLeadStatus(id: string, status: string): Promise<{ success: boolean }> {
    return request(`/ai/leads/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },

  // Advanced AI Copy Studio (12 modes)
  async rewriteCopyMultiMode(payload: {
    baseCaption: string;
    platform?: string;
    mode?: string;
    brandId?: string;
  }): Promise<{ variants: CopyVariantItem[] }> {
    return request('/ai/rewrite-copy', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // AI Usage & Cost Telemetry
  async getAIUsage(brandId?: string): Promise<AIUsageSummary> {
    const query = brandId && brandId !== 'all' ? `?brandId=${brandId}` : '';
    return request(`/ai/usage${query}`);
  },

  // Module 1: Social Connect & Feed Sync
  async connectSocial(platform: string, brandId?: string): Promise<{ authUrl: string; state: string }> {
    const query = brandId ? `?brandId=${brandId}` : '';
    return request(`/social/${platform}/connect${query}`);
  },

  async syncSocialFeed(platform: string, brandId?: string): Promise<any> {
    return request(`/social/${platform}/sync`, {
      method: 'POST',
      body: JSON.stringify({ brandId, platform }),
    });
  },

  async fetchFeed(brandId = 'BR-001', platform?: string): Promise<{ connected: boolean; total: number; items: any[] }> {
    const query = `?brandId=${brandId}${platform && platform !== 'all' ? `&platform=${platform}` : ''}`;
    return request(`/feed${query}`);
  },

  // Module 2: Pre-Flight AI Review Submission
  async submitPostForReview(postId: string): Promise<{ success: boolean; jobId: string; status: string }> {
    return request(`/posts/${postId}/submit-for-review`, {
      method: 'POST',
    });
  },

  async approveReviewedPost(postId: string): Promise<{ success: boolean; postId: string; status: string }> {
    return request(`/posts/${postId}/approve-reviewed`, {
      method: 'POST',
    });
  },

  // Module 4: Gemini Creative Studio
  async generateCreativeVariants(payload: { imageUrl: string; prompt?: string; count?: number; stylePreset?: string }): Promise<{ variants: any[] }> {
    return request('/ai/creative/generate-variants', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async reframeCreativeAsset(payload: { imageUrl: string; targetRatio: '1:1' | '4:5' | '9:16' }): Promise<any> {
    return request('/ai/creative/reframe', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

export interface FeedAuditItem {
  auditId: string;
  brandId: string;
  platform: 'instagram' | 'linkedin' | 'facebook' | 'whatsapp' | string;
  externalPostId?: string;
  title: string;
  caption: string;
  mediaUrl: string;
  mediaType?: string;
  hookScore: number;
  visualScore: number;
  engagementVelocity: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  viralityGrade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F';
  metrics: {
    impressions?: number;
    estimatedImpressions?: number;
    likes?: number;
    comments?: number;
    saves?: number;
    shares?: number;
    reachRate?: string;
    engagementRate?: number;
  };
  recommendations: string[];
  publishedAt?: string;
  createdAt: string;
}

export interface AIStudioOverview {
  healthScore: number;
  avgHookScore: number;
  avgVisualScore: number;
  avgEngagementVelocity: number;
  totalAudits: number;
  interceptQueue: {
    pendingCount: number;
    approvedCount: number;
    total: number;
    avgViralityScore: number;
  };
  platformBreakdown: Array<{
    platform: string;
    count: number;
    avgHook: number;
    avgVisual: number;
    avgVelocity: number;
  }>;
  recentAudits: FeedAuditItem[];
  timestamp: string;
}

export interface InterceptedPostItem {
  interceptId: string;
  postId: string;
  brandId: string;
  originalCaption: string;
  originalHashtags: string;
  originalMediaUrl?: string;
  originalScheduledAt: string;
  suggestedCaption: string;
  suggestedHashtags: string;
  suggestedTiming: string;
  viralityScore: number;
  algorithmIndex: number;
  hookAnalysis: string;
  ctaQuality: string;
  improvementReasons: Array<{
    type: 'hook' | 'hashtags' | 'timing' | 'visual' | 'cta';
    title: string;
    description: string;
    impact: string;
    suggestedChange: string;
  }>;
  status: 'pending' | 'approved' | 'published' | 'rejected';
  mode: 'copilot' | 'auto';
  createdAt: string;
  updatedAt: string;
}

export interface CreativeVariantItem {
  variantId: string;
  transformedUrl: string;
  aspectRatio: string;
  transformType: string;
  styleApplied: string;
  confidenceScore: number;
  tagsAdded: string[];
}

export interface CopyVariantItem {
  style: string;
  caption: string;
  viralityScore: number;
  bestFor: string;
}

export interface BrandBrainProfile {
  id: string;
  organizationId: string;
  brandId: string;
  brandName: string;
  industry: string;
  subIndustry: string;
  primaryMarket: string;
  targetAudience: string;
  brandVoice: string;
  brandPersonality: string;
  preferredWords: string[];
  forbiddenWords: string[];
  approvedCtas: string[];
  brandColors: string[];
  fonts: string[];
  visualStyle: string;
  competitors: string[];
  businessObjectives: string;
  primaryProducts: string[];
  services: string[];
  website: string;
  instagramHandle: string;
  facebookPage: string;
  linkedinPage: string;
  youtubeChannel: string;
  contentPillars: string[];
  regulatoryConstraints: string[];
  defaultLanguage: string;
  secondaryLanguages: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BrandLearnedPreference {
  id: string;
  brandId: string;
  category: 'tone' | 'hook' | 'cta' | 'hashtags' | 'vocabulary' | 'visual';
  keyName: string;
  learnedValue: string;
  confidence: number;
  sourceSampleCount: number;
  lastInferredAt: string;
  isReviewedByAdmin: boolean;
  adminOverrideValue?: string;
}

export interface PublicBrandAnalysisResult {
  identity: {
    platform: string;
    identifier: string;
    displayName: string;
    profileUrl: string;
    bio: string;
    verifiedSource: boolean;
    identityResolutionStatus: string;
    dataProvenance: 'PUBLIC';
  };
  publicMetrics: {
    followersCount: number;
    followingCount: number;
    postsCount: number;
    visibleEngagementRate: string;
    postingFrequency: string;
    topFormats: string[];
  };
  scores: {
    publicQualityScore: number;
    visualConsistencyScore: number;
    brandPositioningScore: number;
    postingConsistencyScore: number;
    captionQualityScore: number;
    hookStrengthScore: number;
    ctaQualityScore: number;
    topicDiversityScore: number;
    brandIdentityConfidence: number;
  };
  contentThemes: string[];
  brandColors: string[];
  visibleCompetitorPositioning: string[];
  contentGaps: string[];
  recommendations: string[];
  disclaimer: string;
}

export interface PostDiagnosticResult {
  analysisId: string;
  brandId: string;
  postId?: string;
  scores: {
    overallScore: number;
    hookScore: number;
    captionScore: number;
    visualScore: number;
    ctaScore: number;
    brandFitScore: number;
    discoverabilityScore: number;
    engagementScore: number;
    platformFitScore: number;
    timingScore: number;
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: Array<{
    recommendationId: string;
    field: 'title' | 'topic' | 'hook' | 'caption' | 'description' | 'CTA' | 'hashtags' | 'keywords' | 'image' | 'publishing time';
    original: string;
    suggested: string;
    reason: string;
    expectedImpact: string;
    confidence: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    category: 'safe' | 'restricted';
    status: 'pending' | 'applied' | 'rejected' | 'edited' | 'ignored';
  }>;
  aiMode: 'advisory' | 'copilot' | 'autonomous';
  confidence: number;
}

export interface PostPredictionResult {
  performanceScore: number;
  predictedEngagementRange: {
    min: number;
    max: number;
    median: number;
  };
  confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  isColdStart: boolean;
  benchmarkPercentile: number;
  modelVersion: string;
  topPositiveFactors: Array<{ factor: string; weight: string; explanation: string }>;
  topNegativeFactors: Array<{ factor: string; weight: string; explanation: string }>;
  timingAnalysis: {
    recommendedDay: string;
    recommendedHour: string;
    isOptimalWindow: boolean;
  };
}

export interface NextBestTopic {
  id: string;
  topicName: string;
  relevanceScore: number;
  historicalPerformance: number;
  brandAlignment: number;
  audienceInterest: number;
  competitionLevel: 'Low' | 'Medium' | 'High';
  recommendedFormat: string;
  status: 'opportunity' | 'overused' | 'missing' | 'low_value';
  rationale: string;
}

export interface HashtagOptimizationResult {
  classified: Array<{
    tag: string;
    category: 'Brand' | 'Industry' | 'Niche' | 'Discovery' | 'Campaign' | 'Trending';
    action: 'KEEP' | 'REMOVE' | 'REPLACE' | 'ADD';
    suggestedReplacement?: string;
    reason: string;
  }>;
  recommendedTags: string[];
  finalSuggestedTagString: string;
}

export interface CommentAnalysisItem {
  id: string;
  brandId: string;
  postId?: string;
  platform: string;
  commenterHandle: string;
  commentText: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  category: string;
  leadIntentScore: number;
  isLead: boolean;
  status: 'new' | 'contacted' | 'dismissed';
  detectedAt: string;
}

export interface AIUsageSummary {
  totalRequests: number;
  totalTokens: number;
  avgLatencyMs: number;
  totalCostUsd: number;
  budgetRemainingUsd: number;
  recentRequests: any[];
}

