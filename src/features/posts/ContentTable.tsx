import React, { useState } from 'react';
import { DateTime } from 'luxon';
import { Plus, Search, ChevronDown, AlertCircle } from 'lucide-react';
import { Post, Brand, RoleName } from '../../../server/src/types';
import { getRolePermissions } from '../../utils/rbac';
import { MediaThumbnail } from '../../components/media/MediaThumbnail';

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
}
const stateLabel = (state: string) => ({ in_review: 'In review', revision_requested: 'Changes requested', partially_published: 'Partially published', idle: 'Not queued' }[state] || state.replaceAll('_', ' '));
const stateTone = (state: string) => /failed|rejected|partial|overdue|verification/i.test(state) ? 'bg-amber-50 text-amber-900' : /published|approved|success/i.test(state) ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700';
const fieldClass = 'rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm';

export const ContentTable: React.FC<ContentTableProps> = ({
  posts, brands, onSelectPost, onCreateNew, onApprovePost, onRejectPost, onRequestRevision,
  onSubmitPost, onPublishNow, onDeletePost, currentRole = 'Client',
}) => {
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('all');
  const [status, setStatus] = useState('all');
  const [platform, setPlatform] = useState('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const permissions = getRolePermissions(currentRole);
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
          <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm">{post.masterCaption}</p>
          <p className="text-xs text-slate-600">Approver: {post.assignedApproverName || 'Not assigned'} · Version {post.versionNumber}</p>
          <div className="grid gap-3 sm:grid-cols-2">{post.platforms?.map((target, index) => <section key={target.platform + index} className="rounded-xl border border-slate-200 p-3"><div className="flex justify-between gap-2 text-sm"><h3 className="font-semibold capitalize">{target.platform}</h3><span className="capitalize">{stateLabel(String(target.publishingStatus))}</span></div>{target.captionOverride && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{target.captionOverride}</p>}{target.errorMessage && <p className="mt-2 text-sm text-red-700">{target.errorMessage}</p>}{String(target.platformPostUrl || (target as any).publishedUrl || '').split(' | ').filter(u => /^https?:\/\//i.test(u)).map(url => <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="mt-2 block text-sm text-blue-700 underline">Open provider result</a>)}</section>)}</div>
          {['failed', 'partially_published'].includes(post.publishingStatus) && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Review the affected destinations and connection health. Do not republish successful destinations; uncertain outcomes need reconciliation before retrying.</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={fieldClass} onClick={() => onSelectPost(post)}>Open review queue</button>
            {permissions.canCreatePost && ['draft', 'revision_requested'].includes(post.approvalStatus) && !terminal && <button type="button" disabled={busy} className={fieldClass} onClick={() => void run(post, () => onSubmitPost(post.id), 'Submitted for approval.')}>Submit for approval</button>}
            {permissions.canApprovePost && ['in_review', 'overdue'].includes(post.approvalStatus) && !terminal && <>
              <button type="button" disabled={busy} className={fieldClass + ' text-emerald-800'} onClick={() => { if (window.confirm('Approve version ' + post.versionNumber + ' of "' + post.title + '"? If a publication time is set, approval makes it eligible for scheduling.')) void run(post, () => onApprovePost(post.id), 'Approval recorded.'); }}>Approve revision</button>
              <button type="button" disabled={busy} className={fieldClass} onClick={() => { const reason = window.prompt('What should change before this post can be approved?'); if (reason?.trim()) void run(post, () => onRequestRevision(post.id, reason.trim()), 'Changes requested.'); }}>Request changes</button>
              <button type="button" disabled={busy} className={fieldClass + ' text-red-700'} onClick={() => { const reason = window.prompt('Why should this post be rejected?'); if (reason?.trim()) void run(post, () => onRejectPost(post.id, reason.trim()), 'Rejection recorded.'); }}>Reject</button>
            </>}
            {permissions.canPublishPost && post.approvalStatus === 'approved' && ['idle', 'scheduled'].includes(post.publishingStatus) && <button type="button" disabled={busy} className={fieldClass + ' text-blue-700'} onClick={() => { if (window.confirm('Publish "' + post.title + '" now instead of its scheduled time?')) void run(post, () => onPublishNow(post.id), 'Publication requested. Check destination results for confirmation.'); }}>Publish now</button>}
            {permissions.canDeletePost && !terminal && <button type="button" disabled={busy} className={fieldClass + ' text-red-700'} onClick={() => { if (window.confirm('Delete "' + post.title + '" and its schedule? This may be permanent.')) void run(post, () => onDeletePost(post.id), 'Post deleted.'); }}>Delete post</button>}
            {busy && <span role="status" className="self-center text-sm text-slate-600">Saving…</span>}
          </div>
        </div>}
      </article>;
    })}</div>
    {!filtered.length && <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h3 className="font-semibold">No posts match this view</h3><p className="mt-2 text-sm text-slate-600">{posts.length ? 'Try another filter or clear your search.' : 'Create your first draft to get started.'}</p>{posts.length > 0 && <button type="button" className="mt-4 text-sm font-medium text-blue-700" onClick={() => { setSearch(''); setBrand('all'); setStatus('all'); setPlatform('all'); }}>Clear filters</button>}</section>}
  </div>;
};
