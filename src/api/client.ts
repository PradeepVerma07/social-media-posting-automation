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

  async executeWorkflow(id: number): Promise<any> {
    return request<any>(`/workflows/${id}/execute`, { method: 'POST' });
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
};
