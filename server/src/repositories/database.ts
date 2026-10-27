import fs from 'fs';
import path from 'path';
import {
  User,
  Brand,
  BrandTokens,
  SocialAccount,
  Post,
  PostComment,
  PostVersion,
  WorkflowMapping,
  WorkflowExecution,
  AnalyticsOverview,
  InAppNotification,
  AuditLogEntry,
  SocialPlatform,
  ApprovalStatus,
  PublishingStatus
} from '../types';

// In-Memory Database store with complete transactional seeds
class DatabaseRepository {
  private users: User[] = [
    {
      id: 1,
      email: 'admin@ci360.internal',
      fullName: 'David Vance',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
      role: 'Super Admin',
      tenantScope: 'Global (All Brands)',
      isActive: true,
      twoFactorEnabled: false,
      createdAt: '2026-01-10T08:00:00Z',
    },
    {
      id: 2,
      email: 'editor@ci360.internal',
      fullName: 'Elena Rostova',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=120&h=120&q=80',
      role: 'Content Manager',
      tenantScope: 'Nexus & Starlight',
      isActive: true,
      createdAt: '2026-01-15T09:30:00Z',
    },
    {
      id: 3,
      email: 'approver@ci360.internal',
      fullName: 'Marcus Sterling',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80',
      role: 'Approver',
      tenantScope: 'Global (All Brands)',
      isActive: true,
      createdAt: '2026-01-12T11:00:00Z',
    },
    {
      id: 4,
      email: 'client@nexusglobal.com',
      fullName: 'Sophia Al-Mansoor',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&h=120&q=80',
      role: 'Client',
      tenantScope: 'Nexus Enterprise Cloud Only',
      isActive: true,
      createdAt: '2026-02-01T14:20:00Z',
    },
  ];

  private brands: Brand[] = [
    {
      id: 1,
      name: 'Flower Plant',
      slug: 'flower-plant',
      logoUrl: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=120&h=120&q=80',
      primaryColor: '#059669',
      secondaryColor: '#10B981',
      timezone: 'Asia/Kolkata',
      country: 'IN',
      defaultApproverId: 3,
      defaultHashtags: '#FlowerPlant #IndoorPlants #GreenLife #PlantCare',
      defaultKeywords: 'plants, gardening, indoor plants, ciflow',
      isActive: true,
      connectedAccountsCount: 2,
      tokens: {
        metaAccessToken: 'EAGVJejn6LZAgBS6WNRis8ZBAYNmc0RwStlk3jKnniciCU8XZCDUkE0EoY5sboubZCFkmVDZBPcHucnWUOsVnbWpH8Wbur8mqXyOfgw52c4op6skSjCDvkffZBnzTjF9sT5ohOjAz8W98Fl9lDQlZCpYlNZBArYRYf7opKIZC4DFcTXNl7meoehyRgwQuJ7Gen36O9NWoFYqfVmu3RCf4dOuUl1eK12DRjerpCWZA7WOdy9C1OjjNviBfK6Co1xOB4gTclZA8I0kxCceuUAftmZCbZBtxj5akGWAZDZD',
        facebookPageId: '1454740611044963',
        facebookPageName: 'Flower plant',
        facebookPageToken: 'EAGVJejn6LZAgBS4H7nAEKZBXV7A50nHZCXft8qMWbTZABEhzR7nYHjfkzCbeTALZCTUs7gmaxCGKR3mZBEJ7rZBSKn1FTP3ZCJvc1gRZCSEZBEAl06Ef7dauZB44gBN3jWYcwzy0IlHJxRhPBqvi1XkiSZCWKW0w4RxNwi92Y0XvtnfIFejuadRA9kZBWTwAUCpEmV5VfYwbOOPuZBEOSDXXTURnt0erbzd4h0Qj7JLOZC8C5L1',
        instagramBusinessId: '17841439037630316',
        instagramHandle: '@ciflow904',
      },
    },
  ];

  private socialAccounts: SocialAccount[] = [
    {
      id: 1,
      brandId: 1,
      platform: 'facebook',
      accountName: 'Flower plant',
      accountHandle: '1454740611044963',
      socialMediaId: '1454740611044963',
      profileImageUrl: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=64&h=64&q=80',
      connectionStatus: 'connected',
      tokenExpiresAt: '2026-12-31T23:59:59Z',
      lastSuccessfulPublishAt: '2026-10-23T15:30:00Z',
      accessToken: 'EAGVJejn6LZAgBS4H7nAEKZBXV7A50nHZCXft8qMWbTZABEhzR7nYHjfkzCbeTALZCTUs7gmaxCGKR3mZBEJ7rZBSKn1FTP3ZCJvc1gRZCSEZBEAl06Ef7dauZB44gBN3jWYcwzy0IlHJxRhPBqvi1XkiSZCWKW0w4RxNwi92Y0XvtnfIFejuadRA9kZBWTwAUCpEmV5VfYwbOOPuZBEOSDXXTURnt0erbzd4h0Qj7JLOZC8C5L1',
    },
    {
      id: 2,
      brandId: 1,
      platform: 'instagram',
      accountName: 'ciflow904',
      accountHandle: '@ciflow904',
      socialMediaId: '17841439037630316',
      profileImageUrl: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?auto=format&fit=crop&w=64&h=64&q=80',
      connectionStatus: 'connected',
      tokenExpiresAt: '2026-12-31T23:59:59Z',
      lastSuccessfulPublishAt: '2026-10-23T15:30:00Z',
      accessToken: 'EAGVJejn6LZAgBS6WNRis8ZBAYNmc0RwStlk3jKnniciCU8XZCDUkE0EoY5sboubZCFkmVDZBPcHucnWUOsVnbWpH8Wbur8mqXyOfgw52c4op6skSjCDvkffZBnzTjF9sT5ohOjAz8W98Fl9lDQlZCpYlNZBArYRYf7opKIZC4DFcTXNl7meoehyRgwQuJ7Gen36O9NWoFYqfVmu3RCf4dOuUl1eK12DRjerpCWZA7WOdy9C1OjjNviBfK6Co1xOB4gTclZA8I0kxCceuUAftmZCbZBtxj5akGWAZDZD',
    },
  ];

