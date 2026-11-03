import type { NavigationTab } from '../../components/layout/Sidebar';
import React from 'react';
import { DateTime } from 'luxon';
import { Calendar, CheckSquare, AlertTriangle, Plus, ArrowRight, RefreshCw, Link2 } from 'lucide-react';
import { AnalyticsOverview, Post, WorkflowExecution, SocialAccount, RoleName } from '../../../server/src/types';
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
const label = (value: string) => value?.replaceAll('_', ' ') || 'Not available';
const formatPostTime = (post: Post) => {
  if (!post.scheduledAt) return 'No time set';
  const value = post.scheduledAt.replace(' ', 'T');
  const time = DateTime.fromISO(value, { zone: 'utc' }).setZone(post.timezone || 'Asia/Kolkata');
  return time.isValid ? time.toFormat('dd LLL, HH:mm') + ' · ' + time.zoneName : 'Time unavailable';
};

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  analytics, recentPosts, recentExecutions, socialAccounts, onNavigateToTab,
  onRefreshNow, isRefreshing = false, autoRefreshSec = 0, onToggleAutoRefreshSec,
  lastRefreshedAt, currentRole = 'Client',
}) => {
  const permissions = getRolePermissions(currentRole);
  const scheduled = recentPosts.filter(p => p.publishingStatus === 'scheduled')
    .sort((a, b) => new Date(a.scheduledAt || 0).getTime() - new Date(b.scheduledAt || 0).getTime());
  const pending = recentPosts.filter(p => ['in_review', 'overdue'].includes(p.approvalStatus));
  const attention = recentPosts.filter(p => ['failed', 'partially_published'].includes(p.publishingStatus) || ['revision_requested', 'overdue'].includes(p.approvalStatus) ||
    p.platforms?.some(target => /unknown|verification|reconcil/i.test(String(target.publishingStatus))));
  const disconnected = socialAccounts.filter(a => a.connectionStatus !== 'connected');
  const canNavigate = (tab: string) => isTabAllowed(tab as NavigationTab, currentRole);
  const cards = [
    { title: 'Upcoming posts', value: scheduled.length, detail: 'Review the publishing calendar', icon: Calendar, tab: 'calendar', tone: 'bg-blue-50 text-blue-700' },
    { title: 'Awaiting review', value: pending.length, detail: 'Approve or request changes', icon: CheckSquare, tab: 'approvals', tone: 'bg-amber-50 text-amber-800' },
    { title: 'Needs attention', value: attention.length, detail: 'Review failed or incomplete posts', icon: AlertTriangle, tab: 'content', tone: 'bg-rose-50 text-rose-800' },
  ];
  const renderPosts = (items: Post[], empty: string) => items.length ? <ul className="divide-y divide-slate-100">{items.slice(0, 5).map(post => <li key={post.id} className="py-3">
    <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold text-slate-900">{post.title}</p><p className="mt-1 text-xs text-slate-600">{post.brandName} · {formatPostTime(post)}</p></div><span className="rounded-full bg-slate-100 px-2 py-1 text-xs capitalize">{label(post.publishingStatus)}</span></div>
    <div className="mt-2 flex flex-wrap gap-2">{post.platforms?.map((target, index) => <span key={target.platform + index} className={'rounded-md px-2 py-1 text-xs capitalize ' + (/failed|unknown|verification/i.test(String(target.publishingStatus)) ? 'bg-amber-50 text-amber-900' : 'bg-slate-50 text-slate-600')}>{target.platform}: {label(String(target.publishingStatus))}</span>)}</div>
    {post.approvalStatus !== 'approved' && <p className="mt-2 text-xs font-medium text-amber-800">Approval: {label(post.approvalStatus)}</p>}
  </li>)}</ul> : <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">{empty}</p>;

  return <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-blue-700">Your workspace</p><h2 className="mt-1 text-2xl font-bold text-slate-900">Keep your publishing day on track</h2><p className="mt-2 text-sm text-slate-600">Review upcoming content, approve work, and resolve delivery issues.</p></div>
      {permissions.canCreatePost && <button type="button" onClick={() => onNavigateToTab('create')} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"><Plus className="h-4 w-4" />Create post</button>}
    </header>
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
      <span role="status">{isRefreshing ? 'Refreshing workspace…' : lastRefreshedAt ? 'Last refreshed ' + lastRefreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Refresh to check current results'}</span>
      {onRefreshNow && <button type="button" disabled={isRefreshing} onClick={onRefreshNow} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 font-medium disabled:opacity-50"><RefreshCw className={'h-3.5 w-3.5 ' + (isRefreshing ? 'animate-spin' : '')} />Refresh</button>}
      {onToggleAutoRefreshSec && <label>Auto refresh <select className="ml-1 rounded-lg border border-slate-300 bg-white p-2" value={autoRefreshSec} onChange={e => onToggleAutoRefreshSec(Number(e.target.value))}><option value={0}>Off</option><option value={5}>Every 5 seconds</option><option value={15}>Every 15 seconds</option><option value={30}>Every 30 seconds</option><option value={60}>Every minute</option></select></label>}
    </div>
    <div className="grid gap-4 sm:grid-cols-3">{cards.map(card => <button type="button" key={card.title} disabled={!canNavigate(card.tab)} onClick={() => onNavigateToTab(card.tab)} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-colors hover:border-blue-300 disabled:cursor-default">
      <div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-600">{card.title}</p><div className={'rounded-xl p-2 ' + card.tone}><card.icon className="h-5 w-5" /></div></div><p className="mt-3 text-3xl font-bold text-slate-900">{card.value}</p><p className="mt-2 text-xs text-slate-600">{card.detail}</p>
    </button>)}</div>
    {!socialAccounts.length && <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5"><h3 className="font-semibold text-blue-950">Start with your first connection</h3><p className="mt-2 text-sm text-blue-900">Connect an eligible social account, then create a draft and submit it for review.</p>{canNavigate('accounts') && <button type="button" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white" onClick={() => onNavigateToTab('accounts')}><Link2 className="h-4 w-4" />Open connections</button>}</section>}
    {disconnected.length > 0 && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h3 className="font-semibold text-amber-950">{disconnected.length} connection{disconnected.length === 1 ? '' : 's'} need attention</h3><p className="mt-2 text-sm text-amber-900">Review affected accounts before their next scheduled post. Reconnecting may require account-owner access.</p>{canNavigate('accounts') && <button type="button" className="mt-3 text-sm font-semibold text-amber-950 underline" onClick={() => onNavigateToTab('accounts')}>Review connections</button>}</section>}
    <div className="grid gap-6 lg:grid-cols-3"><div className="space-y-6 lg:col-span-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5"><header className="mb-4 flex items-center justify-between gap-2"><h3 className="text-base font-semibold">What publishes next</h3>{canNavigate('calendar') && <button type="button" className="inline-flex items-center gap-1 text-sm font-medium text-blue-700" onClick={() => onNavigateToTab('calendar')}>Calendar<ArrowRight className="h-4 w-4" /></button>}</header>{renderPosts(scheduled, 'No upcoming posts. Create a draft and request a publication time.')}</section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5"><header className="mb-4 flex items-center justify-between gap-2"><h3 className="text-base font-semibold">What needs fixing</h3>{canNavigate('content') && <button type="button" className="text-sm font-medium text-blue-700" onClick={() => onNavigateToTab('content')}>Open posts</button>}</header>{renderPosts(attention, 'No failed, partially published, or revision-requested posts in the current workspace data.')}<p className="mt-3 text-xs text-slate-500">Review individual destination outcomes before retrying. Successfully published destinations must not be sent again.</p></section>
    </div><div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5"><header className="mb-4 flex justify-between gap-2"><h3 className="text-base font-semibold">Awaiting approval</h3>{canNavigate('approvals') && <button type="button" className="text-sm font-medium text-blue-700" onClick={() => onNavigateToTab('approvals')}>Review</button>}</header>{pending.length ? <ul className="divide-y divide-slate-100">{pending.slice(0, 5).map(post => <li key={post.id} className="py-3"><p className="text-sm font-semibold">{post.title}</p><p className="mt-1 text-xs text-slate-600">{post.brandName} · {post.assignedApproverName || 'Approver not assigned'}</p><p className="mt-1 text-xs text-slate-500">{formatPostTime(post)}</p></li>)}</ul> : <p className="text-sm text-slate-600">No posts are waiting for approval.</p>}</section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="mb-4 text-base font-semibold">Connected accounts</h3>{socialAccounts.length ? <ul className="space-y-3">{socialAccounts.map(account => <li key={account.id} className="flex items-center justify-between gap-3 text-sm"><div className="min-w-0"><p className="truncate font-medium">{account.accountName}</p><p className="text-xs capitalize text-slate-600">{account.platform}</p></div><span className={'rounded-full px-2 py-1 text-xs capitalize ' + (account.connectionStatus === 'connected' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900')}>{account.connectionStatus}</span></li>)}</ul> : <p className="text-sm text-slate-600">No accounts connected.</p>}<p className="mt-4 text-xs text-slate-500">Status reflects the latest saved connection check.</p></section>
      {canNavigate('analytics') && <section className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="font-semibold">Publishing reports</h3><p className="mt-2 text-sm text-slate-600">{typeof analytics?.totalPublishedPosts === 'number' ? analytics.totalPublishedPosts + ' posts recorded as published.' : 'Publication totals are not available yet.'}</p><button type="button" className="mt-3 text-sm font-medium text-blue-700" onClick={() => onNavigateToTab('analytics')}>Open reports →</button></section>}
    </div></div>
    {permissions.canAccessAutomations && <section className="rounded-2xl border border-slate-200 bg-white p-5"><header className="mb-4 flex justify-between gap-2"><h3 className="text-base font-semibold">Recent automation activity</h3>{canNavigate('executions') && <button type="button" className="text-sm font-medium text-blue-700" onClick={() => onNavigateToTab('executions')}>View activity</button>}</header>{recentExecutions.length ? <ul className="divide-y divide-slate-100">{recentExecutions.slice(0, 5).map(item => <li key={item.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{item.workflowName || 'Automation'}{item.postTitle ? ' · ' + item.postTitle : ''}</span><span className="capitalize text-slate-600">{label(item.status)}{typeof item.durationMs === 'number' ? ' · ' + item.durationMs + ' ms' : ''}</span></li>)}</ul> : <p className="text-sm text-slate-600">No automation executions recorded.</p>}<p className="mt-3 text-xs text-slate-500">A successful automation execution is separate from provider-confirmed publication.</p></section>}
  </div>;
};
