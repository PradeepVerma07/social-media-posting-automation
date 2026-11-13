import React, { useState } from 'react';
import { DateTime } from 'luxon';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, X, AlertCircle, Send } from 'lucide-react';
import { Post, Brand, SocialAccount, RoleName } from '../../../server/src/types';
import { CreatePostComposer } from '../posts/CreatePostComposer';
import { getRolePermissions } from '../../utils/rbac';

interface ContentCalendarProps {
  posts: Post[];
  brands: Brand[];
  socialAccounts?: SocialAccount[];
  currentUserId?: string | number;
  currentRole?: RoleName;
  onSelectPost: (post: Post) => void;
  onCreatePost?: (postData?: any) => void;
  onSchedulePost?: (postData: any) => Promise<void> | void;
  onUpdatePost?: (postId: number, updates: Partial<Post>) => Promise<void> | void;
  onPublishNow?: (postId: number) => Promise<void> | void;
  onDeletePost?: (postId: number) => Promise<void> | void;
}
const inputClass = 'rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm';
const statusLabel = (status: string) => ({ partially_published: 'Partially published', in_review: 'In review', revision_requested: 'Changes requested', idle: 'Not queued', needs_verification: 'Needs reconciliation' }[status] || status.replaceAll('_', ' '));
const instant = (value?: string) => value ? DateTime.fromISO(value.includes(' ') ? value.replace(' ', 'T') + (/[zZ]|[+-]\d\d:\d\d$/.test(value) ? '' : 'Z') : value, { zone: 'utc' }) : null;