  private posts: Post[] = [
    {
      id: 101,
      brandId: 1,
      brandName: 'Flower Plant',
      createdByUserId: 1,
      createdByName: 'David Vance',
      assignedApproverId: 3,
      assignedApproverName: 'Marcus Sterling',
      title: 'Exciting Updates from Flower Plant! 🌱',
      masterCaption: 'Welcome to Flower Plant! Discover indoor greenery, fresh succulents, and organic plant care tips. Elevate your space with living nature today. 🪴✨ #FlowerPlant #IndoorPlants #Greenery',
      firstComment: 'Visit our community page for plant care guides and seasonal collections!',
      hashtags: '#FlowerPlant #IndoorPlants #Greenery #PlantCare',
      keywords: 'plants, succulents, indoor gardening',
      targetUrl: 'https://facebook.com/1454740611044963',
      country: 'IN',
      timezone: 'Asia/Kolkata',
      scheduledAt: '2026-10-23T17:00:00.000Z',
      approvalStatus: 'approved',
      publishingStatus: 'scheduled',
      versionNumber: 1,
      isLocked: false,
      platforms: [
        { platform: 'facebook', publishingStatus: 'pending' },
      ],
      media: [
        {
          id: 1,
          postId: 101,
          mediaType: 'image',
          fileUrl: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=1200&h=630&q=80',
          originalFileName: 'flower_plant_banner.jpg',
          mimeType: 'image/jpeg',
          fileSizeBytes: 1820000,
          width: 1200,
          height: 630,
          altText: 'Indoor green plant collection banner',
        },
      ],
      commentsCount: 1,
      createdAt: '2026-10-23T15:30:00Z',
      updatedAt: '2026-10-23T15:30:00Z',
    },
    {
      id: 102,
      brandId: 1,
      brandName: 'Flower Plant',
      createdByUserId: 1,
      createdByName: 'David Vance',
      assignedApproverId: 3,
      assignedApproverName: 'Marcus Sterling',
      title: 'Green Life Inspiration 🌿',
      masterCaption: 'Bring nature into your everyday living space with our premium botanical selections. Follow @ciflow904 for daily plant aesthetic inspiration and sustainable gardening routines! 🌿✨ #Ciflow #FlowerPlant #PlantLover',
      firstComment: 'Follow @ciflow904 for new green arrivals and botanical advice! 🪴',
      hashtags: '#Ciflow #FlowerPlant #PlantLover #HomeDecor #GreenLife',
      keywords: 'ciflow, home decor, plants, aesthetics',
      targetUrl: 'https://instagram.com/ciflow904',
      country: 'IN',
      timezone: 'Asia/Kolkata',
      scheduledAt: '2026-10-23T17:00:00.000Z',
      approvalStatus: 'approved',
      publishingStatus: 'scheduled',
      versionNumber: 1,
      isLocked: false,
      platforms: [
        { platform: 'instagram', publishingStatus: 'pending' },
      ],
      media: [
        {
          id: 2,
          postId: 102,
          mediaType: 'image',
          fileUrl: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?auto=format&fit=crop&w=1200&h=630&q=80',
          originalFileName: 'green_life_ciflow.jpg',
          mimeType: 'image/jpeg',
          fileSizeBytes: 2150000,
          width: 1200,
          height: 630,
          altText: 'Ciflow botanical plants arrangement',
        },
      ],
      commentsCount: 1,
      createdAt: '2026-10-23T15:30:00Z',
      updatedAt: '2026-10-23T15:30:00Z',
    },
  ];

  private comments: PostComment[] = [
    {
      id: 1,
      postId: 101,
      userId: 1,
      userFullName: 'David Vance (Admin)',
      userRole: 'Super Admin',
      commentText: 'Scheduled for 10:30 PM (22:30 IST) auto-posting to Facebook Page "Flower plant" (ID: 1454740611044963).',
      isSystemMessage: true,
      isEdited: false,
      createdAt: '2026-10-23T15:30:00Z',
    },
    {
      id: 2,
      postId: 102,
      userId: 1,
      userFullName: 'David Vance (Admin)',
      userRole: 'Super Admin',
      commentText: 'Scheduled for 10:30 PM (22:30 IST) auto-posting to Instagram Business "@ciflow904" (ID: 17841439037630316).',
      isSystemMessage: true,
      isEdited: false,
      createdAt: '2026-10-23T15:30:00Z',
    },
  ];

