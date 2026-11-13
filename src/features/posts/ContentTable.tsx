import React, { useState } from 'react';
import { DateTime } from 'luxon';
import {
  Plus,
  Search,
  ChevronDown,
  AlertCircle,
  Send,
  Calendar,
  Clock,
  ExternalLink,
  Image as ImageIcon,
  Video as VideoIcon,
  Sparkles,
  Zap,
  CheckCircle2,
  X
} from 'lucide-react';
import { Post, Brand, RoleName } from '../../../server/src/types';
import { getRolePermissions } from '../../utils/rbac';
import { MediaThumbnail } from '../../components/media/MediaThumbnail';
import { FailureReportDialog } from './FailureReportDialog';
import { api } from '../../api/client';

interface ContentTableProps {
  posts: Post[];
  brands: Brand[];
  onSelectPost: (post: Post) => void;
  onCreateNew: () => void;
  onApprovePost: (postId: number) => Promise<void> | void;
  onRejectPost: (postId: number, reason: string) => Promise<void> | void;
  onRequestRevision: (postId: number, comments: string) => Promise<void> | void;
  onSubmitPost: (postId: number) => Promise<void> | void;
  onPublishNow: (postId: number) => Promise<void> | void;
  onDeletePost: (postId: number) => Promise<void> | void;
  currentRole?: RoleName;
  onPostUpdated?: (post:Post)=>void;
}
const stateLabel = (state: string) => ({ in_review: 'In review', revision_requested: 'Changes requested', partially_published: 'Partially published', idle: 'Not queued' }[state] || state.replaceAll('_', ' '));
const stateTone = (state: string) => /failed|rejected|partial|overdue|verification/i.test(state) ? 'bg-amber-50 text-amber-900' : /published|approved|success/i.test(state) ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700';
const fieldClass = 'rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm';