export const ContentCalendar: React.FC<ContentCalendarProps> = ({
  posts, brands, socialAccounts = [], currentUserId, currentRole = 'Client',
  onSelectPost, onCreatePost, onSchedulePost, onUpdatePost, onPublishNow, onDeletePost,
}) => {
  const [view, setView] = useState<'month' | 'week' | 'agenda'>('month');
  const [zone, setZone] = useState(brands[0]?.timezone || 'Asia/Kolkata');
  const [cursor, setCursor] = useState(() => DateTime.now().setZone(zone).startOf('month'));
  const [brandFilter, setBrandFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [createDate, setCreateDate] = useState<string | null>(null);
  const [inspectingId, setInspectingId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [edit, setEdit] = useState({ title: '', caption: '', date: '', time: '', zone });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const permissions = getRolePermissions(currentRole);
  const inspecting = posts.find(p => p.id === inspectingId);
  const filtered = posts.filter(post => (brandFilter === 'all' || String(post.brandId) === brandFilter) &&
    (statusFilter === 'all' || post.publishingStatus === statusFilter || post.approvalStatus === statusFilter));
  const start = view === 'week' ? cursor.startOf('week') : cursor.startOf('month');
  const end = view === 'week' ? start.endOf('week') : start.endOf('month');
  const gridStart = view === 'week' ? start : start.startOf('week');
  const cellCount = view === 'week' ? 7 : Math.ceil((start.weekday - 1 + start.daysInMonth!) / 7) * 7;
  const dated = filtered.filter(p => {
    const date = instant(p.scheduledAt || p.publishedAt)?.setZone(zone);
    return date?.isValid && date >= start && date <= end;
  }).sort((a, b) => (instant(a.scheduledAt || a.publishedAt)?.toMillis() || 0) - (instant(b.scheduledAt || b.publishedAt)?.toMillis() || 0));
  const undatedCount = filtered.filter(p => !p.scheduledAt && !p.publishedAt).length;
  const showPost = (post: Post) => { setInspectingId(post.id); setEditing(false); setError(''); };
  const create = (date: string) => {
    if (!permissions.canCreatePost) return;
    if (onSchedulePost) setCreateDate(date);
    else onCreatePost?.({ requestedDate: date });
  };

  const runAction = async (action: () => Promise<void> | void, message: string) => {
    setBusy(true); setError('');
    try { await action(); setNotice(message); }
    catch (err) { setError(err instanceof Error ? err.message : 'The change could not be saved. Please try again.'); }
    finally { setBusy(false); }
  };
  const saveEdit = async () => {
    if (!inspecting || !onUpdatePost) return;
    try {
      if (!edit.title.trim() || !edit.caption.trim()) throw new Error('Add a title and caption.');
      const value = edit.date + 'T' + edit.time;
      const due = DateTime.fromISO(value, { zone: edit.zone });
      if (!due.isValid || due.toFormat("yyyy-MM-dd'T'HH:mm") !== value) throw new Error('Choose a valid local time. This time may be affected by a clock change.');
      if (due.getPossibleOffsets().length > 1) throw new Error('This time occurs twice. Choose an unambiguous time.');
      if (due.toMillis() <= Date.now()) throw new Error('Choose a time in the future.');
      if (!window.confirm('Save this revision and request publication on ' + due.toFormat('dd LLL yyyy HH:mm') + ' (' + edit.zone + ')? Changes to approved content require review again.')) return;
      setBusy(true); setError('');
      await onUpdatePost(inspecting.id, { title: edit.title, masterCaption: edit.caption, scheduledAt: due.toUTC().toISO()!, timezone: edit.zone, versionNumber: inspecting.versionNumber });
      setEditing(false); setNotice('Changes saved. Check the current approval status before publication.');
    } catch (err) { setError(err instanceof Error ? err.message : 'The post could not be updated.'); }
    finally { setBusy(false); }
  };

  if (createDate && onSchedulePost) return <CreatePostComposer brands={brands} socialAccounts={socialAccounts}
    currentUserId={currentUserId} currentRole={currentRole} initialDate={createDate}
    onCancel={() => setCreateDate(null)} onSavePost={async data => {
      await onSchedulePost({ ...data, source: 'calendar' });
      setCreateDate(null);
      setNotice(
        data.publishNow
          ? '🚀 Published directly to live channels! Check results in Published posts.'
          : (data.directSchedule || data.autoApprove || data.skipApproval)
          ? `📅 Direct post scheduled! Pre-approved to publish automatically on ${data.scheduleDate || createDate} at ${data.scheduleTime || 'scheduled time'} (${data.timezone || zone}) without requiring approval.`
          : data.submitForApproval
          ? 'Submitted for approval. The requested time will appear in the calendar.'
          : 'Draft saved to your workspace.'
      );
    }} />;

  return <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6 lg:p-8">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-2xl font-bold">Content calendar</h2><p className="mt-2 text-sm text-slate-600">See upcoming posts, approval status, and destination outcomes in one place.</p></div>
      {permissions.canCreatePost && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm cursor-pointer transition-colors"
            onClick={() => create(DateTime.now().setZone(zone).plus({ days: 1 }).toISODate()!)}
          >
            <CalendarIcon className="h-4 w-4" />
            📅 Schedule Direct Post
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-sm font-bold text-white shadow-sm cursor-pointer transition-colors"
            onClick={() => create(DateTime.now().setZone(zone).toISODate()!)}
          >
            <Send className="h-4 w-4 text-emerald-400" />
            🚀 Direct Post Now
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white cursor-pointer transition-colors"
            onClick={() => create(DateTime.now().setZone(zone).plus({ days: 1 }).toISODate()!)}
          >
            <Plus className="h-4 w-4" />
            Create post
          </button>
        </div>
      )}
    </header>
    {notice && <div role="status" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">{notice}</div>}
    {error && <div role="alert" className="flex gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="h-5 w-5 shrink-0" />{error}</div>}
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <label className="text-xs font-medium">Brand<select className={inputClass + ' mt-1 block'} value={brandFilter} onChange={e => setBrandFilter(e.target.value)}><option value="all">All brands</option>{brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <label className="text-xs font-medium">Status<select className={inputClass + ' mt-1 block'} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">All statuses</option>{['scheduled', 'in_review', 'published', 'partially_published', 'failed', 'cancelled'].map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}</select></label>
      <label className="text-xs font-medium">Calendar timezone<select className={inputClass + ' mt-1 block'} value={zone} onChange={e => { setZone(e.target.value); setCursor(prev => prev.setZone(e.target.value, { keepLocalTime: true })); }}>{Array.from(new Set([zone, ...brands.map(b => b.timezone), 'Asia/Kolkata', 'UTC', 'Europe/London', 'America/New_York'].filter(Boolean))).map(z => <option key={z} value={z}>{z}</option>)}</select></label>
      <div className="ml-auto flex gap-1" role="group" aria-label="Calendar view">{(['month', 'week', 'agenda'] as const).map(v => <button key={v} type="button" aria-pressed={view === v} className={'rounded-lg px-3 py-2 text-sm capitalize ' + (view === v ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700')} onClick={() => setView(v)}>{v === 'agenda' ? 'List' : v}</button>)}</div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><button type="button" aria-label="Previous period" className="rounded-lg border border-slate-300 p-2" onClick={() => setCursor(prev => view === 'week' ? prev.minus({ weeks: 1 }) : prev.minus({ months: 1 }))}><ChevronLeft className="h-4 w-4" /></button><h3 className="text-lg font-semibold">{view === 'week' ? start.toFormat('d LLL') + ' – ' + end.toFormat('d LLL yyyy') : cursor.toFormat('LLLL yyyy')}</h3><button type="button" aria-label="Next period" className="rounded-lg border border-slate-300 p-2" onClick={() => setCursor(prev => view === 'week' ? prev.plus({ weeks: 1 }) : prev.plus({ months: 1 }))}><ChevronRight className="h-4 w-4" /></button><button type="button" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" onClick={() => setCursor(DateTime.now().setZone(zone))}>Today</button></div><p className="text-xs text-slate-600">{dated.length} posts in this period · Times shown in {zone}</p></div>
    {view === 'agenda' ? <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">{dated.length ? dated.map(post => <button key={post.id} type="button" onClick={() => showPost(post)} className="flex w-full flex-wrap items-center gap-3 border-b border-slate-100 p-4 text-left hover:bg-slate-50"><CalendarIcon className="h-5 w-5 text-blue-700" /><span className="min-w-40 text-sm font-medium">{instant(post.scheduledAt || post.publishedAt)?.setZone(zone).toFormat('dd LLL, HH:mm')}</span><span className="flex-1"><span className="block text-sm font-semibold">{post.title}</span><span className="text-xs text-slate-600">{post.brandName}</span></span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs capitalize">{statusLabel(post.publishingStatus)} · {statusLabel(post.approvalStatus)}</span></button>) : <p className="p-12 text-center text-sm text-slate-600">No dated posts match these filters. Create a post or choose another period.</p>}</div> :
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><div className="min-w-[700px]"><div className="grid grid-cols-7 border-b border-slate-200">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <div key={day} className="p-3 text-center text-xs font-semibold text-slate-600">{day}</div>)}</div><div className="grid grid-cols-7">{Array.from({ length: cellCount }, (_, index) => {
        const day = gridStart.plus({ days: index });
        const dayPosts = filtered.filter(p => instant(p.scheduledAt || p.publishedAt)?.setZone(zone).toISODate() === day.toISODate());
        return <div key={day.toISODate()} className={'min-h-32 border-b border-r border-slate-100 p-2 ' + (day.month !== cursor.month && view === 'month' ? 'bg-slate-50' : '')}><div className="mb-2 flex items-center justify-between"><span className={'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ' + (day.hasSame(DateTime.now().setZone(zone), 'day') ? 'bg-blue-700 text-white' : 'text-slate-600')}>{day.day}</span>{permissions.canCreatePost && <button type="button" aria-label={'Create post for ' + day.toFormat('d LLLL yyyy')} className="rounded-lg p-1 text-slate-500 hover:bg-blue-50 hover:text-blue-700" onClick={() => create(day.toISODate()!)}><Plus className="h-4 w-4" /></button>}</div>{dayPosts.map(post => <button key={post.id} type="button" onClick={() => showPost(post)} className={'mb-2 w-full rounded-lg border p-2 text-left text-xs ' + (['failed', 'partially_published'].includes(post.publishingStatus) ? 'border-amber-200 bg-amber-50' : 'border-blue-100 bg-blue-50')}><span className="block font-semibold">{instant(post.scheduledAt || post.publishedAt)?.setZone(zone).toFormat('HH:mm')} · {post.title}</span><span className="mt-1 block text-slate-600">{post.brandName}</span><span className="mt-1 block capitalize">{statusLabel(post.publishingStatus)}</span>{post.approvalStatus !== 'approved' && <span className="mt-1 block font-medium">{statusLabel(post.approvalStatus)}</span>}</button>)}</div>;
      })}</div></div></div>}
    {undatedCount > 0 && <p className="text-sm text-slate-600">{undatedCount} posts have no publication date and are available in Posts. Changing the calendar timezone does not reschedule posts.</p>}

    {inspecting && <section role="dialog" aria-modal="true" aria-labelledby="calendar-post-title" onKeyDown={e => { if (e.key === 'Escape' && !busy) setInspectingId(null); }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 sm:p-6 space-y-4">
        <header className="flex items-start justify-between gap-3"><div><h3 id="calendar-post-title" className="text-lg font-bold">{inspecting.title}</h3><p className="mt-1 text-sm text-slate-600">{inspecting.brandName} · Version {inspecting.versionNumber}</p></div><button type="button" autoFocus aria-label="Close post details" className="rounded-lg p-2" onClick={() => setInspectingId(null)}><X className="h-5 w-5" /></button></header>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <p className="text-sm capitalize">{statusLabel(inspecting.approvalStatus)} · {statusLabel(inspecting.publishingStatus)}</p>
        <p className="text-sm text-slate-600">{instant(inspecting.scheduledAt)?.setZone(inspecting.timezone || zone).toFormat('dd LLL yyyy, HH:mm') || 'No scheduled time'} · {inspecting.timezone || zone}</p>
        {editing ? <div className="space-y-3"><label className="block text-sm">Title<input className={inputClass + ' mt-1 w-full'} value={edit.title} onChange={e => setEdit({ ...edit, title: e.target.value })} /></label><label className="block text-sm">Caption<textarea className={inputClass + ' mt-1 w-full'} rows={5} value={edit.caption} onChange={e => setEdit({ ...edit, caption: e.target.value })} /></label><div className="grid grid-cols-2 gap-3"><label className="text-sm">Date<input type="date" className={inputClass + ' mt-1 w-full'} value={edit.date} onChange={e => setEdit({ ...edit, date: e.target.value })} /></label><label className="text-sm">Time in {edit.zone}<input type="time" className={inputClass + ' mt-1 w-full'} value={edit.time} onChange={e => setEdit({ ...edit, time: e.target.value })} /></label></div><button type="button" disabled={busy} className="rounded-xl bg-blue-700 px-4 py-2 text-sm text-white disabled:opacity-50" onClick={() => void saveEdit()}>{busy ? 'Saving…' : 'Review and save changes'}</button><button type="button" className="ml-3 text-sm" onClick={() => setEditing(false)}>Cancel edit</button></div> : <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm">{inspecting.masterCaption}</p>}
        {inspecting.media?.[0]?.fileUrl && /^https?:\/\/|^\/uploads\//i.test(inspecting.media[0].fileUrl) && (inspecting.media[0].mediaType === 'video' ? <video className="max-h-64 w-full rounded-xl" src={inspecting.media[0].fileUrl} controls /> : <img className="max-h-64 w-full rounded-xl object-contain" src={inspecting.media[0].fileUrl} alt={inspecting.media[0].altText || 'Post media'} />)}
        <div className="space-y-2"><h4 className="text-sm font-semibold">Destination outcomes</h4>{inspecting.platforms?.map((target, index) => {
          const url = target.platformPostUrl || (target as any).publishedUrl;
          return <div key={target.platform + index} className="rounded-xl border border-slate-200 p-3 text-sm"><div className="flex justify-between gap-3"><span className="font-medium capitalize">{target.platform}</span><span className="capitalize">{statusLabel(String(target.publishingStatus))}</span></div>{target.errorMessage && <p className="mt-2 text-red-700">{target.errorMessage}</p>}{String(url || '').split(' | ').filter(u => /^https?:\/\//i.test(u)).map(u => <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="mt-2 block text-blue-700 underline">Open provider result</a>)}</div>;
        })}<p className="text-xs text-slate-600">Partial and uncertain results need review before retrying. A published destination must not be submitted again.</p></div>
        <footer className="flex flex-wrap gap-3 border-t border-slate-200 pt-4">
          {onUpdatePost && permissions.canCreatePost && !['published', 'partially_published', 'processing'].includes(inspecting.publishingStatus) && !editing && <button type="button" className={inputClass} onClick={() => { const time = instant(inspecting.scheduledAt)?.setZone(inspecting.timezone || zone); setEdit({ title: inspecting.title, caption: inspecting.masterCaption, date: time?.toISODate() || '', time: time?.toFormat('HH:mm') || '09:00', zone: inspecting.timezone || zone }); setEditing(true); }}>Edit or reschedule</button>}
          {onPublishNow && permissions.canPublishPost && !['published', 'partially_published', 'processing'].includes(inspecting.publishingStatus) && <button type="button" disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-sm transition-colors" onClick={() => { if (window.confirm('Publish "' + inspecting.title + '" directly now to live channels?')) void runAction(() => onPublishNow(inspecting.id), '🚀 Publication requested. Check live results!'); }}><Send className="h-4 w-4" />Publish now directly</button>}
          <button type="button" className={inputClass} onClick={() => { onSelectPost(inspecting); setInspectingId(null); }}>Open review queue</button>
          {onDeletePost && permissions.canDeletePost && !['published', 'partially_published', 'processing'].includes(inspecting.publishingStatus) && <button type="button" disabled={busy} className={inputClass + ' text-red-700'} onClick={() => { if (window.confirm('Delete "' + inspecting.title + '"? This may permanently remove the draft and its schedule.')) void runAction(async () => { await onDeletePost(inspecting.id); setInspectingId(null); }, 'Post deleted.'); }}>Delete post</button>}
        </footer>
      </div>
    </section>}
  </div>;
};
