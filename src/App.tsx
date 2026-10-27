/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { api } from './api/client';
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
  RoleName
} from '../server/src/types';
import { Header } from './components/layout/Header';
import { Sidebar, NavigationTab } from './components/layout/Sidebar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { OverviewDashboard } from './features/dashboard/OverviewDashboard';
import { ContentTable } from './features/posts/ContentTable';
import { CreatePostComposer } from './features/posts/CreatePostComposer';
import { ApprovalQueue } from './features/approvals/ApprovalQueue';
import { ContentCalendar } from './features/calendar/ContentCalendar';
import { AutomationsPage } from './features/workflows/AutomationsPage';
import { WorkflowExecutionsPage } from './features/executions/WorkflowExecutionsPage';
import { AnalyticsPage } from './features/analytics/AnalyticsPage';
import { GoogleSheetsSyncPage } from './features/sheets/GoogleSheetsSyncPage';
import { BrandsPage } from './features/brands/BrandsPage';
import { SocialAccountsPage } from './features/accounts/SocialAccountsPage';
import { AuditLogsPage } from './features/audit/AuditLogsPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { TeamPage } from './features/team/TeamPage';
import { N8nDirectLoginPage } from './features/n8n/N8nDirectLoginPage';
import { LoginPage } from './components/auth/LoginPage';
import { LoginModal } from './components/auth/LoginModal';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';
import { isTabAllowed, getRolePermissions } from './utils/rbac';
import { BrandRegistrationPage } from './features/onboarding/BrandRegistrationPage';
import { AIStudioDashboard } from './features/ai-studio/AIStudioDashboard';

const VALID_TABS: NavigationTab[] = [
  'overview',
  'ai-studio',
  'content',
  'calendar',
  'create',
  'approvals',
  'published',
  'brands',
  'accounts',
  'automations',
  'n8n-login',
  'executions',
  'analytics',
  'sheets',
  'team',
  'audit',
  'settings',
  'register',
];

