import React, { useState } from 'react';
import {
  Calendar,
  Send,
  Clock,
  AlertTriangle,
  XCircle,
  Cpu,
  Share2,
  TrendingUp,
  ArrowUpRight,
  ExternalLink,
  Play,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  Facebook,
  Instagram,
  Info,
  Layers,
  RotateCw
} from 'lucide-react';
import { AnalyticsOverview, Post, WorkflowExecution, SocialAccount, RoleName } from '../../../server/src/types';
import { formatISTDateTime, formatISTShort } from '../../utils/timezone';
import { isTabAllowed, getRolePermissions } from '../../utils/rbac';

interface OverviewDashboardProps {
  analytics: AnalyticsOverview;
  recentPosts: Post[];
  recentExecutions: WorkflowExecution[];
  socialAccounts: SocialAccount[];
  onNavigateToTab: (tab: string) => void;
  onPublishNow: (postId: number) => void;
  onRefreshNow?: () => void;
  isRefreshing?: boolean;
  autoRefreshSec?: number;
  onToggleAutoRefreshSec?: (sec: number) => void;
  lastRefreshedAt?: Date;
  currentRole?: RoleName;
}

interface PlacementDetail {
  platform: string;
  placement: string;
  status: 'posted' | 'unsupported' | 'failed' | 'rate_limit';
  message: string;
}

function extractPlacementDetails(post: Post): PlacementDetail[] {
  const details: PlacementDetail[] = [];
  const platforms = (post as any).platforms || [];

  for (const plat of platforms) {
    const rawMsg = plat.errorMessage || '';
    if (!rawMsg) continue;

    // Check if message is multi-placement formatted (e.g. FEED: ... | STORY: ...)
    const chunks = rawMsg.split(/[|;]/).map((s: string) => s.trim()).filter(Boolean);
    for (const chunk of chunks) {
      const match = chunk.match(/^(FEED|STORY|REELS_SHORTS|REEL):\s*(POSTED|UNSUPPORTED|FAILED|FAILED_RETRYABLE)(.*)$/i);
      if (match) {
        const type = match[1].toUpperCase();
        const placementName = type === 'STORY' ? 'Story' : type.includes('REEL') ? 'Reels' : 'Feed';
        const outcome = match[2].toUpperCase();
        let status: 'posted' | 'unsupported' | 'failed' | 'rate_limit' = 'failed';
        if (outcome === 'POSTED') status = 'posted';
        else if (outcome === 'UNSUPPORTED') status = 'unsupported';
        else if (chunk.toLowerCase().includes('rate limit') || chunk.toLowerCase().includes('request limit')) status = 'rate_limit';
        else status = 'failed';

        let cleanText = (match[3] || '').trim();
        cleanText = cleanText.replace(/^[\[\(]\s*/, '').replace(/\s*[\]\)]$/, '');

        details.push({
          platform: plat.platform,
          placement: placementName,
          status,
          message: cleanText || `${plat.platform} ${placementName} ${outcome.toLowerCase()}`
        });
      }
    }
  }

  // Fallback if no structured regex matches found but errorMessage exists
  if (details.length === 0 && (post as any).errorMessage) {
    const raw = (post as any).errorMessage;
    details.push({
      platform: 'Meta',
      placement: 'Diagnostics',
      status: raw.toLowerCase().includes('limit') ? 'rate_limit' : 'failed',
      message: raw
    });
  }

  return details;
}