export const ContentTable: React.FC<ContentTableProps> = ({
  posts, brands, onSelectPost, onCreateNew, onApprovePost, onRejectPost, onRequestRevision,
  onSubmitPost, onPublishNow, onDeletePost, currentRole = 'Client', onPostUpdated,
}) => {
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('all');
  const [status, setStatus] = useState('all');
  const [platform, setPlatform] = useState('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [failurePost, setFailurePost] = useState<Post | null>(null);

  // Reschedule / Direct Schedule State
  const [reschedulePostId, setReschedulePostId] = useState<number | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('10:00');
  const [rescheduleZone, setRescheduleZone] = useState('Asia/Kolkata');
  const [rescheduleDirect, setRescheduleDirect] = useState(true);

  const permissions = getRolePermissions(currentRole);

  const applyReschedulePreset = (daysOffset: number, fixedHour?: number) => {
    let target = DateTime.now().setZone(rescheduleZone);
    if (fixedHour !== undefined) {
      target = target.plus({ days: daysOffset }).set({ hour: fixedHour, minute: 0, second: 0 });
    } else {
      target = target.plus({ hours: daysOffset });
    }
    setRescheduleDate(target.toISODate() || '');
    setRescheduleTime(target.toFormat('HH:mm'));
  };

  const handleSaveReschedule = async (post: Post) => {
    if (!rescheduleDate || !rescheduleTime) {
      setError('Please choose both a schedule date and time.');
      return;
    }
    const local = `${rescheduleDate}T${rescheduleTime.length === 5 ? rescheduleTime + ':00' : rescheduleTime}`;
    const due = DateTime.fromISO(local, { zone: rescheduleZone });
    if (!due.isValid) {
      setError('Invalid date, time, or timezone.');
      return;
    }
    if (due.toMillis() <= Date.now() + 60000) {
      setError('Scheduled time must be at least 2 minutes in the future.');
      return;
    }

    setBusyId(post.id);
    setError('');
    setNotice('');
    try {
      const updated = await api.updatePost(post.id, {
        versionNumber: post.versionNumber,
        scheduledAt: due.toUTC().toISO()!,
        scheduleDate: rescheduleDate,
        scheduleTime: rescheduleTime,
        timezone: rescheduleZone,
        directSchedule: rescheduleDirect,
        autoApprove: rescheduleDirect,
        skipApproval: rescheduleDirect,
      } as any);
      setReschedulePostId(null);
      setNotice(
        rescheduleDirect
          ? `📅 Post direct scheduled! Pre-approved to publish automatically on ${rescheduleDate} at ${rescheduleTime} (${rescheduleZone}) without requiring approval.`
          : `Post rescheduled for ${rescheduleDate} at ${rescheduleTime} (${rescheduleZone}).`
      );
      if (onPostUpdated && updated) {
        onPostUpdated(updated);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reschedule post.');
    } finally {
      setBusyId(null);
    }
  };
  const filtered = posts.filter(post => {
    const query = search.trim().toLowerCase();
    return (!query || [post.title, post.masterCaption, post.brandName].some(text => (text || '').toLowerCase().includes(query))) &&
      (brand === 'all' || String(post.brandId) === brand) &&
      (status === 'all' || post.approvalStatus === status || post.publishingStatus === status) &&
      (platform === 'all' || post.platforms?.some(target => target.platform === platform));
  });
  const run = async (post: Post, action: () => Promise<void> | void, success: string) => {
    setBusyId(post.id); setError(''); setNotice('');
    try { await action(); setNotice(success); }
    catch (err) { setError(err instanceof Error ? err.message : 'The action failed. Please try again.'); }
    finally { setBusyId(null); }
  };
  const scheduleLabel = (post: Post) => {
    if (!post.scheduledAt) return 'No publication time';
    const date = DateTime.fromISO(post.scheduledAt.replace(' ', 'T'), { zone: 'utc' }).setZone(post.timezone || 'Asia/Kolkata');
    return date.isValid ? date.toFormat('dd LLL yyyy, HH:mm') + ' · ' + date.zoneName : 'Publication time unavailable';
  };

  return <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6 lg:p-8">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-2xl font-bold text-slate-900">Posts</h2><p className="mt-2 text-sm text-slate-600">Follow every post from draft to approval and individual destination results.</p></div>{permissions.canCreatePost && <button type="button" onClick={onCreateNew} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Create post</button>}</header>
    {error && <div role="alert" className="flex gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-800"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}
    {notice && <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">{notice}</p>}
    <section aria-label="Filter posts" className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <label className="min-w-52 flex-1 text-xs font-medium">Search posts<div className="relative mt-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" /><input className={fieldClass + ' w-full pl-9'} value={search} onChange={e => setSearch(e.target.value)} placeholder="Title, caption, or brand" /></div></label>
      <label className="text-xs font-medium">Brand<select className={fieldClass + ' mt-1 block'} value={brand} onChange={e => setBrand(e.target.value)}><option value="all">All brands</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <label className="text-xs font-medium">Channel<select className={fieldClass + ' mt-1 block'} value={platform} onChange={e => setPlatform(e.target.value)}><option value="all">All channels</option>{Array.from(new Set(posts.flatMap(p => p.platforms?.map(t => t.platform) || []))).map(p => <option key={p} value={p}>{p}</option>)}</select></label>
      <label className="text-xs font-medium">Status<select className={fieldClass + ' mt-1 block'} value={status} onChange={e => setStatus(e.target.value)}><option value="all">All statuses</option>{['draft', 'in_review', 'approved', 'revision_requested', 'rejected', 'scheduled', 'processing', 'published', 'partially_published', 'failed', 'cancelled'].map(s => <option key={s} value={s}>{stateLabel(s)}</option>)}</select></label>
    </section>
    <p role="status" className="text-xs text-slate-600">{filtered.length} matching post{filtered.length === 1 ? '' : 's'} · Times use each post's timezone</p>
    <div className="space-y-3">{filtered.map(post => {
      const expanded = expandedId === post.id;
      const busy = busyId === post.id;
      const terminal = ['published', 'partially_published', 'processing'].includes(post.publishingStatus);
      return <article key={post.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <button type="button" aria-expanded={expanded} aria-controls={'post-details-' + post.id} onClick={() => setExpandedId(expanded ? null : post.id)} className="flex w-full flex-wrap items-center gap-4 p-4 text-left hover:bg-slate-50">
          <MediaThumbnail src={post.media?.[0]?.fileUrl} alt={post.title} mediaType={post.media?.[0]?.mediaType} containerClassName="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100" />
          <span className="min-w-40 flex-1"><span className="block text-sm font-semibold text-slate-900">{post.title}</span><span className="mt-1 block text-xs text-slate-600">{post.brandName} · {scheduleLabel(post)}</span></span>
          <span className="flex flex-wrap gap-2"><span className={'rounded-full px-2.5 py-1 text-xs capitalize ' + stateTone(post.approvalStatus)}>{stateLabel(post.approvalStatus)}</span><span className={'rounded-full px-2.5 py-1 text-xs capitalize ' + stateTone(post.publishingStatus)}>{stateLabel(post.publishingStatus)}</span></span>
          <ChevronDown className={'h-4 w-4 text-slate-500 transition-transform ' + (expanded ? 'rotate-180' : '')} />
        </button>
        {expanded && <div id={'post-details-' + post.id} className="space-y-4 border-t border-slate-100 p-4 sm:p-5">
          {/* Visual Media Preview */}
          {post.media?.[0]?.fileUrl && (
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center max-h-96">
              {post.media[0].mediaType === 'video' ? (
                <video
                  src={post.media[0].fileUrl}
                  controls
                  preload="metadata"
                  className="max-h-96 w-full object-contain"
                />
              ) : (
                <img
                  src={post.media[0].fileUrl}
                  alt={post.title}
                  className="max-h-96 w-full object-contain"
                />
              )}
            </div>
          )}

          {/* Details Overview Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">Brand &amp; Target</span>
              <span className="font-semibold text-slate-900">{post.brandName}</span> · <span className="capitalize text-slate-600">{post.placement || 'Feed / Reel'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">Publication Time</span>
              <span className="font-semibold text-slate-900">{scheduleLabel(post)}</span>
            </div>
            {post.hashtags && (
              <div className="col-span-full">
                <span className="font-bold text-slate-500 uppercase tracking-wider block text-[10px]">Hashtags</span>
                <span className="text-blue-700 font-mono text-[11px]">{post.hashtags}</span>
              </div>
            )}
            {post.targetUrl && (
              <div className="col-span-full flex items-center gap-1.5">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Destination Link:</span>
                <a href={post.targetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-semibold flex items-center gap-1">
                  {post.targetUrl} <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-1.5">
            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Post Caption</h4>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{post.masterCaption}</p>
          </div>

          <p className="text-xs text-slate-600">Approver: {post.assignedApproverName || 'Not assigned'} · Version {post.versionNumber}</p>
          
          {/* Destination Accounts */}
          <div className="grid gap-3 sm:grid-cols-2">
            {post.platforms?.map((target, index) => (
              <section key={target.platform + index} className="rounded-xl border border-slate-200 p-3 bg-white">
                <div className="flex justify-between gap-2 text-sm">
                  <h3 className="font-semibold capitalize flex items-center gap-1.5 text-slate-900">
                    {target.platform}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold capitalize ${stateTone(String(target.publishingStatus))}`}>
                    {stateLabel(String(target.publishingStatus))}
                  </span>
                </div>
                {target.captionOverride && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{target.captionOverride}</p>}
                {target.errorMessage && <p className="mt-2 text-sm text-red-700">{target.errorMessage}</p>}
                {String(target.platformPostUrl || (target as any).publishedUrl || '').split(' | ').filter(u => /^https?:\/\//i.test(u)).map(url => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="mt-2 block text-sm text-blue-700 underline font-semibold">
                    Open live post ↗
                  </a>
                ))}
              </section>
            ))}
          </div>

          {['failed', 'partially_published'].includes(post.publishingStatus) && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Review the affected destinations and connection health. Do not republish successful destinations; uncertain outcomes need reconciliation before retrying.</p>
          )}

          {/* Inline Reschedule / Direct Schedule Panel */}
          {reschedulePostId === post.id && (
            <div className="rounded-2xl border-2 border-blue-400 bg-blue-50/50 p-4 sm:p-5 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-700" />
                  <h3 className="text-sm font-bold text-slate-900">Reschedule &amp; Publication Settings</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setReschedulePostId(null)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mode Toggle: Direct Schedule vs Standard Review */}
              <div className="grid grid-cols-2 gap-2 bg-white p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setRescheduleDirect(true)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    rescheduleDirect ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ⚡ Direct Schedule (No Approval Needed)
                </button>
                <button
                  type="button"
                  onClick={() => setRescheduleDirect(false)}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    !rescheduleDirect ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Submit Schedule for Review
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700">Release Date</label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    min={DateTime.now().setZone(rescheduleZone).toISODate() || ''}
                    onChange={e => setRescheduleDate(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700">Release Time</label>
                  <input
                    type="time"
                    value={rescheduleTime}
                    onChange={e => setRescheduleTime(e.target.value)}
                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-700">Timezone</label>
                  <select
                    value={rescheduleZone}
                    onChange={e => setRescheduleZone(e.target.value)}
                    className="w-full h-10 px-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from(new Set([rescheduleZone, post.timezone, 'Asia/Kolkata', 'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Dubai', 'Asia/Singapore'].filter(Boolean))).map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => applyReschedulePreset(1)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:text-blue-700 hover:border-blue-300 cursor-pointer"
                >
                  +1 Hour
                </button>
                <button
                  type="button"
                  onClick={() => applyReschedulePreset(1, 10)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:text-blue-700 hover:border-blue-300 cursor-pointer"
                >
                  Tomorrow 10:00 AM
                </button>
                <button
                  type="button"
                  onClick={() => applyReschedulePreset(1, 18)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:text-blue-700 hover:border-blue-300 cursor-pointer"
                >
                  Tomorrow 06:00 PM
                </button>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleSaveReschedule(post)}
                  className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold cursor-pointer transition-colors shadow-sm disabled:opacity-50"
                >
                  {busy ? 'Saving...' : rescheduleDirect ? 'Confirm & Direct Schedule (Pre-Approved)' : 'Confirm Schedule'}
                </button>
                <button
                  type="button"
                  onClick={() => setReschedulePostId(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            {post.platforms?.some(t=>['failed','needs_reconciliation'].includes(String(t.publishingStatus)))&&<><button type="button" className={fieldClass+' text-blue-700'} onClick={()=>setFailurePost(post)}>Failure details</button>{permissions.canPublishPost&&post.platforms.some(t=>t.publishingStatus==='failed')&&<button type="button" className={fieldClass+' text-blue-700'} onClick={()=>setFailurePost(post)}>Retry failed destinations</button>}</>}
            
            {/* Direct Publish Now (Zero approval delay) */}
            {permissions.canPublishPost && !terminal && (
              <button
                type="button"
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm cursor-pointer transition-colors disabled:opacity-50"
                onClick={() => {
                  if (window.confirm(`🚀 Publish "${post.title}" directly now to live channels? (This bypasses any pending approval)`)) {
                    void run(post, () => onPublishNow(post.id), '🚀 Published directly to live channels! Check results in connected accounts.');
                  }
                }}
              >
                <Send className="h-3.5 w-3.5" />
                🚀 Publish now directly
              </button>
            )}

            {/* Direct Reschedule Button */}
            {!terminal && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3.5 py-2.5 text-xs font-bold cursor-pointer transition-colors"
                onClick={() => {
                  if (reschedulePostId === post.id) {
                    setReschedulePostId(null);
                  } else {
                    const postTz = post.timezone || 'Asia/Kolkata';
                    const parsed = post.scheduledAt
                      ? DateTime.fromISO(post.scheduledAt.replace(' ', 'T'), { zone: 'utc' }).setZone(postTz)
                      : DateTime.now().setZone(postTz).plus({ days: 1 });
                    setRescheduleDate(parsed.toISODate() || '');
                    setRescheduleTime(parsed.toFormat('HH:mm') || '10:00');
                    setRescheduleZone(postTz);
                    setRescheduleDirect(true);
                    setReschedulePostId(post.id);
                  }
                }}
              >
                <Calendar className="h-3.5 w-3.5" />
                {reschedulePostId === post.id ? 'Close reschedule' : '📅 Reschedule / Direct Schedule'}
              </button>
            )}

            <button type="button" className={fieldClass} onClick={() => onSelectPost(post)}>Open review queue</button>
            {permissions.canCreatePost && ['draft', 'revision_requested'].includes(post.approvalStatus) && !terminal && <button type="button" disabled={busy} className={fieldClass} onClick={() => void run(post, () => onSubmitPost(post.id), 'Submitted for approval.')}>Submit for approval</button>}
            {permissions.canApprovePost && ['in_review', 'overdue'].includes(post.approvalStatus) && !terminal && <>
              <button type="button" disabled={busy} className={fieldClass + ' text-emerald-800'} onClick={() => { if (window.confirm('Approve version ' + post.versionNumber + ' of "' + post.title + '"? If a publication time is set, approval makes it eligible for scheduling.')) void run(post, () => onApprovePost(post.id), 'Approval recorded.'); }}>Approve revision</button>
              <button type="button" disabled={busy} className={fieldClass} onClick={() => { const reason = window.prompt('What should change before this post can be approved?'); if (reason?.trim()) void run(post, () => onRequestRevision(post.id, reason.trim()), 'Changes requested.'); }}>Request changes</button>
              <button type="button" disabled={busy} className={fieldClass + ' text-red-700'} onClick={() => { const reason = window.prompt('Why should this post be rejected?'); if (reason?.trim()) void run(post, () => onRejectPost(post.id, reason.trim()), 'Rejection recorded.'); }}>Reject</button>
            </>}
            {permissions.canDeletePost && !terminal && <button type="button" disabled={busy} className={fieldClass + ' text-red-700'} onClick={() => { if (window.confirm('Delete "' + post.title + '" and its schedule? This may be permanent.')) void run(post, () => onDeletePost(post.id), 'Post deleted.'); }}>Delete post</button>}
            {busy && <span role="status" className="self-center text-xs font-semibold text-slate-600">Saving…</span>}
          </div>
        </div>}
      </article>;
    })}</div>
    {!filtered.length && <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h3 className="font-semibold">No posts match this view</h3><p className="mt-2 text-sm text-slate-600">{posts.length ? 'Try another filter or clear your search.' : 'Create your first draft to get started.'}</p>{posts.length > 0 && <button type="button" className="mt-4 text-sm font-medium text-blue-700" onClick={() => { setSearch(''); setBrand('all'); setStatus('all'); setPlatform('all'); }}>Clear filters</button>}</section>}
    {failurePost&&<FailureReportDialog post={failurePost} onClose={()=>setFailurePost(null)} onPostUpdated={onPostUpdated}/>}
  </div>;
};