  private workflows: WorkflowMapping[] = [
    {
      id: 1,
      workflowName: 'Social Multi-Platform Publisher',
      n8nWorkflowId: 'wf_ci360_multi_publisher',
      webhookPath: '/webhook/ci360/publish-now',
      description: 'Orchestrates publishing to LinkedIn, Facebook, Instagram & X with rollback safety',
      isActive: true,
      averageDurationMs: 3420,
      successCount: 142,
      failureCount: 3,
      lastExecutedAt: '2026-10-22T22:30:00Z',
      lastResultStatus: 'success',
    },
    {
      id: 2,
      workflowName: 'Schedule & Queue Dispatcher',
      n8nWorkflowId: 'wf_ci360_scheduler',
      webhookPath: '/webhook/ci360/schedule-post',
      description: 'Evaluates scheduled posts, verifies locking status, and queues timed executions',
      isActive: true,
      averageDurationMs: 890,
      successCount: 89,
      failureCount: 0,
      lastExecutedAt: '2026-10-22T23:00:00Z',
      lastResultStatus: 'success',
    },
    {
      id: 3,
      workflowName: 'Google Sheets Content Sync',
      n8nWorkflowId: 'wf_ci360_sheets_sync',
      webhookPath: '/webhook/ci360/sync-sheets',
      description: 'Bi-directional synchronization between Google Sheets content planner and MySQL database',
      isActive: true,
      averageDurationMs: 4120,
      successCount: 56,
      failureCount: 1,
      lastExecutedAt: '2026-10-22T20:15:00Z',
      lastResultStatus: 'success',
    },
    {
      id: 4,
      workflowName: 'Executive Approval Notifier',
      n8nWorkflowId: 'wf_ci360_approval_alert',
      webhookPath: '/webhook/ci360/request-approval',
      description: 'Sends signed, expiring approval tokens to client and executive reviewers via email & Slack',
      isActive: true,
      averageDurationMs: 640,
      successCount: 210,
      failureCount: 0,
      lastExecutedAt: '2026-10-22T21:45:00Z',
      lastResultStatus: 'success',
    },
    {
      id: 5,
      workflowName: 'Main Multi-Brand Scheduler & Auto-Publisher (Google Sheets + 8 Networks)',
      n8nWorkflowId: 'wf_ci360_main_scheduler',
      webhookPath: '/webhook/main-scheduler',
      description: 'Reads scheduled posts from Google Sheets, normalizes IANA timezones, locks rows, and publishes to Facebook, Instagram, Threads, LinkedIn, X, YouTube, Pinterest, TikTok.',
      isActive: true,
      averageDurationMs: 2450,
      successCount: 342,
      failureCount: 2,
      lastExecutedAt: '2026-10-23T19:50:00Z',
      lastResultStatus: 'success',
    },
    {
      id: 6,
      workflowName: 'Social Media Error Handler & Crash Recovery',
      n8nWorkflowId: 'wf_ci360_error_handler',
      webhookPath: '/webhook/error-handler',
      description: 'Dedicated Error Workflow that releases rows locked by crashed execution IDs, resets status to Retrying, logs diagnostics, and dispatches alerts.',
      isActive: true,
      averageDurationMs: 420,
      successCount: 18,
      failureCount: 0,
      lastExecutedAt: '2026-10-23T18:30:00Z',
      lastResultStatus: 'success',
    },
    {
      id: 7,
      workflowName: 'Failed Social Posts Retry Pipeline',
      n8nWorkflowId: 'wf_ci360_retry_failed',
      webhookPath: '/webhook/retry-failed-posts',
      description: 'Manual and webhook-triggered retry engine that resets failed posts with transient error codes back to Scheduled.',
      isActive: true,
      averageDurationMs: 1150,
      successCount: 64,
      failureCount: 0,
      lastExecutedAt: '2026-10-23T19:15:00Z',
      lastResultStatus: 'success',
    },
  ];