const getInitialTab = (): NavigationTab => {
  if (typeof window !== 'undefined') {
    // 0. Check Query Parameter or Path for Registration Portal (?page=register or /register)
    if (
      window.location.search.includes('register') ||
      window.location.search.includes('onboard') ||
      window.location.pathname.includes('/register') ||
      window.location.pathname.includes('/onboard')
    ) {
      return 'register';
    }

    // 1. Check URL Hash (e.g. #/brands, #/accounts, #register)
    const rawHash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
    if (rawHash) {
      if (rawHash === 'register' || rawHash === 'onboarding' || rawHash === 'join') return 'register';
      if (rawHash === 'ai' || rawHash === 'ai-studio' || rawHash === 'studio' || rawHash === 'neural') return 'ai-studio';
      if (rawHash === 'social' || rawHash === 'social-accounts' || rawHash === 'accounts') return 'accounts';
      if (rawHash === 'brand' || rawHash === 'brands') return 'brands';
      if (rawHash === 'workflow' || rawHash === 'workflows' || rawHash === 'automations' || rawHash === 'canvas') return 'automations';
      if (rawHash === 'execution' || rawHash === 'executions') return 'executions';
      if (rawHash === 'login' || rawHash === 'n8n' || rawHash === 'n8n-login') return 'n8n-login';
      if (rawHash === 'calendar') return 'calendar';
      if (rawHash === 'post' || rawHash === 'posts' || rawHash === 'content') return 'content';
      if (rawHash === 'create' || rawHash === 'compose') return 'create';
      if (rawHash === 'approval' || rawHash === 'approvals' || rawHash === 'queue') return 'approvals';
      if (rawHash === 'published') return 'published';
      if (rawHash === 'analytics' || rawHash === 'report' || rawHash === 'reports') return 'analytics';
      if (rawHash === 'sheet' || rawHash === 'sheets' || rawHash === 'google-sheets') return 'sheets';
      if (rawHash === 'team' || rawHash === 'users' || rawHash === 'rbac') return 'team';
      if (rawHash === 'audit' || rawHash === 'logs' || rawHash === 'audit-logs') return 'audit';
      if (rawHash === 'setting' || rawHash === 'settings') return 'settings';
      if (VALID_TABS.includes(rawHash as NavigationTab)) {
        return rawHash as NavigationTab;
      }
    }

    // 2. Check URL Pathname (e.g. /brands, /accounts)
    const rawPath = window.location.pathname.replace(/^\//, '').trim().toLowerCase();
    if (rawPath) {
      if (rawPath.includes('login') || rawPath.includes('n8n')) return 'n8n-login';
      if (rawPath.includes('automation') || rawPath.includes('workflow')) return 'automations';
      if (rawPath.includes('execution')) return 'executions';
      if (rawPath.includes('brand')) return 'brands';
      if (rawPath.includes('account') || rawPath.includes('social')) return 'accounts';
      if (rawPath.includes('calendar')) return 'calendar';
      if (rawPath.includes('content') || rawPath.includes('post')) return 'content';
      if (rawPath.includes('approval') || rawPath.includes('queue')) return 'approvals';
      if (rawPath.includes('published')) return 'published';
      if (rawPath.includes('analytic') || rawPath.includes('report')) return 'analytics';
      if (rawPath.includes('sheet')) return 'sheets';
      if (rawPath.includes('team') || rawPath.includes('user')) return 'team';
      if (rawPath.includes('audit') || rawPath.includes('log')) return 'audit';
      if (rawPath.includes('setting')) return 'settings';
      if (VALID_TABS.includes(rawPath as NavigationTab)) {
        return rawPath as NavigationTab;
      }
    }

    // 3. Check persistent localStorage so refresh preserves current tab!
    try {
      const savedTab = localStorage.getItem('ci360_active_tab') as NavigationTab;
      if (savedTab && VALID_TABS.includes(savedTab)) {
        return savedTab;
      }
    } catch {}
  }
  return 'overview';
};

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>(getInitialTab);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<RoleName>('Super Admin');
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);

  // Authenticated User State (Loaded strictly from authenticated localStorage session; defaults to null on any new session)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        if (localStorage.getItem('ci360_is_signed_out') === 'true') {
          return null;
        }
        const saved = localStorage.getItem('ci360_auth_user');
        const token = localStorage.getItem('ci360_auth_token');
        if (saved && token) {
          return JSON.parse(saved);
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // High-Precision Real-time Auto-refresh Interval (default 5 seconds, stored in localStorage)
  const [autoRefreshSec, setAutoRefreshSec] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ci360_auto_refresh_sec');
      return saved !== null ? Number(saved) : 5;
    } catch {
      return 5;
    }
  });
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const handleToggleAutoRefreshSec = (sec: number) => {
    setAutoRefreshSec(sec);
    try {
      localStorage.setItem('ci360_auto_refresh_sec', String(sec));
    } catch {}
  };

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await loadInitialData();
      setLastRefreshedAt(new Date());
    } finally {
      setIsManualRefreshing(false);
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setCurrentRole('Client');
    try {
      localStorage.removeItem('ci360_auth_user');
      localStorage.removeItem('ci360_auth_token');
      localStorage.setItem('ci360_is_signed_out', 'true');
    } catch {}
    setIsLoginModalOpen(true);
  };

  const handleLoginSuccess = (user: User, token: string) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
    try {
      localStorage.setItem('ci360_auth_user', JSON.stringify(user));
      localStorage.setItem('ci360_auth_token', token);
      localStorage.removeItem('ci360_is_signed_out');
    } catch {}
    setIsLoginModalOpen(false);
  };

  const handleUpdateCurrentUserImage = async (dataUrl: string) => {
    const active = currentUser || users.find(u => u.id === 1) || users[0];
    if (!active) return;
    try {
      const updated = await api.updateUser(active.id, { avatarUrl: dataUrl });
      setCurrentUser(updated);
      setUsers(prev => prev.map(u => (u.id === active.id ? updated : u)));
      try {
        localStorage.setItem('ci360_auth_user', JSON.stringify(updated));
      } catch {}
    } catch (err) {
      console.error('Failed updating avatar:', err);
    }
  };

  // App Data State
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowMapping[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [commentsMap, setCommentsMap] = useState<Record<number, PostComment[]>>({});
  const [analytics, setAnalytics] = useState<AnalyticsOverview>({
    totalScheduledPosts: 2,
    totalPublishedPosts: 0,
    pendingApprovals: 0,
    rejectedPosts: 0,
    failedAutomations: 0,
    activeWorkflows: 7,
    connectedPlatforms: 2,
    totalEngagement: 0,
    totalImpressions: 0,
    totalReach: 0,
    engagementRate: 0,
    publishedByPlatform: {
      facebook: 0,
      instagram: 0,
      linkedin: 0,
      x: 0,
      youtube: 0,
      whatsapp: 0,
    },
    approvalBreakdown: {
      draft: 0,
      in_review: 0,
      revision_requested: 0,
      approved: 2,
      rejected: 0,
      overdue: 0,
    },
  });

  // Load initial data from Express backend with resilient Promise.allSettled
  const loadInitialData = async () => {
    try {
      const results = await Promise.allSettled([
        api.getPosts(),
        api.getBrands(),
        api.getSocialAccounts(),
        api.getWorkflows(),
        api.getExecutions(),
        api.getAnalyticsOverview(),
        api.getNotifications(),
        api.getAuditLogs(),
        api.getUsers(),
      ]);

      const [
        postsRes,
        brandsRes,
        accountsRes,
        workflowsRes,
        executionsRes,
        analyticsRes,
        notifsRes,
        logsRes,
        usersRes,
      ] = results;

      let currentPosts: Post[] = [];
      if (postsRes.status === 'fulfilled' && Array.isArray(postsRes.value)) {
        setPosts(postsRes.value);
        currentPosts = postsRes.value;
      }
      if (brandsRes.status === 'fulfilled' && Array.isArray(brandsRes.value)) {
        setBrands(brandsRes.value);
      }
      if (accountsRes.status === 'fulfilled' && Array.isArray(accountsRes.value)) {
        setSocialAccounts(accountsRes.value);
      }
      if (workflowsRes.status === 'fulfilled' && Array.isArray(workflowsRes.value)) {
        setWorkflows(workflowsRes.value);
      }
      if (executionsRes.status === 'fulfilled' && Array.isArray(executionsRes.value)) {
        setExecutions(executionsRes.value);
      }
      if (analyticsRes.status === 'fulfilled' && analyticsRes.value) {
        setAnalytics(prev => ({
          ...prev,
          ...analyticsRes.value,
          publishedByPlatform: {
            ...prev.publishedByPlatform,
            ...(analyticsRes.value.publishedByPlatform || {}),
          },
          approvalBreakdown: {
            ...prev.approvalBreakdown,
            ...(analyticsRes.value.approvalBreakdown || {}),
          },
        }));
      }
      if (notifsRes.status === 'fulfilled' && Array.isArray(notifsRes.value)) {
        setNotifications(notifsRes.value);
      }
      if (logsRes.status === 'fulfilled' && Array.isArray(logsRes.value)) {
        setAuditLogs(logsRes.value);
      }
      if (usersRes.status === 'fulfilled' && Array.isArray(usersRes.value)) {
        setUsers(usersRes.value);
        // Synchronize authenticated user profile changes without auto-logging in unauthenticated sessions
        setCurrentUser(prevUser => {
          if (prevUser) {
            const matched = usersRes.value.find(u => u.id === prevUser.id);
            if (matched) {
              setCurrentRole(matched.role);
              return matched;
            }
          }
          return prevUser;
        });
      }

      // Load comments for top posts
      if (currentPosts.length > 0) {
        try {
          const topComments = await api.getPostComments(currentPosts[0].id);
          setCommentsMap(prev => ({ ...prev, [currentPosts[0].id]: topComments }));
        } catch {}
      }
    } catch (err) {
      console.warn('Initial backend fetch warning:', err);
    }
  };

  useEffect(() => {
    // Strictly require authenticated session before fetching dashboard data or starting background streams
    if (!currentUser) return;

    loadInitialData();

    // v2 Server-Sent Events (SSE) live push stream
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/v1/events');
      
      const handleLiveUpdate = () => {
        loadInitialData();
        setLastRefreshedAt(new Date());
      };

      eventSource.addEventListener('target.status_changed', handleLiveUpdate);
      eventSource.addEventListener('post.created', handleLiveUpdate);
      eventSource.addEventListener('post.updated', handleLiveUpdate);
      eventSource.addEventListener('execution.finished', handleLiveUpdate);
      eventSource.addEventListener('sheet.sync_completed', handleLiveUpdate);
      eventSource.addEventListener('account.updated', handleLiveUpdate);
      eventSource.addEventListener('user.updated', handleLiveUpdate);
    } catch (e) {
      console.warn('SSE connection warning:', e);
    }

    // High-frequency live background auto-refresh loop
    let interval: any = null;
    if (autoRefreshSec > 0) {
      interval = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
          loadInitialData().then(() => setLastRefreshedAt(new Date())).catch(() => {});
        }
      }, autoRefreshSec * 1000);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [currentUser, autoRefreshSec]);

  // Handlers for Post Operations
  const handleCreatePost = async (postData: any) => {
    try {
      await api.createPost(postData);
      const [refreshedPosts, refreshedAnalytics] = await Promise.all([
        api.getPosts(),
        api.getAnalyticsOverview(),
      ]);
      setPosts(refreshedPosts);
      setAnalytics(refreshedAnalytics);
      setActiveTab('content');
    } catch (err) {
      console.error('Failed to create post:', err);
    }
  };

  const handleApprovePost = async (postId: number) => {
    try {
      const updated = await api.approvePost(postId);
      setPosts(prev => prev.map(p => (p.id === postId ? updated : p)));
      api.getAnalyticsOverview().then(setAnalytics).catch(() => {});
    } catch (err) {
      console.error('Failed to approve post:', err);
    }
  };

  const handleRejectPost = async (postId: number, reason: string) => {
    try {
      const updated = await api.rejectPost(postId, reason);
      setPosts(prev => prev.map(p => (p.id === postId ? updated : p)));
      api.getAnalyticsOverview().then(setAnalytics).catch(() => {});
    } catch (err) {
      console.error('Failed to reject post:', err);
    }
  };

  const handleRequestRevision = async (postId: number, comments: string) => {
    try {
      const updated = await api.requestRevision(postId, comments);
      setPosts(prev => prev.map(p => (p.id === postId ? updated : p)));
      api.getAnalyticsOverview().then(setAnalytics).catch(() => {});
    } catch (err) {
      console.error('Failed to request revision:', err);
    }
  };

  const handlePublishNow = async (postId: number) => {
    try {
      await api.publishNow(postId);
      const [refreshedPosts, refreshedExecutions, refreshedAnalytics] = await Promise.all([
        api.getPosts(),
        api.getExecutions(),
        api.getAnalyticsOverview(),
      ]);
      setPosts(refreshedPosts);
      setExecutions(refreshedExecutions);
      setAnalytics(refreshedAnalytics);
    } catch (err) {
      console.error('Failed to publish post:', err);
    }
  };

  const handleMultiBrandPublish = async (data: any) => {
    try {
      const response = await api.multiBrandPublish(data);
      const [refreshedPosts, refreshedExecutions, refreshedAnalytics, refreshedLogs] = await Promise.all([
        api.getPosts(),
        api.getExecutions(),
        api.getAnalyticsOverview(),
        api.getAuditLogs(),
      ]);
      setPosts(refreshedPosts);
      setExecutions(refreshedExecutions);
      setAnalytics(refreshedAnalytics);
      setAuditLogs(refreshedLogs);
      return response;
    } catch (err) {
      console.error('Failed to execute multi-brand publish:', err);
      throw err;
    }
  };

  const handleDeletePost = async (postId: number) => {
    try {
      await api.deletePost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      api.getAnalyticsOverview().then(setAnalytics).catch(() => {});
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  const handleAddComment = async (postId: number, text: string) => {
    try {
      const newComment = await api.addPostComment(postId, text, 1);
      setCommentsMap(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment],
      }));
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const handleExecuteWorkflow = async (workflowId: number) => {
    try {
      await api.executeWorkflow(workflowId);
      const refreshedExecutions = await api.getExecutions();
      setExecutions(refreshedExecutions);
      setActiveTab('executions');
    } catch (err) {
      console.error('Failed to execute workflow:', err);
    }
  };

  const handleRetryExecution = async (executionId: number) => {
    try {
      await api.retryExecution(executionId);
      const refreshedExecutions = await api.getExecutions();
      setExecutions(refreshedExecutions);
    } catch (err) {
      console.error('Failed to retry execution:', err);
    }
  };

  const handleCreateBrand = async (brandData: any) => {
    try {
      const newBrand = await api.createBrand(brandData);
      setBrands(prev => [...prev, newBrand]);
      const refreshedAccounts = await api.getSocialAccounts();
      setSocialAccounts(refreshedAccounts);
    } catch (err) {
      console.error('Failed to create brand:', err);
    }
  };

  const handleUpdateBrand = async (id: number, brandData: any) => {
    try {
      const updated = await api.updateBrand(id, brandData);
      setBrands(prev => prev.map(b => (b.id === id ? updated : b)));
      const refreshedAccounts = await api.getSocialAccounts();
      setSocialAccounts(refreshedAccounts);
    } catch (err) {
      console.error('Failed to update brand:', err);
    }
  };

  const handleDeleteBrand = async (id: number) => {
    try {
      await api.deleteBrand(id);
      setBrands(prev => prev.filter(b => b.id !== id));
      const refreshedAccounts = await api.getSocialAccounts();
      setSocialAccounts(refreshedAccounts);
    } catch (err) {
      console.error('Failed to delete brand:', err);
    }
  };

  // Team Member CRUD handlers
  const handleAddUser = async (userData: {
    fullName: string;
    email: string;
    role: RoleName;
    tenantScope: string;
    isActive: boolean;
    avatarUrl?: string;
  }) => {
    const newUser = await api.createUser(userData);
    setUsers(prev => [...prev, newUser]);
    api.getAuditLogs().then(setAuditLogs).catch(() => {});
  };

  const handleUpdateUser = async (id: number, updates: Partial<User>) => {
    const updated = await api.updateUser(id, updates);
    setUsers(prev => prev.map(u => (u.id === id ? updated : u)));
    if (currentUser && currentUser.id === id) {
      setCurrentUser(updated);
      try {
        localStorage.setItem('ci360_auth_user', JSON.stringify(updated));
      } catch {}
    }
    api.getAuditLogs().then(setAuditLogs).catch(() => {});
  };

  const handleDeleteUser = async (id: number) => {
    await api.deleteUser(id);
    setUsers(prev => prev.filter(u => u.id !== id));
    api.getAuditLogs().then(setAuditLogs).catch(() => {});
  };

  // Dynamic role enforcement: ensure activeTab is always permitted for currentRole with ZERO roadblock screens
  useEffect(() => {
    if (activeTab === 'register') return;
    if (!isTabAllowed(activeTab, currentRole)) {
      const allowed = getRolePermissions(currentRole).allowedTabs;
      const target = allowed.includes('overview') ? 'overview' : (allowed[0] || 'overview');
      setActiveTab(target);
    }
  }, [currentRole, activeTab]);

  const handleTabChange = (tab: NavigationTab) => {
    let targetTab = tab;
    if (tab !== 'register' && !isTabAllowed(tab, currentRole)) {
      const allowed = getRolePermissions(currentRole).allowedTabs;
      targetTab = allowed.includes('overview') ? 'overview' : (allowed[0] || 'overview');
    }
    setActiveTab(targetTab);
    setIsMobileMenuOpen(false);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ci360_active_tab', targetTab);
      } catch {}
      if (window.history) {
        const url = targetTab === 'overview' ? '/' : `/#/${targetTab}`;
        window.history.replaceState(null, '', url);
      }
    }
  };

  // Synchronize with browser navigation (Back/Forward and URL Hash changes)
  useEffect(() => {
    const handleHashOrPopState = () => {
      const current = getInitialTab();
      setActiveTab(current);
    };

    window.addEventListener('hashchange', handleHashOrPopState);
    window.addEventListener('popstate', handleHashOrPopState);

    // Initial check: if current active tab is not overview and no hash in URL, push hash
    if (activeTab !== 'overview' && !window.location.hash) {
      window.history.replaceState(null, '', `/#/${activeTab}`);
    }

    return () => {
      window.removeEventListener('hashchange', handleHashOrPopState);
      window.removeEventListener('popstate', handleHashOrPopState);
    };
  }, []);

  // Persist current active tab to localStorage so any browser refresh stays on the exact same page
  useEffect(() => {
    try {
      localStorage.setItem('ci360_active_tab', activeTab);
      if (typeof window !== 'undefined' && window.history) {
        const url = activeTab === 'overview' ? '/' : `/#/${activeTab}`;
        if (window.location.hash !== `#/${activeTab}` && !(activeTab === 'overview' && !window.location.hash)) {
          window.history.replaceState(null, '', url);
        }
      }
    } catch {}
  }, [activeTab]);

  const pendingApprovalsCount = posts.filter(p => p.approvalStatus === 'in_review').length;

  // Public Brand Registration Portal (Accessible whether logged in or as guest)
  if (activeTab === 'register') {
    return (
      <BrandRegistrationPage
        onRegistrationSuccess={(newUser, newBrand, token) => {
          try {
            localStorage.setItem('ci360_auth_user', JSON.stringify(newUser));
            localStorage.setItem('ci360_auth_token', token);
            localStorage.removeItem('ci360_is_signed_out');
          } catch {}
          setCurrentUser(newUser);
          setCurrentRole(newUser.role);
          setSelectedBrandId(newBrand.id);
          setBrands(prev => [newBrand, ...prev]);
          handleTabChange('overview');
          loadInitialData();
        }}
        onGoHome={() => handleTabChange('overview')}
        onGoToLogin={() => {
          handleTabChange('overview');
          setIsLoginModalOpen(true);
        }}
      />
    );
  }

  // Dedicated Enterprise Login Page: Only authorized ID/IP & password can access the platform
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onNavigateToRegister={() => handleTabChange('register')}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F6F8FC] text-[#101828] font-sans">
      {/* Sidebar Navigation (with Mobile Drawer) */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={handleTabChange}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        pendingApprovalsCount={pendingApprovalsCount}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        currentRole={currentRole}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Sticky Top Header */}
        <Header
          brands={brands}
          selectedBrandId={selectedBrandId}
          onSelectBrand={setSelectedBrandId}
          notifications={notifications}
          currentUser={currentUser}
          currentRole={currentRole}
          onChangeRole={setCurrentRole}
          onOpenN8nStatus={() => handleTabChange('n8n-login')}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          isMobileMenuOpen={isMobileMenuOpen}
          onUpdateCurrentUserImage={handleUpdateCurrentUserImage}
          onOpenChangePassword={() => setIsChangePasswordOpen(true)}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          onOpenRegisterBrand={() => handleTabChange('register')}
          onSignOut={handleSignOut}
        />

        {/* Viewport Workspace */}
        <main className={`flex-1 ${activeTab === 'calendar' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto pb-20 lg:pb-0'}`}>
          {activeTab === 'overview' && (
            <OverviewDashboard
              analytics={analytics}
              recentPosts={posts}
              recentExecutions={executions}
              socialAccounts={socialAccounts}
              onNavigateToTab={tab => handleTabChange(tab as NavigationTab)}
              onPublishNow={handlePublishNow}
              onRefreshNow={handleManualRefresh}
              isRefreshing={isManualRefreshing}
              autoRefreshSec={autoRefreshSec}
              onToggleAutoRefreshSec={handleToggleAutoRefreshSec}
              lastRefreshedAt={lastRefreshedAt}
              currentRole={currentRole}
            />
          )}

          {activeTab === 'ai-studio' && (
            <AIStudioDashboard
              posts={posts}
              brands={brands}
              onNavigateToTab={tab => handleTabChange(tab as NavigationTab)}
            />
          )}

          {activeTab === 'content' && (
                <ContentTable
                  posts={posts}
                  brands={brands}
                  onSelectPost={() => handleTabChange('approvals')}
                  onCreateNew={() => handleTabChange('create')}
                  onApprovePost={handleApprovePost}
                  onRejectPost={handleRejectPost}
                  onRequestRevision={handleRequestRevision}
                  onSubmitPost={() => {}}
                  onPublishNow={handlePublishNow}
                  onDeletePost={handleDeletePost}
                  currentRole={currentRole}
                />
              )}

              {activeTab === 'calendar' && (
                <ContentCalendar
                  posts={posts}
                  brands={brands}
                  onSelectPost={() => handleTabChange('approvals')}
                  onCreatePost={() => handleTabChange('create')}
                  onSchedulePost={async (postData) => {
                    await api.createPost({ ...postData, source: postData.source || 'calendar' });
                    const [refreshedPosts, refreshedAnalytics] = await Promise.all([
                      api.getPosts(),
                      api.getAnalyticsOverview(),
                    ]);
                    setPosts(refreshedPosts);
                    setAnalytics(refreshedAnalytics);
                  }}
                  onUpdatePost={async (postId, updates) => {
                    const updated = await api.updatePost(postId, updates);
                    setPosts(prev => prev.map(p => p.id === postId ? updated : p));
                    api.getAnalyticsOverview().then(setAnalytics).catch(() => {});
                  }}
                  onPublishNow={handlePublishNow}
                  onDeletePost={handleDeletePost}
                />
              )}

              {activeTab === 'create' && (
                <CreatePostComposer
                  brands={brands}
                  onSavePost={handleCreatePost}
                  onCancel={() => handleTabChange('content')}
                  onMultiBrandPublish={handleMultiBrandPublish}
                  onViewExecutions={() => handleTabChange('executions')}
                  onViewAnalytics={() => handleTabChange('analytics')}
                />
              )}

              {activeTab === 'approvals' && (
                <ApprovalQueue
                  posts={posts}
                  commentsMap={commentsMap}
                  onApprove={handleApprovePost}
                  onReject={handleRejectPost}
                  onRequestRevision={handleRequestRevision}
                  onAddComment={handleAddComment}
                  onPublishNow={handlePublishNow}
                  currentRole={currentRole}
                />
              )}

              {activeTab === 'published' && (
                <ContentTable
                  posts={posts.filter(p => p.publishingStatus === 'published')}
                  brands={brands}
                  onSelectPost={() => handleTabChange('approvals')}
                  onCreateNew={() => handleTabChange('create')}
                  onApprovePost={handleApprovePost}
                  onRejectPost={handleRejectPost}
                  onRequestRevision={handleRequestRevision}
                  onSubmitPost={() => {}}
                  onPublishNow={handlePublishNow}
                  onDeletePost={handleDeletePost}
                  currentRole={currentRole}
                />
              )}

              {activeTab === 'brands' && (
                <BrandsPage
                  brands={brands}
                  onCreateBrand={handleCreateBrand}
                  onUpdateBrand={handleUpdateBrand}
                  onDeleteBrand={handleDeleteBrand}
                  currentRole={currentRole}
                />
              )}

              {activeTab === 'accounts' && (
                <SocialAccountsPage
                  accounts={socialAccounts}
                  brands={brands}
                  onRefreshAccounts={loadInitialData}
                  currentRole={currentRole}
                />
              )}

              {activeTab === 'automations' && (
                <AutomationsPage
                  workflows={workflows}
                  onExecuteWorkflow={handleExecuteWorkflow}
                  onTestConnection={() => api.testN8nConnection()}
                  onViewExecutions={() => handleTabChange('executions')}
                  onGoToLogin={() => handleTabChange('n8n-login')}
                />
              )}

              {activeTab === 'n8n-login' && (
                <N8nDirectLoginPage
                  onGoToWorkflows={() => handleTabChange('automations')}
                  onGoToExecutions={() => handleTabChange('executions')}
                />
              )}

              {activeTab === 'executions' && (
                <WorkflowExecutionsPage
                  executions={executions}
                  onRetryExecution={handleRetryExecution}
                />
              )}

              {activeTab === 'analytics' && (
                <AnalyticsPage analytics={analytics} />
              )}

              {activeTab === 'sheets' && (
                <GoogleSheetsSyncPage
                  posts={posts}
                  brands={brands}
                  onTriggerSync={() => api.syncGoogleSheets()}
                />
              )}

              {activeTab === 'team' && (
                <TeamPage
                  users={users}
                  currentRole={currentRole}
                  onAddUser={handleAddUser}
                  onUpdateUser={handleUpdateUser}
                  onDeleteUser={handleDeleteUser}
                />
              )}

              {activeTab === 'audit' && (
                <AuditLogsPage logs={auditLogs} />
              )}

              {activeTab === 'settings' && (
                <SettingsPage />
              )}
        </main>

        {/* Mobile Touch Bottom Navigation */}
        <MobileBottomNav
          activeTab={activeTab}
          onSelectTab={handleTabChange}
          onOpenMenu={() => setIsMobileMenuOpen(true)}
          pendingApprovalsCount={pendingApprovalsCount}
          currentRole={currentRole}
        />
      </div>

      {/* Auth Modals */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        users={users}
        onLoginSuccess={handleLoginSuccess}
        onNavigateToRegister={() => handleTabChange('register')}
      />

      {currentUser && (
        <ChangePasswordModal
          isOpen={isChangePasswordOpen}
          onClose={() => setIsChangePasswordOpen(false)}
          currentUser={currentUser}
          onPasswordChanged={() => {
            loadInitialData();
          }}
        />
      )}
    </div>
  );
}