function getLiveUrlsList(post: Post) {
  const list: { platform: string; label: string; url: string }[] = [];
  post.platforms?.forEach(plat => {
    const rawUrl = plat.platformPostUrl || (plat as any).publishedUrl;
    if (!rawUrl) return;
    const urls = String(rawUrl).split(' | ');
    urls.forEach((url: string) => {
      const isStory = url.includes('/stories/');
      const isReel = url.includes('/reel') || url.includes('/watch');
      const label = isStory ? 'Story' : isReel ? 'Reel' : 'Feed';
      list.push({ platform: plat.platform.toLowerCase(), label, url });
    });
  });
  return list;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  analytics,
  recentPosts,
  recentExecutions,
  socialAccounts,
  onNavigateToTab,
  onPublishNow,
  onRefreshNow,
  isRefreshing = false,
  autoRefreshSec = 5,
  onToggleAutoRefreshSec,
  lastRefreshedAt,
  currentRole = 'Super Admin',
}) => {
  const permissions = getRolePermissions(currentRole);
  const [contentFilter, setContentFilter] = useState<'all' | 'scheduled' | 'calendar' | 'published'>('all');
  const [selectedAuditPost, setSelectedAuditPost] = useState<Post | null>(null);
  const scheduledPosts = recentPosts.filter(p => p.publishingStatus === 'scheduled');
  const publishedPosts = recentPosts.filter(p => p.publishingStatus === 'published');
  const calendarPosts = recentPosts.filter(p => (p as any).source === 'calendar' || p.publishingStatus === 'scheduled');
  const pendingPosts = recentPosts.filter(p => p.approvalStatus === 'in_review');

  const displayedPosts = recentPosts.filter(p => {
    if (contentFilter === 'scheduled') return p.publishingStatus === 'scheduled';
    if (contentFilter === 'published') return p.publishingStatus === 'published';
    if (contentFilter === 'calendar') return (p as any).source === 'calendar' || p.publishingStatus === 'scheduled';
    return true;
  });

  const KPI_CARDS = [
    {
      label: 'Posts Scheduled',
      value: analytics.totalScheduledPosts ?? scheduledPosts.length,
      sub: 'Upcoming queues',
      icon: Calendar,
      color: 'text-[#1336E8]',
      bg: 'bg-[#EFF8FF]',
      border: 'border-[#B2DDFF]',
      targetTab: 'calendar',
    },
    {
      label: 'Posts Published',
      value: analytics.totalPublishedPosts,
      sub: 'Lifetime live posts',
      icon: Send,
      color: 'text-[#12B76A]',
      bg: 'bg-[#ECFDF3]',
      border: 'border-[#A6F4C5]',
      targetTab: 'published',
    },
    {
      label: 'Pending Approvals',
      value: analytics.pendingApprovals,
      sub: 'Requires action',
      icon: Clock,
      color: 'text-[#F79009]',
      bg: 'bg-[#FEF0C7]',
      border: 'border-[#FEDF89]',
      targetTab: 'approvals',
    },
    {
      label: 'Rejected Posts',
      value: analytics.rejectedPosts,
      sub: 'Needs revision',
      icon: XCircle,
      color: 'text-[#F04438]',
      bg: 'bg-[#FEF3F2]',
      border: 'border-[#FECDCA]',
      targetTab: 'content',
    },
    {
      label: 'Failed Automations',
      value: analytics.failedAutomations,
      sub: 'Requires retry',
      icon: AlertTriangle,
      color: 'text-[#F04438]',
      bg: 'bg-[#FEF3F2]',
      border: 'border-[#FECDCA]',
      targetTab: 'executions',
    },
    {
      label: 'Active n8n Workflows',
      value: analytics.activeWorkflows,
      sub: 'Live webhooks',
      icon: Cpu,
      color: 'text-[#1336E8]',
      bg: 'bg-[#EFF8FF]',
      border: 'border-[#B2DDFF]',
      targetTab: 'automations',
    },
    {
      label: 'Connected Platforms',
      value: analytics.connectedPlatforms,
      sub: 'OAuth channels',
      icon: Share2,
      color: 'text-[#08C5E1]',
      bg: 'bg-[#E0F2FE]',
      border: 'border-[#BAE6FD]',
      targetTab: 'accounts',
    },
    {
      label: 'Total Engagement',
      value: (analytics.totalEngagement || 0).toLocaleString(),
      sub: `${analytics.engagementRate}% rate`,
      icon: TrendingUp,
      color: 'text-[#12B76A]',
      bg: 'bg-[#ECFDF3]',
      border: 'border-[#A6F4C5]',
      targetTab: 'analytics',
    },
  ];

  const visibleKpiCards = KPI_CARDS.filter(kpi => isTabAllowed(kpi.targetTab as any, currentRole));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Real-time Live Synchronization Command Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:px-4 sm:py-3 bg-white rounded-2xl border border-[#EAECF0] shadow-xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Sync Active</span>
          </div>
          <span className="text-xs text-[#667085] hidden sm:inline">•</span>
          <span className="text-xs text-[#667085] font-mono">Asia/Kolkata (IST)</span>
          <span className="text-xs text-[#667085] hidden md:inline">•</span>
          <span className="text-xs text-[#667085] hidden md:inline">
            Last synced:{' '}
            <span className="font-semibold text-[#101828]">
              {lastRefreshedAt
                ? lastRefreshedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
                : 'Just now'}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Auto-Refresh Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-[#344054]">
            <span className="text-[#667085] text-[11px] hidden sm:inline">Auto-refresh:</span>
            <select
              value={autoRefreshSec ?? 5}
              onChange={e => onToggleAutoRefreshSec?.(Number(e.target.value))}
              className="h-8 pl-2 pr-6 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs font-semibold text-[#101828] focus:outline-none focus:border-[#1336E8] cursor-pointer"
            >
              <option value="5">Every 5s (Live)</option>
              <option value="10">Every 10s</option>
              <option value="30">Every 30s</option>
              <option value="60">Every 60s</option>
              <option value="0">Off (Manual)</option>
            </select>
          </div>

          {/* Manual Refresh Button */}
          <button
            type="button"
            onClick={() => onRefreshNow?.()}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D0D5DD] bg-[#F6F8FC] hover:bg-[#EFF8FF] text-xs font-semibold text-[#1336E8] transition-all cursor-pointer shadow-xs disabled:opacity-60"
            title="Refresh dashboard metrics now"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#1336E8]' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Permitted KPI Cards Grid - ALL CARDS DYNAMICALLY FILTERED BY ROLE */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {visibleKpiCards.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onNavigateToTab(kpi.targetTab)}
              className="bg-white p-4 sm:p-5 rounded-2xl border border-[#EAECF0] shadow-sm hover:shadow-lg hover:border-[#1336E8]/40 hover:-translate-y-0.5 transition-all space-y-3 text-left group cursor-pointer w-full focus:outline-none focus:ring-2 focus:ring-[#1336E8]/20"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#667085] group-hover:text-[#1336E8] transition-colors line-clamp-1">{kpi.label}</span>
                <div className={`w-8 h-8 rounded-xl ${kpi.bg} ${kpi.color} group-hover:scale-110 transition-transform flex items-center justify-center shrink-0 shadow-sm`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#101828] font-mono tracking-tight group-hover:text-[#1336E8] transition-colors">
                  {kpi.value}
                </div>
                <div className="text-[11px] text-[#667085] mt-0.5 flex items-center justify-between">
                  <span>{kpi.sub}</span>
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#1336E8]" />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 2-Column Section: Publishing Activity & Platform Health */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scheduled Posts & Pending Approvals */}
        <div className="lg:col-span-8 space-y-6">
          {/* Live Content & Automation Queue - Single Card with Internal Scrolling */}
          <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-sm p-5 sm:p-6 space-y-4">
            {/* Header: Professional Single-Word Heading, Icon & Total Number */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#EAECF0] pb-4 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-[#101828]">Queue</h3>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-mono font-bold">
                    {displayedPosts.length}
                  </span>
                </div>
              </div>

              {/* Filters & Navigation - Icon Only */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center p-1 bg-[#F2F4F7] rounded-xl text-xs font-semibold gap-0.5">
                  <button
                    onClick={() => setContentFilter('all')}
                    title={`All (${recentPosts.length})`}
                    className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      contentFilter === 'all'
                        ? 'bg-white text-indigo-700 shadow-sm font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span className="font-mono text-xs font-bold">{recentPosts.length}</span>
                  </button>

                  <button
                    onClick={() => setContentFilter('scheduled')}
                    title={`Scheduled (${scheduledPosts.length})`}
                    className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      contentFilter === 'scheduled'
                        ? 'bg-white text-indigo-700 shadow-sm font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span className="font-mono text-xs font-bold">{scheduledPosts.length}</span>
                  </button>

                  <button
                    onClick={() => setContentFilter('calendar')}
                    title={`Calendar (${calendarPosts.length})`}
                    className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      contentFilter === 'calendar'
                        ? 'bg-white text-indigo-700 shadow-sm font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span className="font-mono text-xs font-bold">{calendarPosts.length}</span>
                  </button>

                  <button
                    onClick={() => setContentFilter('published')}
                    title={`Live (${publishedPosts.length})`}
                    className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      contentFilter === 'published'
                        ? 'bg-white text-emerald-700 shadow-sm font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-mono text-xs font-bold">{publishedPosts.length}</span>
                  </button>
                </div>

                <button
                  onClick={() => onNavigateToTab('calendar')}
                  title="Open Calendar"
                  className="p-2 rounded-xl bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 transition-all shadow-xs flex items-center justify-center shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Feed Container */}
            <div className="max-h-[640px] overflow-y-auto pr-1.5 space-y-3.5 scroll-smooth">
              {displayedPosts.length > 0 ? (
                displayedPosts.map((post, postIdx) => {
                  const placementDetails = (((post.publishingStatus as any) === 'partial' || post.publishingStatus === 'partially_published') || post.publishingStatus === 'failed')
                    ? extractPlacementDetails(post)
                    : [];
                  const liveLinks = getLiveUrlsList(post);
                  const itemNumber = String(postIdx + 1).padStart(2, '0');

                  return (
                    <div
                      key={post.id}
                      className="group p-5 rounded-2xl border border-slate-200/90 hover:border-indigo-200 bg-white hover:bg-[#FAFBFD] transition-all duration-200 shadow-xs hover:shadow-sm space-y-3.5"
                    >
                      {/* Top Header Bar */}
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        {/* Number, Brand & Platform Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-mono font-bold border border-slate-200">
                            #{itemNumber}
                          </span>

                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                            <span>{post.brandName || 'Flower plant'}</span>
                          </span>

                          {post.platforms && post.platforms.length > 0 ? (
                            post.platforms.map((plat, idx) => {
                              const isFb = plat.platform.toLowerCase() === 'facebook';
                              const isIg = plat.platform.toLowerCase() === 'instagram';
                              return (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                                    isFb
                                      ? 'bg-blue-50/80 text-blue-700 border-blue-200/80'
                                      : isIg
                                      ? 'bg-pink-50/80 text-pink-700 border-pink-200/80'
                                      : 'bg-slate-100 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {isFb && <Facebook className="w-3 h-3 text-blue-600" />}
                                  {isIg && <Instagram className="w-3 h-3 text-pink-600" />}
                                  <span className="capitalize">{plat.platform}</span>
                                </span>
                              );
                            })
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50/80 text-blue-700 border border-blue-200/80 text-xs font-semibold">
                              <Facebook className="w-3 h-3 text-blue-600" />
                              <span>Facebook</span>
                            </span>
                          )}

                          {(post as any).source === 'calendar' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 text-xs font-semibold">
                              <Calendar className="w-3 h-3 text-purple-600" />
                              <span>Calendar</span>
                            </span>
                          )}
                        </div>

                        {/* Status Badge & IST Time */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                              post.publishingStatus === 'published'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : ((post.publishingStatus as any) === 'partial' || post.publishingStatus === 'partially_published')
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : post.publishingStatus === 'failed'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : ((post.publishingStatus as any) === 'publishing' || post.publishingStatus === 'processing')
                                ? 'bg-sky-50 text-sky-700 border-sky-200 animate-pulse'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {post.publishingStatus === 'published' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                            {((post.publishingStatus as any) === 'partial' || post.publishingStatus === 'partially_published') && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                            {post.publishingStatus === 'failed' && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                            <span>
                              {post.publishingStatus === 'published'
                                ? 'Live'
                                : ((post.publishingStatus as any) === 'partial' || post.publishingStatus === 'partially_published')
                                ? 'Partial'
                                : post.publishingStatus === 'failed'
                                ? 'Failed'
                                : ((post.publishingStatus as any) === 'publishing' || post.publishingStatus === 'processing')
                                ? 'Publishing'
                                : 'Scheduled'}
                            </span>
                          </span>

                          <span className="text-xs font-medium text-slate-500 flex items-center gap-1 pl-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{post.scheduledAt ? formatISTShort(post.scheduledAt) : 'Pending'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {post.title}
                        </h4>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {post.masterCaption}
                        </p>
                      </div>

                      {/* Structured Placement Diagnostics (if Partial or Failed) */}
                      {placementDetails.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-2.5">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>Diagnostics</span>
                            </div>
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                              Meta API
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {placementDetails.map((detail, dIdx) => {
                              const isSuccess = detail.status === 'posted';
                              const isUnsupported = detail.status === 'unsupported';
                              const isRateLimit = detail.status === 'rate_limit';

                              return (
                                <div
                                  key={dIdx}
                                  className={`p-2.5 rounded-xl text-xs border flex items-start gap-2.5 transition-colors ${
                                    isSuccess
                                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                                      : isUnsupported
                                      ? 'bg-sky-50/70 border-sky-200 text-sky-950'
                                      : isRateLimit
                                      ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                                      : 'bg-rose-50/70 border-rose-200 text-rose-950'
                                  }`}
                                >
                                  <div className="mt-0.5 shrink-0">
                                    {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                                    {isUnsupported && <Info className="w-4 h-4 text-sky-600" />}
                                    {isRateLimit && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                                    {!isSuccess && !isUnsupported && !isRateLimit && <XCircle className="w-4 h-4 text-rose-600" />}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-1.5 mb-0.5">
                                      <span className="font-bold text-xs capitalize">
                                        {detail.placement}
                                      </span>
                                      <span
                                        className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                          isSuccess
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : isUnsupported
                                            ? 'bg-sky-100 text-sky-800'
                                            : isRateLimit
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-rose-100 text-rose-800'
                                        }`}
                                      >
                                        {isSuccess ? 'Live' : isUnsupported ? 'Policy' : isRateLimit ? 'Limited' : 'Failed'}
                                      </span>
                                    </div>
                                    <p className="text-[11px] opacity-85 leading-relaxed line-clamp-2" title={detail.message}>
                                      {detail.message}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Footer Actions & Verified Links Bar */}
                      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Live Destination Links */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {liveLinks.map((link, lIdx) => {
                            const isFb = link.platform === 'facebook';
                            const isIg = link.platform === 'instagram';
                            return (
                              <a
                                key={lIdx}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all shadow-xs ${
                                  isFb
                                    ? 'bg-blue-50/80 hover:bg-blue-100 text-blue-700 border-blue-200/80 hover:border-blue-300'
                                    : isIg
                                    ? 'bg-pink-50/80 hover:bg-pink-100 text-pink-700 border-pink-200/80 hover:border-pink-300'
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {isFb && <Facebook className="w-3.5 h-3.5 text-blue-600" />}
                                {isIg && <Instagram className="w-3.5 h-3.5 text-pink-600" />}
                                <span className="capitalize">{link.label}</span>
                                <ExternalLink className="w-3 h-3 opacity-70" />
                              </a>
                            );
                          })}

                          {liveLinks.length === 0 && (
                            <span className="text-xs text-slate-400 italic">No live destination links</span>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          <button
                            onClick={() => setSelectedAuditPost(post)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-indigo-50/80 text-slate-700 hover:text-indigo-700 text-xs font-semibold rounded-xl border border-slate-200 hover:border-indigo-200 shadow-xs transition-all"
                            title="Open Real-Time Verification & Audit Report"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Audit</span>
                          </button>

                          {post.publishingStatus === 'scheduled' && (
                            <>
                              <button
                                onClick={() => onNavigateToTab('calendar')}
                                title="Open in Calendar"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                              >
                                <Calendar className="w-3 h-3 text-slate-500" />
                                <span className="hidden sm:inline">Calendar</span>
                              </button>
                              <button
                                onClick={() => onPublishNow(post.id)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span>Publish</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs text-[#667085] border border-dashed border-[#EAECF0] rounded-xl">
                  No content found under this filter. Create a post or schedule one in Google Sheets!
                </div>
              )}
            </div>
          </div>

          {/* Recent Executions Widget - Only rendered if role has execution permissions */}
          {isTabAllowed('executions', currentRole) && (
            <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#EAECF0] pb-4">
                <div>
                  <h3 className="text-base font-bold text-[#101828]">Recent n8n Automation Executions</h3>
                  <p className="text-xs text-[#667085] mt-0.5">Real-time status updates from n8n (IST · Asia/Kolkata)</p>
                </div>
                <button
                  onClick={() => onNavigateToTab('executions')}
                  className="text-xs font-semibold text-[#1336E8] hover:underline flex items-center gap-1"
                >
                  <span>All Executions</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-[#EAECF0]">
                {recentExecutions.slice(0, 4).map(exec => (
                  <div key={exec.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          exec.status === 'success'
                            ? 'bg-[#ECFDF3] text-[#12B76A]'
                            : exec.status === 'failed'
                            ? 'bg-[#FEF3F2] text-[#F04438]'
                            : 'bg-[#EFF8FF] text-[#1336E8]'
                        }`}
                      >
                        {exec.status === 'success' ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <AlertCircle className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-[#101828] truncate">{exec.workflowName}</div>
                        <div className="text-[11px] font-mono text-[#667085] truncate">
                          ID: {exec.executionId} · {exec.startedAtIst || formatISTDateTime(exec.startedAt)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                          exec.status === 'success'
                            ? 'bg-[#ECFDF3] text-[#027A48]'
                            : 'bg-[#FEF3F2] text-[#B42318]'
                        }`}
                      >
                        {exec.status}
                      </span>
                      <span className="block text-[10px] font-mono text-[#667085] mt-0.5">
                        {exec.durationMs ? `${exec.durationMs}ms` : '420ms'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Platform Health & Posts by Channel */}
        <div className="lg:col-span-4 space-y-6">
          {/* Platform Connection Health */}
          <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#101828]">Social Platform Health</h3>
              {isTabAllowed('accounts', currentRole) && (
                <button
                  onClick={() => onNavigateToTab('accounts')}
                  className="text-xs font-semibold text-[#1336E8] hover:underline cursor-pointer"
                >
                  View All
                </button>
              )}
            </div>
            <div className="space-y-3">
              {socialAccounts.map(acc => (
                <div
                  key={acc.id}
                  onClick={isTabAllowed('accounts', currentRole) ? () => onNavigateToTab('accounts') : undefined}
                  className={`flex items-center justify-between p-3 rounded-xl bg-[#F6F8FC] border border-[#EAECF0] transition-all ${
                    isTabAllowed('accounts', currentRole) ? 'hover:border-[#B2DDFF] hover:bg-white hover:shadow-sm cursor-pointer' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white border border-[#D0D5DD] flex items-center justify-center font-bold text-xs uppercase text-[#1336E8] shrink-0 shadow-sm">
                      {acc.platform.substring(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#101828] truncate">{acc.accountName}</div>
                      <div className="text-[10px] text-[#667085] truncate">{acc.accountHandle || acc.platform}</div>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 border ${
                    acc.connectionStatus === 'connected'
                      ? 'bg-[#ECFDF3] text-[#12B76A] border-[#A6F4C5]'
                      : 'bg-[#F2F4F7] text-[#667085] border-[#EAECF0]'
                  }`}>
                    {acc.connectionStatus}
                  </span>
                </div>
              ))}
            </div>
            {isTabAllowed('accounts', currentRole) && (
              <button
                onClick={() => onNavigateToTab('accounts')}
                className="w-full py-2 text-xs font-semibold text-[#1336E8] hover:bg-[#EFF8FF] rounded-xl transition-colors text-center cursor-pointer"
              >
                Manage Social Connections
              </button>
            )}
          </div>

          {/* Posts by Platform Breakdown */}
          <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-[#101828]">Posts by Platform</h3>
            <div className="space-y-3">
              {Object.entries(
                analytics?.publishedByPlatform || {
                  facebook: 0,
                  instagram: 0,
                  youtube: 0,
                  whatsapp: 0,
                  linkedin: 0,
                  x: 0,
                }
              ).map(([plat, count]) => {
                const percentage = Math.round(((count as number) / (analytics?.totalPublishedPosts || 1)) * 100);
                return (
                  <div key={plat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="capitalize font-medium text-[#344054]">{plat}</span>
                      <span className="font-mono text-[#101828] font-bold">{count as number} posts</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#EAECF0] overflow-hidden">
                      <div
                        className="h-full bg-[#1336E8] rounded-full transition-all"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* REAL-TIME VERIFICATION & AUDIT REPORT MODAL */}
      {selectedAuditPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#EAECF0] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    selectedAuditPost.publishingStatus === 'published' ? 'bg-[#ECFDF3] text-[#027A48]' :
                    ((selectedAuditPost.publishingStatus as any) === 'partial' || selectedAuditPost.publishingStatus === 'partially_published') ? 'bg-[#FEF0C7] text-[#B54708] border border-[#FEE4E2]' :
                    selectedAuditPost.publishingStatus === 'failed' ? 'bg-[#FEF3F2] text-[#B42318]' :
                    'bg-[#D1E9FF] text-[#175CD3]'
                  }`}>
                    {selectedAuditPost.publishingStatus === 'published' ? '● Verified Live Published' :
                     ((selectedAuditPost.publishingStatus as any) === 'partial' || selectedAuditPost.publishingStatus === 'partially_published') ? '⚠ Partial Publish (With Warnings)' :
                     selectedAuditPost.publishingStatus === 'failed' ? '✕ Failed / Rejected by Platform' :
                     selectedAuditPost.publishingStatus}
                  </span>
                  <span className="text-xs font-mono text-[#667085] bg-slate-100 px-2 py-0.5 rounded-md">
                    POST-{selectedAuditPost.id}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#101828] mt-2">{selectedAuditPost.title}</h3>
                <p className="text-xs text-[#667085] mt-0.5">
                  Brand: <span className="font-semibold text-[#101828]">{selectedAuditPost.brandName}</span> • Timezone: <span className="font-mono text-[#101828]">Asia/Kolkata (IST)</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedAuditPost(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Error / Warning Notice if Partial or Failed */}
            {(selectedAuditPost as any).errorMessage && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Platform Execution Report & Rejection Breakdown:</span>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed font-mono bg-white/70 p-2.5 rounded-xl border border-amber-100">
                  {(selectedAuditPost as any).errorMessage}
                </p>
              </div>
            )}

            {/* Platform & Placements Audit Matrix */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#344054]">
                Target Matrix & Meta Verification Breakdown
              </h4>
              <div className="space-y-2.5">
                {selectedAuditPost.platforms?.map((plat: any, idx: number) => {
                  const urls = plat.publishedUrl ? plat.publishedUrl.split(' | ') : [];
                  const ids = plat.platformPostId ? plat.platformPostId.split(',') : [];
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl border border-[#EAECF0] bg-[#F8FAFC] space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#101828] capitalize">{plat.platform}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            plat.publishingStatus === 'Posted' ? 'bg-[#ECFDF3] text-[#027A48]' :
                            plat.publishingStatus === 'NeedsVerification' ? 'bg-[#FEF0C7] text-[#B54708]' :
                            plat.publishingStatus === 'Failed' ? 'bg-[#FEF3F2] text-[#B42318]' :
                            'bg-[#D1E9FF] text-[#175CD3]'
                          }`}>
                            {plat.publishingStatus}
                          </span>
                        </div>
                        {plat.errorCode && (
                          <span className="text-[10px] font-mono text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                            {plat.errorCode}
                          </span>
                        )}
                      </div>

                      {/* Live Links */}
                      {urls.length > 0 ? (
                        <div className="space-y-1.5 pt-1 border-t border-[#EAECF0]">
                          <span className="text-[11px] font-semibold text-[#344054]">Verified Live Post Links:</span>
                          <div className="flex items-center gap-2 flex-wrap">
                            {urls.map((u: string, uIdx: number) => {
                              const isStory = u.includes('/stories/');
                              const isReel = u.includes('/reel') || u.includes('/watch');
                              const label = isStory ? 'Story' : isReel ? 'Reel / Video' : 'Feed Post';
                              const isFb = plat.platform.toLowerCase() === 'facebook';
                              const isIg = plat.platform.toLowerCase() === 'instagram';
                              return (
                                <a
                                  key={uIdx}
                                  href={u}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl border shadow-xs transition-all ${
                                    isFb
                                      ? 'bg-blue-50/80 hover:bg-blue-100 text-blue-700 border-blue-200'
                                      : isIg
                                      ? 'bg-pink-50/80 hover:bg-pink-100 text-pink-700 border-pink-200'
                                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                                  }`}
                                >
                                  {isFb && <Facebook className="w-3.5 h-3.5 text-blue-600" />}
                                  {isIg && <Instagram className="w-3.5 h-3.5 text-pink-600" />}
                                  <span>Open {label}</span>
                                  <ExternalLink className="w-3 h-3 opacity-70" />
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-[#667085] italic pt-1">
                          No live links registered for this platform target.
                        </div>
                      )}

                      {/* Meta Platform IDs */}
                      {ids.length > 0 && (
                        <div className="text-[11px] font-mono text-[#475467] flex items-center gap-1.5">
                          <span className="text-[#98A2B3]">Platform ID:</span>
                          <span className="font-bold text-[#101828] select-all">{ids.join(', ')}</span>
                        </div>
                      )}

                      {/* Target Specific Error */}
                      {plat.errorMessage && (
                        <div className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                          <span className="font-bold">Error Detail: </span>
                          <span>{plat.errorMessage}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* n8n Orchestrator Integration Callout */}
            <div className="p-4 rounded-2xl bg-[#EFF8FF] border border-[#B2DDFF] space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-[#1336E8]">
                <Cpu className="w-4 h-4" />
                <span>n8n Workflow Orchestrator Integration</span>
              </div>
              <p className="text-[11px] text-[#175CD3] leading-relaxed">
                Post is orchestrated via n8n workflow <code className="font-mono font-bold bg-white/60 px-1.5 py-0.5 rounded">Utaz0U82aZQZ7uHF</code> with dual automated fallback and AES-256 encrypted tokens.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-[#EAECF0]">
              <button
                type="button"
                onClick={() => setSelectedAuditPost(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#344054] text-xs font-semibold rounded-xl transition-colors"
              >
                Close Report
              </button>
              {selectedAuditPost.publishingStatus !== 'published' && (
                <button
                  type="button"
                  onClick={() => {
                    onPublishNow(selectedAuditPost.id);
                    setSelectedAuditPost(null);
                  }}
                  className="px-5 py-2.5 bg-[#1336E8] hover:bg-[#0E27B3] text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Retry Publishing Now</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