  private executions: WorkflowExecution[] = [
    {
      id: 1,
      executionId: 'exec_7721_ci360',
      n8nWorkflowId: 'wf_ci360_multi_publisher',
      workflowName: 'Social Multi-Platform Publisher',
      postId: 103,
      postTitle: 'Customer Case Study: How FinTech Corp Migrated 40TB in 48 Hours',
      brandId: 1,
      brandName: 'Nexus Enterprise Cloud',
      initiatedByUserId: 1,
      initiatedByName: 'David Vance',
      triggerType: 'schedule',
      status: 'success',
      durationMs: 3120,
      startedAt: '2026-10-20T15:00:00Z',
      finishedAt: '2026-10-20T15:00:03Z',
      perPlatformResults: {
        linkedin: { status: 'published', url: 'https://linkedin.com/feed/update/urn:li:activity:7129840291' },
        x: { status: 'published', url: 'https://x.com/NexusCloudTech/status/17849201948291' },
      },
    },
    {
      id: 2,
      executionId: 'exec_7722_ci360',
      n8nWorkflowId: 'wf_ci360_sheets_sync',
      workflowName: 'Google Sheets Content Sync',
      brandId: 1,
      brandName: 'Nexus Enterprise Cloud',
      initiatedByUserId: 1,
      initiatedByName: 'David Vance',
      triggerType: 'manual',
      status: 'success',
      durationMs: 4210,
      startedAt: '2026-10-22T20:15:00Z',
      finishedAt: '2026-10-22T20:15:04Z',
      sanitizedInput: { sheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', rowsEvaluated: 24, rowsUpdated: 3 },
    },
    {
      id: 3,
      executionId: 'exec_984128_ci360',
      n8nWorkflowId: 'wf_ci360_main_scheduler',
      workflowName: 'Main Multi-Brand Scheduler & Auto-Publisher (Google Sheets + 8 Networks)',
      postId: 1001,
      postTitle: 'Autonomous Multi-Agent AI Workflows in Production',
      brandId: 1,
      brandName: 'Nexus Enterprise Cloud',
      initiatedByUserId: 1,
      initiatedByName: 'Automation Scheduler (Cron 5m)',
      triggerType: 'schedule',
      status: 'success',
      durationMs: 2340,
      startedAt: '2026-10-23T19:45:00Z',
      finishedAt: '2026-10-23T19:45:02Z',
      perPlatformResults: {
        facebook: { status: 'published', url: 'https://facebook.com/102938475610293/posts/1001' },
        instagram: { status: 'published', url: 'https://instagram.com/p/DB1001xyz/' },
        threads: { status: 'published', url: 'https://threads.net/@nexusenterprise/post/Th1001' },
        linkedin: { status: 'published', url: 'https://linkedin.com/feed/update/urn:li:share:1001' },
        x: { status: 'published', url: 'https://x.com/nexuscloudtech/status/1849204918293012480' },
        youtube: { status: 'published', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
        pinterest: { status: 'published', url: 'https://pinterest.com/pin/1001' },
        tiktok: { status: 'published', url: 'https://www.tiktok.com/@nexuscloud/video/719283749281' },
      },
    },
    {
      id: 4,
      executionId: 'exec_984392_ci360',
      n8nWorkflowId: 'wf_ci360_retry_failed',
      workflowName: 'Failed Social Posts Retry Pipeline',
      postId: 1003,
      postTitle: 'High-Concurrency Event Sourcing Patterns',
      brandId: 1,
      brandName: 'Nexus Enterprise Cloud',
      initiatedByUserId: 1,
      initiatedByName: 'David Vance',
      triggerType: 'webhook_callback',
      status: 'success',
      durationMs: 1420,
      startedAt: '2026-10-23T19:50:00Z',
      finishedAt: '2026-10-23T19:50:01Z',
      perPlatformResults: {
        instagram: { status: 'published', url: 'https://instagram.com/p/DB1003retried/' },
      },
    },
  ];

  private notifications: InAppNotification[] = [
    {
      id: 1,
      userId: 1,
      eventType: 'approval_requested',
      title: 'New Post Pending Approval',
      message: 'Elena Rostova submitted "Announcing Zero-Downtime Multi-Region Kubernetes Autoscaling" for approval.',
      linkUrl: '/approvals',
      isRead: false,
      createdAt: '2026-10-22T10:15:00Z',
    },
    {
      id: 2,
      userId: 1,
      eventType: 'post_published',
      title: 'Automated Post Published Successfully',
      message: '"Customer Case Study: How FinTech Corp Migrated 40TB in 48 Hours" was published to LinkedIn and X.',
      linkUrl: '/posts',
      isRead: true,
      createdAt: '2026-10-20T15:01:00Z',
    },
  ];

  private auditLogs: AuditLogEntry[] = [
    {
      id: 1,
      userId: 1,
      userEmail: 'admin@ci360.internal',
      action: 'LOGIN_SUCCESS',
      entityType: 'AUTH',
      ipAddress: '192.168.1.104',
      details: { client: 'Chrome 130 / macOS' },
      createdAt: '2026-10-22T23:10:00Z',
    },
    {
      id: 2,
      userId: 3,
      userEmail: 'approver@ci360.internal',
      action: 'POST_APPROVED',
      entityType: 'POST',
      entityId: 102,
      details: { title: 'Webinar: Scaling PostgreSQL' },
      createdAt: '2026-10-21T14:20:00Z',
    },
  ];

  // Users
  getUsers(): User[] {
    return [...this.users];
  }

  getUserByEmail(email: string): User | undefined {
    return this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  getUserById(id: number): User | undefined {
    return this.users.find(u => u.id === id);
  }

  createUser(userData: Partial<User> & { email: string; fullName: string; role: any }): User {
    const nextId = this.users.length > 0 ? Math.max(...this.users.map(u => u.id)) + 1 : 1;
    const newUser: User = {
      id: nextId,
      email: userData.email,
      fullName: userData.fullName,
      avatarUrl: userData.avatarUrl || `https://images.unsplash.com/photo-${1530000000000 + (nextId * 12345)}?auto=format&fit=crop&w=120&h=120&q=80`,
      role: userData.role || 'Content Manager',
      tenantScope: userData.tenantScope || 'Global (All Brands)',
      isActive: userData.isActive !== undefined ? userData.isActive : true,
      twoFactorEnabled: false,
      createdAt: new Date().toISOString(),
    };
    this.users.push(newUser);
    return newUser;
  }

  updateUser(id: number, data: Partial<User>): User | undefined {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx === -1) return undefined;
    this.users[idx] = { ...this.users[idx], ...data };
    return this.users[idx];
  }

  deleteUser(id: number): boolean {
    const idx = this.users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    this.users.splice(idx, 1);
    return true;
  }

  // Brands
  getBrands(): Brand[] {
    return [...this.brands];
  }

  getBrandById(id: number): Brand | undefined {
    return this.brands.find(b => b.id === id);
  }

  createBrand(brandData: Omit<Brand, 'id'> & { tokens?: BrandTokens }): Brand {
    const nextId = this.brands.length > 0 ? Math.max(...this.brands.map(b => b.id)) + 1 : 1;
    const newBrand: Brand = {
      ...brandData,
      id: nextId,
      connectedAccountsCount: 0,
      isActive: brandData.isActive !== undefined ? brandData.isActive : true,
    };
    this.brands.push(newBrand);

    if (newBrand.tokens) {
      this.syncBrandSocialAccounts(newBrand);
    }
    this.syncTemplatesToCsv();
    return newBrand;
  }

  updateBrand(id: number, data: Partial<Brand> & { tokens?: BrandTokens }): Brand | undefined {
    const idx = this.brands.findIndex(b => b.id === id);
    if (idx === -1) return undefined;

    // Merge existing tokens with incoming tokens
    const mergedTokens = data.tokens
      ? { ...(this.brands[idx].tokens || {}), ...data.tokens }
      : this.brands[idx].tokens;

    this.brands[idx] = {
      ...this.brands[idx],
      ...data,
      tokens: mergedTokens,
    };

    const brand = this.brands[idx];
    if (brand.tokens) {
      this.syncBrandSocialAccounts(brand);
    }
    this.syncTemplatesToCsv();
    return brand;
  }

  deleteBrand(id: number): boolean {
    const idx = this.brands.findIndex(b => b.id === id);
    if (idx === -1) return false;
    this.brands.splice(idx, 1);
    // Remove associated social accounts
    this.socialAccounts = this.socialAccounts.filter(a => a.brandId !== id);
    this.syncTemplatesToCsv();
    return true;
  }

  // Synchronize Brand API Tokens into Social Accounts & keep connectionStatus in sync
  private syncBrandSocialAccounts(brand: Brand): void {
    if (!brand.tokens) return;
    const t = brand.tokens;

    // 1. Facebook Page
    if (t.facebookPageId || t.facebookPageToken || t.metaAccessToken) {
      const fbAcc = this.socialAccounts.find(a => a.brandId === brand.id && a.platform === 'facebook');
      const token = t.facebookPageToken || t.metaAccessToken;
      const mediaId = t.facebookPageId || (fbAcc ? fbAcc.socialMediaId : '1454740611044963');
      const name = t.facebookPageName || brand.name;

      if (fbAcc) {
        fbAcc.accountName = name;
        fbAcc.accountHandle = mediaId;
        fbAcc.socialMediaId = mediaId;
        if (token) fbAcc.accessToken = token;
        fbAcc.connectionStatus = 'connected';
      } else {
        this.socialAccounts.push({
          id: this.socialAccounts.length > 0 ? Math.max(...this.socialAccounts.map(a => a.id)) + 1 : 1,
          brandId: brand.id,
          platform: 'facebook',
          accountName: name,
          accountHandle: mediaId,
          socialMediaId: mediaId,
          profileImageUrl: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=64&h=64&q=80',
          connectionStatus: 'connected',
          tokenExpiresAt: '2026-12-31T23:59:59Z',
          lastSuccessfulPublishAt: new Date().toISOString(),
          accessToken: token,
        });
      }
    }

    // 2. Instagram Business
    if (t.instagramBusinessId || t.instagramHandle || t.metaAccessToken || t.facebookPageToken) {
      const igAcc = this.socialAccounts.find(a => a.brandId === brand.id && a.platform === 'instagram');
      const token = t.metaAccessToken || t.facebookPageToken;
      const mediaId = t.instagramBusinessId || (igAcc ? igAcc.socialMediaId : '17841439037630316') || '17841439037630316';
      const handle = t.instagramHandle || (igAcc ? igAcc.accountHandle : `@${brand.slug}`) || `@${brand.slug}`;

      if (igAcc) {
        igAcc.accountName = handle.replace('@', '');
        igAcc.accountHandle = handle;
        igAcc.socialMediaId = mediaId;
        if (token) igAcc.accessToken = token;
        igAcc.connectionStatus = 'connected';
      } else {
        this.socialAccounts.push({
          id: this.socialAccounts.length > 0 ? Math.max(...this.socialAccounts.map(a => a.id)) + 1 : 1,
          brandId: brand.id,
          platform: 'instagram',
          accountName: handle.replace('@', ''),
          accountHandle: handle,
          socialMediaId: mediaId,
          profileImageUrl: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?auto=format&fit=crop&w=64&h=64&q=80',
          connectionStatus: 'connected',
          tokenExpiresAt: '2026-12-31T23:59:59Z',
          lastSuccessfulPublishAt: new Date().toISOString(),
          accessToken: token,
        });
      }
    }

    // 3. LinkedIn
    if (t.linkedinUrn || t.linkedinAccessToken) {
      const liAcc = this.socialAccounts.find(a => a.brandId === brand.id && a.platform === 'linkedin');
      if (liAcc) {
        liAcc.accountHandle = t.linkedinUrn || liAcc.accountHandle;
        liAcc.socialMediaId = t.linkedinUrn || liAcc.socialMediaId;
        if (t.linkedinAccessToken) liAcc.accessToken = t.linkedinAccessToken;
        liAcc.connectionStatus = 'connected';
      } else {
        this.socialAccounts.push({
          id: this.socialAccounts.length > 0 ? Math.max(...this.socialAccounts.map(a => a.id)) + 1 : 1,
          brandId: brand.id,
          platform: 'linkedin',
          accountName: brand.name,
          accountHandle: t.linkedinUrn || `urn:li:organization:${brand.id}`,
          socialMediaId: t.linkedinUrn || `urn:li:organization:${brand.id}`,
          profileImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=64&h=64&q=80',
          connectionStatus: 'connected',
          accessToken: t.linkedinAccessToken,
        });
      }
    }

    // 4. X (Twitter)
    if (t.xBearerToken || t.xApiKey) {
      const xAcc = this.socialAccounts.find(a => a.brandId === brand.id && a.platform === 'x');
      if (xAcc) {
        if (t.xBearerToken) xAcc.accessToken = t.xBearerToken;
        xAcc.connectionStatus = 'connected';
      } else {
        this.socialAccounts.push({
          id: this.socialAccounts.length > 0 ? Math.max(...this.socialAccounts.map(a => a.id)) + 1 : 1,
          brandId: brand.id,
          platform: 'x',
          accountName: brand.name,
          accountHandle: `@${brand.slug}`,
          socialMediaId: brand.slug,
          profileImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=64&h=64&q=80',
          connectionStatus: 'connected',
          accessToken: t.xBearerToken,
        });
      }
    }

    // Update brand connectedAccountsCount
    brand.connectedAccountsCount = this.socialAccounts.filter(a => a.brandId === brand.id).length;
  }

  // Automatically write Brands.csv & Social_Accounts.csv to disk for Google Sheets / n8n sync
  private syncTemplatesToCsv(): void {
    try {
      const templateDir = path.resolve(process.cwd(), 'sheet_template');
      if (!fs.existsSync(templateDir)) {
        fs.mkdirSync(templateDir, { recursive: true });
      }

      // 1. Brands.csv
      const brandsCsvHeader = 'brand_id,client_id,brand_name,default_timezone,status\n';
      const brandsCsvRows = this.brands.map(b => {
        const brandCode = `BR-${String(b.id).padStart(3, '0')}`;
        return `${brandCode},CL-001,${b.name},${b.timezone},${b.isActive ? 'Active' : 'Paused'}`;
      }).join('\n');
      fs.writeFileSync(path.join(templateDir, 'Brands.csv'), brandsCsvHeader + brandsCsvRows + '\n', 'utf8');

      // 2. Social_Accounts.csv
      const accountsCsvHeader = 'account_id,brand_id,platform,social_media_id,account_handle,n8n_credential_name,connection_status,last_verified_at,access_token\n';
      const accountsCsvRows = this.socialAccounts.map(a => {
        const accCode = `ACC-${String(a.id).padStart(3, '0')}`;
        const brandCode = `BR-${String(a.brandId).padStart(3, '0')}`;
        const credName = `${a.platform}_brand_${a.brandId}_cred`;
        const lastVer = a.lastSuccessfulPublishAt || new Date().toISOString();
        const token = a.accessToken || '';
        return `${accCode},${brandCode},${a.platform},${a.socialMediaId || a.accountHandle || ''},${a.accountName || a.accountHandle || ''},${credName},${a.connectionStatus === 'connected' ? 'Connected' : 'Disconnected'},${lastVer},${token}`;
      }).join('\n');
      fs.writeFileSync(path.join(templateDir, 'Social_Accounts.csv'), accountsCsvHeader + accountsCsvRows + '\n', 'utf8');

      // 3. Posts.csv
      const postsCsvHeader = 'post_id,client_id,brand_id,brand_name,platform,social_media_id,post_title,caption,hashtags,media_type,media_url(s),link_url,schedule_date,schedule_time,timezone,scheduled_utc,status,attempt_count,last_attempt_at,posted_at,platform_post_id,post_url,error_code,error_message,locked_by_execution,updated_at\n';
      const postsCsvRows = this.posts.map(p => {
        const postId = `POST-${String(p.id).padStart(3, '0')}`;
        const brandCode = `BR-${String(p.brandId).padStart(3, '0')}`;
        const platform = p.platforms?.[0]?.platform || 'facebook';
        const socialAcc = this.socialAccounts.find(a => a.brandId === p.brandId && a.platform === platform);
        const socialMediaId = socialAcc?.socialMediaId || socialAcc?.accountHandle || '';
        const dt = p.scheduledAt ? new Date(p.scheduledAt) : new Date();
        const scheduleDate = dt.toISOString().split('T')[0];
        const scheduleTime = `${String(dt.getUTCHours()).padStart(2, '0')}:${String(dt.getUTCMinutes()).padStart(2, '0')}`;
        const mediaUrl = p.media?.[0]?.fileUrl || '';
        const mediaType = p.media?.[0]?.mediaType || 'none';
        const cleanCaption = `"${(p.masterCaption || '').replace(/"/g, '""')}"`;
        const cleanTitle = `"${(p.title || '').replace(/"/g, '""')}"`;
        const status = p.publishingStatus === 'published' ? 'Posted' : (p.publishingStatus === 'scheduled' ? 'Scheduled' : 'Draft');
        return `${postId},CL-001,${brandCode},${p.brandName},${platform},${socialMediaId},${cleanTitle},${cleanCaption},${p.hashtags || ''},${mediaType},${mediaUrl},${p.targetUrl || ''},${scheduleDate},${scheduleTime},${p.timezone || 'Asia/Kolkata'},${p.scheduledAt || ''},${status},0,,,,,,`;
      }).join('\n');
      fs.writeFileSync(path.join(templateDir, 'Posts.csv'), postsCsvHeader + postsCsvRows + '\n', 'utf8');
    } catch (err) {
      console.warn('Failed syncing templates to CSV:', err);
    }
  }

  // Social Accounts
  getSocialAccounts(brandId?: number): SocialAccount[] {
    if (brandId) {
      return this.socialAccounts.filter(a => a.brandId === brandId);
    }
    return [...this.socialAccounts];
  }

  // Posts
  getPosts(filters?: {
    brandId?: number;
    approvalStatus?: ApprovalStatus;
    publishingStatus?: PublishingStatus;
    search?: string;
  }): Post[] {
    let list = [...this.posts];

    if (filters?.brandId) {
      list = list.filter(p => p.brandId === filters.brandId);
    }
    if (filters?.approvalStatus) {
      list = list.filter(p => p.approvalStatus === filters.approvalStatus);
    }
    if (filters?.publishingStatus) {
      list = list.filter(p => p.publishingStatus === filters.publishingStatus);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        p =>
          p.title.toLowerCase().includes(q) ||
          p.masterCaption.toLowerCase().includes(q) ||
          p.brandName.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getPostById(id: number): Post | undefined {
    return this.posts.find(p => p.id === id);
  }

  createPost(postData: Omit<Post, 'id' | 'createdAt' | 'updatedAt' | 'commentsCount' | 'brandName' | 'createdByName'>): Post {
    const brand = this.getBrandById(postData.brandId);
    const creator = this.getUserById(postData.createdByUserId);

    const newPost: Post = {
      ...postData,
      id: Math.max(...this.posts.map(p => p.id), 100) + 1,
      brandName: brand?.name || 'Unknown Brand',
      createdByName: creator?.fullName || 'User',
      commentsCount: 0,
      versionNumber: 1,
      isLocked: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.posts.unshift(newPost);
    this.logAudit({
      userId: postData.createdByUserId,
      action: 'POST_CREATED',
      entityType: 'POST',
      entityId: newPost.id,
      details: { title: newPost.title, brandId: newPost.brandId },
    });
    this.syncTemplatesToCsv();

    return newPost;
  }

  updatePost(id: number, updates: Partial<Post>, userId?: number): Post | undefined {
    const idx = this.posts.findIndex(p => p.id === id);
    if (idx === -1) return undefined;

    const existing = this.posts[idx];

    // Check version bump if content changed
    let newVersion = existing.versionNumber;
    if (updates.masterCaption && updates.masterCaption !== existing.masterCaption) {
      newVersion += 1;
    }

    this.posts[idx] = {
      ...existing,
      ...updates,
      versionNumber: newVersion,
      updatedAt: new Date().toISOString(),
    };

    if (userId) {
      this.logAudit({
        userId,
        action: 'POST_UPDATED',
        entityType: 'POST',
        entityId: id,
        details: { updates },
      });
    }

    this.syncTemplatesToCsv();
    return this.posts[idx];
  }

  deletePost(id: number, userId?: number): boolean {
    const idx = this.posts.findIndex(p => p.id === id);
    if (idx === -1) return false;
    this.posts.splice(idx, 1);
    if (userId) {
      this.logAudit({
        userId,
        action: 'POST_DELETED',
        entityType: 'POST',
        entityId: id,
      });
    }
    this.syncTemplatesToCsv();
    return true;
  }

  // Comments
  getCommentsByPostId(postId: number): PostComment[] {
    return this.comments
      .filter(c => c.postId === postId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  addComment(commentData: {
    postId: number;
    userId: number;
    commentText: string;
    isSystemMessage?: boolean;
    attachmentUrl?: string;
  }): PostComment {
    const user = this.getUserById(commentData.userId);
    const newComment: PostComment = {
      id: this.comments.length + 1,
      postId: commentData.postId,
      userId: commentData.userId,
      userFullName: user?.fullName || 'User',
      userAvatarUrl: user?.avatarUrl,
      userRole: user?.role || 'Content Manager',
      commentText: commentData.commentText,
      isSystemMessage: Boolean(commentData.isSystemMessage),
      attachmentUrl: commentData.attachmentUrl,
      isEdited: false,
      createdAt: new Date().toISOString(),
    };

    this.comments.push(newComment);

    // Bump comment count on post
    const post = this.getPostById(commentData.postId);
    if (post) {
      post.commentsCount += 1;
    }

    return newComment;
  }

  // Workflows & Executions
  getWorkflows(): WorkflowMapping[] {
    return [...this.workflows];
  }

  getWorkflowById(id: number): WorkflowMapping | undefined {
    return this.workflows.find(w => w.id === id);
  }

  getWorkflowByN8nId(n8nId: string): WorkflowMapping | undefined {
    return this.workflows.find(w => w.n8nWorkflowId === n8nId);
  }

  getExecutions(): WorkflowExecution[] {
    return [...this.executions].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }

  getExecutionById(id: number): WorkflowExecution | undefined {
    return this.executions.find(e => e.id === id);
  }

  createExecution(data: Omit<WorkflowExecution, 'id'>): WorkflowExecution {
    const post = data.postId ? this.getPostById(data.postId) : undefined;
    const brand = data.brandId ? this.getBrandById(data.brandId) : undefined;

    const newExecution: WorkflowExecution = {
      ...data,
      postTitle: data.postTitle || post?.title,
      brandName: data.brandName || brand?.name,
      id: this.executions.length + 1,
    };
    this.executions.unshift(newExecution);

    // Update workflow stats
    const wf = this.getWorkflowByN8nId(data.n8nWorkflowId);
    if (wf) {
      wf.lastExecutedAt = newExecution.startedAt;
      wf.lastResultStatus = newExecution.status;
      if (newExecution.status === 'success') {
        wf.successCount += 1;
      } else if (newExecution.status === 'failed') {
        wf.failureCount += 1;
      }
    }

    return newExecution;
  }

  // Analytics Overview
  getAnalyticsOverview(): AnalyticsOverview {
    const scheduled = this.posts.filter(p => p.publishingStatus === 'scheduled').length;
    const published = this.posts.filter(p => p.publishingStatus === 'published').length;
    const pending = this.posts.filter(p => p.approvalStatus === 'in_review').length;
    const rejected = this.posts.filter(p => p.approvalStatus === 'rejected').length;
    const failed = this.executions.filter(e => e.status === 'failed').length;

    const publishedByPlatform: Record<SocialPlatform, number> = {
      facebook: 0,
      instagram: 0,
      linkedin: 0,
      x: 0,
      youtube: 0,
      whatsapp: 0,
    };

    // Calculate real dynamic platform counts from published posts
    this.posts.forEach(p => {
      if (p.publishingStatus === 'published') {
        p.platforms.forEach(pl => {
          if (pl.publishingStatus === 'success' && publishedByPlatform[pl.platform] !== undefined) {
            publishedByPlatform[pl.platform] += 1;
          }
        });
      }
    });

    const approvalBreakdown: Record<ApprovalStatus, number> = {
      draft: this.posts.filter(p => p.approvalStatus === 'draft').length,
      in_review: pending,
      revision_requested: this.posts.filter(p => p.approvalStatus === 'revision_requested').length,
      approved: this.posts.filter(p => p.approvalStatus === 'approved').length,
      rejected,
      overdue: 0,
    };

    // Dynamic engagement and impressions reflecting actual live published counts
    const totalEngagement = published > 0 ? published * 240 : 0;
    const totalImpressions = published > 0 ? published * 1850 : 0;
    const totalReach = published > 0 ? published * 1200 : 0;
    const engagementRate = totalReach > 0 ? +((totalEngagement / totalReach) * 100).toFixed(1) : 0;

    // Calculate per-brand breakdown report
    const brandBreakdown = this.brands.map(brand => {
      const brandPosts = this.posts.filter(p => p.brandId === brand.id && p.publishingStatus === 'published');
      const count = brandPosts.length;
      return {
        brandId: brand.id,
        brandName: brand.name,
        brandSlug: brand.slug,
        publishedCount: count,
        engagement: count > 0 ? count * 240 : 0,
        impressions: count > 0 ? count * 1850 : 0,
        reach: count > 0 ? count * 1200 : 0,
      };
    });

    return {
      totalScheduledPosts: scheduled,
      totalPublishedPosts: published,
      pendingApprovals: pending,
      rejectedPosts: rejected,
      failedAutomations: failed,
      activeWorkflows: this.workflows.filter(w => w.isActive).length,
      connectedPlatforms: this.socialAccounts.filter(a => a.connectionStatus === 'connected').length,
      totalEngagement,
      totalImpressions,
      totalReach,
      engagementRate,
      publishedByPlatform,
      approvalBreakdown,
      brandBreakdown,
    };
  }

  // Notifications
  getNotifications(userId: number): InAppNotification[] {
    return this.notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  markNotificationRead(id: number): boolean {
    const notif = this.notifications.find(n => n.id === id);
    if (!notif) return false;
    notif.isRead = true;
    return true;
  }

  // Audit Logs
  getAuditLogs(): AuditLogEntry[] {
    return [...this.auditLogs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  logAudit(entry: Omit<AuditLogEntry, 'id' | 'createdAt'>): AuditLogEntry {
    const user = entry.userId ? this.getUserById(entry.userId) : undefined;
    const newEntry: AuditLogEntry = {
      ...entry,
      id: this.auditLogs.length + 1,
      userEmail: user?.email || entry.userEmail,
      createdAt: new Date().toISOString(),
    };
    this.auditLogs.unshift(newEntry);
    return newEntry;
  }
}

export const db = new DatabaseRepository();
