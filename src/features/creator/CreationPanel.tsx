import React,{useEffect,useRef,useState} from 'react';
import {AlertCircle,ArrowRight,CheckCircle2,Clock,Loader2,RefreshCw,RotateCcw,Trash2,X,Upload,Image as ImageIcon,Sparkles,Layers,Send,Calendar as CalendarIcon,Check} from 'lucide-react';
import {api} from '../../api/client';

const labels:Record<string,string>={QUEUED:'Queued',GENERATING:'Generating',READY:'Preparing draft',READY_FOR_SCHEDULING:'Ready to schedule',AWAITING_APPROVAL:'Awaiting approval',SCHEDULED:'Approved / scheduled',REJECTED:'Rejected',CHANGES_REQUESTED:'Changes requested',FAILED:'Failed',NEEDS_ATTENTION:'Needs attention'};
const activityLabels:Record<string,string>={started:'Antigravity started',reading:'Reading project files',writing:'Updating creative files',image:'Generating artwork',command:'Running a production step',narration:'Creating the voiceover',render:'Rendering output',checking:'Checking file completeness',upload:'Uploading media',copy:'Saving generated caption',waiting:'Waiting for the file to finish'};
const active=(job:any)=>['QUEUED','GENERATING','READY'].includes(job.status);
const failed=(job:any)=>['FAILED','NEEDS_ATTENTION'].includes(job.status);
const at=(value?:string)=>value?new Date(value).toLocaleString():'';
function guidance(job:any){
  if(/denied|permission/i.test(job.error||''))return 'A production tool was denied. Check the named tool in the local Antigravity job log and its scoped permissions, then retry. The earlier “dir src” permission has been corrected.';
  if(/lease|stopped/i.test(job.error||''))return 'The PC stopped reporting. Check its connection and inspect the local output before retrying; a finished file may already exist.';
  if(/timeout|timed out/i.test(job.error||''))return 'The generation exceeded its allowed time. Inspect the local render and shorten or simplify the brief before a new attempt.';
  if(/upload|HTTP/i.test(job.error||''))return 'Check the PC connection and dashboard availability. The worker retains completed files for upload retries.';
  return 'Read the failure reason below and check the local job log if more detail is needed. A retry creates a separate output and still requires scheduling and approval.';
}

function CreationDialog({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){
  const ref=useRef<HTMLDivElement>(null),closeRef=useRef(onClose);closeRef.current=onClose;
  useEffect(()=>{const old=document.activeElement as HTMLElement|null;const node=ref.current;node?.focus();
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape')closeRef.current();if(event.key==='Tab'){
      const items=Array.from(node?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],[tabindex="0"]')||[]);const first=items[0],last=items.at(-1);
      if(!first){event.preventDefault();return;}if(event.shiftKey&&(document.activeElement===first||document.activeElement===node)){event.preventDefault();last?.focus();}else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===node)){event.preventDefault();first.focus();}
    }};document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);old?.focus();};},[]);
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4" onClick={onClose}><div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="creation-dialog-title" onClick={e=>e.stopPropagation()} className="max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl outline-none"><div className="mb-5 flex items-start justify-between gap-3"><h2 id="creation-dialog-title" className="text-xl font-semibold text-slate-950">{title}</h2><button type="button" aria-label="Close dialog" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X size={20}/></button></div>{children}</div></div>;
}

export function CreationPanel({
  jobs,
  selected,
  onSelect,
  onRefresh,
  onOpenDesk,
  onTrash,
  onRestore,
  onRetry,
  onRegenerate,
  onFixReschedule,
  accounts = [],
  showTrash,
  onToggleTrash,
  canManage,
  busy,
  workerOnline,
}: {
  jobs: any[];
  selected: any;
  onSelect: (id: string) => void;
  onRefresh: () => void;
  onOpenDesk: (id: string) => void;
  onTrash: (job: any) => Promise<void>;
  onRestore: (job: any) => Promise<void>;
  onRetry: (job: any) => Promise<void>;
  onRegenerate?: (job: any, data: { instructions: string; referenceImageUrl?: string }) => Promise<void>;
  onFixReschedule?: (job: any, data: any) => Promise<void>;
  accounts?: any[];
  showTrash: boolean;
  onToggleTrash: () => void;
  canManage: boolean;
  busy: boolean;
  workerOnline: boolean;
}) {
  const [dialog, setDialog] = useState<'delete' | 'report' | 'regenerate' | 'fix' | null>(null);
  const [dialogJob, setDialogJob] = useState<any>(null);
  const [dialogError, setDialogError] = useState('');
  const [showAll, setShowAll] = useState(false);

  // Regeneration with Image Reference & Instructions State
  const [regenInstructions, setRegenInstructions] = useState('');
  const [regenRefImageUrl, setRegenRefImageUrl] = useState('');
  const [isUploadingRefImage, setIsUploadingRefImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fix & Reschedule State
  const [fixTitle, setFixTitle] = useState('');
  const [fixCaption, setFixCaption] = useState('');
  const [fixAccountIds, setFixAccountIds] = useState<string[]>([]);
  const [fixPublishNow, setFixPublishNow] = useState(true);
  const [fixDate, setFixDate] = useState('');
  const [fixTime, setFixTime] = useState('12:00');

  useEffect(() => setShowAll(false), [showTrash]);
  const visibleJobs = showTrash || showAll ? jobs : jobs.slice(0, 3);
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    if (!selected || !active(selected)) return;
    const timer = setInterval(() => setClock(Date.now()), 10000);
    return () => clearInterval(timer);
  }, [selected?.id, selected?.status]);

  const open = (mode: 'delete' | 'report', job: any) => {
    setDialogJob(job);
    setDialogError('');
    setDialog(mode);
  };

  const openRegenerate = (job: any) => {
    setDialogJob(job);
    setDialogError('');
    setRegenInstructions('');
    setRegenRefImageUrl(job.referenceImageUrl || '');
    setDialog('regenerate');
  };

  const openFix = (job: any) => {
    setDialogJob(job);
    setDialogError('');
    setFixTitle(job.title || '');
    setFixCaption(job.caption || '');
    setFixPublishNow(true);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    setFixDate(tomorrow);
    setFixTime('12:00');
    const brandActive = (accounts || []).filter(a =>
      (a.brandId === job.brandId || String(a.brandId) === String(job.brandId) || (job.uiBrandId && a.brandId === job.uiBrandId)) &&
      (a.status === 'active' || a.connectionStatus === 'connected')
    );
    const defaultIds = brandActive.length > 0 ? brandActive.map(a => String(a.accountId || a.id)) : (job.accountIds || []);
    setFixAccountIds(defaultIds);
    setDialog('fix');
  };

  const handleUploadRefImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingRefImage(true);
    setDialogError('');
    try {
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await api.uploadMedia({
        filename: file.name,
        fileData: base64Data,
        mimeType: file.type || 'image/jpeg',
      });
      if (res && res.url) {
        setRegenRefImageUrl(res.url);
      }
    } catch (err: any) {
      setDialogError(err.message || 'Failed to upload reference image.');
    } finally {
      setIsUploadingRefImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const perform = async (action: () => Promise<void>) => {
    try {
      setDialogError('');
      await action();
      setDialog(null);
    } catch (e: any) {
      setDialogError(e.message);
    }
  };

  const progress = selected?.progress || {};
  const stale = progress.updatedAt && clock - Date.parse(progress.updatedAt) > 90000;
  const retryAllowed = (job: any) => failed(job) && !job.postId && !job.fileUrl && !job.deletedAt;
  const deleteAllowed = (job: any) =>
    ['QUEUED', 'FAILED', 'NEEDS_ATTENTION', 'READY_FOR_SCHEDULING', 'REJECTED', 'CHANGES_REQUESTED'].includes(job.status);
  const badge = (job: any) => (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        failed(job)
          ? 'bg-red-50 text-red-700'
          : active(job)
          ? 'bg-indigo-50 text-indigo-700'
          : 'bg-emerald-50 text-emerald-800'
      }`}
    >
      {active(job) ? <Loader2 size={12} className="animate-spin" /> : failed(job) ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />} {job.deletedAt ? 'In Trash' : labels[job.status] || job.status}
    </span>
  );
  return <>
    <section aria-label="Creation preview and history" className="creator-preview-panel flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4"><h2 className="text-lg font-semibold text-slate-950">Creation preview</h2><button type="button" onClick={onRefresh} className="inline-flex items-center gap-1.5 rounded-lg p-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"><RefreshCw size={15}/>Refresh</button></div>
      <div tabIndex={0} aria-label="Preview details" className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5 focus-visible:outline-indigo-500">
        {selected?<>
          <div className="space-y-2">{badge(selected)}<h3 className="break-words text-lg font-semibold text-slate-950">{selected.title}</h3><p className="text-xs text-slate-500">{selected.kind==='post'?'Image post':'Video'} · {selected.brandName} · {at(selected.createdAt)}</p></div>
          {active(selected)&&!selected.deletedAt&&<div role="status" aria-live="polite" className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold text-indigo-900"><Loader2 size={16} className="shrink-0 animate-spin"/>{selected.status==='QUEUED'?(workerOnline?'Waiting for the PC to start':'Waiting for the creation PC'):selected.status==='READY'?'Media complete · preparing the draft':progress.label||'Antigravity is generating your content'}</p>
            <p className="mt-2 text-indigo-800">{selected.status==='QUEUED'?'Your brief is saved. Generation starts when the worker claims it.':selected.status==='READY'?'The minute scheduler will move this creation to Social Media Desk.':progress.activity||'The worker is running. Detailed activity appears when its next update arrives.'}</p>
            {!!progress.completedSteps&&<p className="mt-2 text-xs text-indigo-700">{progress.completedSteps} production steps completed</p>}
            {progress.updatedAt&&<p className="mt-2 flex items-center gap-1 text-xs text-slate-600"><Clock size={12}/>Last activity: {at(progress.updatedAt)}</p>}
            {(stale||!workerOnline)&&selected.status==='GENERATING'&&<p className="mt-2 text-xs text-amber-800">Updates are delayed. The PC may be busy or offline; this does not confirm a failure.</p>}
            <div className="mt-3 grid grid-cols-4 gap-1.5 text-[10px] text-slate-500">{['Queued','Creating','Upload','Draft'].map((text,i)=>{const step=selected.status==='QUEUED'?0:selected.status==='READY'?3:['uploading','upload_wait','ready'].includes(progress.stage)?2:1;return <div key={text}><div className={`mb-1 h-1.5 rounded-full ${i<=step?'bg-indigo-500':'bg-indigo-100'}`}/>{text}</div>;})}</div>
          </div>}
          {selected.fileUrl?(selected.kind==='post'?<img src={selected.fileUrl} alt={selected.title} className="max-h-[440px] w-full rounded-xl bg-slate-50 object-contain shadow-sm"/>:<video src={selected.fileUrl} controls preload="metadata" className="max-h-[440px] w-full rounded-xl bg-slate-950 shadow-sm"/>):!active(selected)&&<div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">{failed(selected)?'No completed media was delivered.':'Your completed media will appear here.'}</div>}
          {selected.error&&<div className="rounded-xl border border-red-200 bg-red-50 p-3.5 space-y-2"><p className="break-words text-sm font-medium text-red-800">{selected.error}</p><div className="flex flex-wrap items-center gap-3 pt-1"><button type="button" onClick={()=>open('report',selected)} className="text-xs font-semibold text-red-800 underline underline-offset-2 hover:text-red-950">View failure report</button>{selected.fileUrl&&onFixReschedule&&<button type="button" onClick={()=>openFix(selected)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors">🛠️ Fix &amp; Reschedule / Publish</button>}</div></div>}
          {selected.caption&&<div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2"><h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between"><span>Post Caption</span><span className="text-[10px] text-indigo-600 font-semibold lowercase">live social text</span></h4><div tabIndex={0} aria-label="Creation caption" className="max-h-60 overflow-y-auto overscroll-contain whitespace-pre-wrap break-words rounded-lg bg-white p-3 text-sm leading-relaxed text-slate-800 font-medium border border-slate-200/80 shadow-xs">{selected.caption}</div></div>}
          {progress.history?.length>0&&<details className="rounded-xl border border-slate-200 p-3"><summary className="cursor-pointer text-sm font-medium text-slate-700">Production activity</summary><ol className="mt-3 max-h-44 space-y-2 overflow-y-auto text-xs text-slate-600">{progress.history.slice().reverse().map((item:any,i:number)=><li key={i} className="flex justify-between gap-3"><span>{activityLabels[item.activity]||'Production step'}</span><time className="shrink-0 text-slate-400">{new Date(item.at).toLocaleTimeString()}</time></li>)}</ol></details>}
          <div className="flex flex-wrap gap-2">
            {canManage && !showTrash && selected.fileUrl && (failed(selected) || selected.error) && onFixReschedule && (
              <button
                type="button"
                disabled={busy}
                onClick={() => openFix(selected)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 text-sm font-bold cursor-pointer transition-colors shadow-xs disabled:opacity-50"
              >
                🛠️ Fix &amp; Reschedule / Publish
              </button>
            )}
            {selected.postId&&!selected.deletedAt&&<button type="button" onClick={()=>onOpenDesk(selected.id)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white cursor-pointer">Edit in Social Media Desk<ArrowRight size={15}/></button>}
            {canManage && !showTrash && onRegenerate && (
              <button
                type="button"
                disabled={busy}
                onClick={() => openRegenerate(selected)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2.5 text-sm font-bold cursor-pointer transition-colors shadow-xs disabled:opacity-50"
              >
                <RotateCcw size={15} />
                🔄 Regenerate with Reference &amp; Instructions
              </button>
            )}
            {canManage&&!showTrash&&retryAllowed(selected)&&<button type="button" disabled={busy} onClick={()=>void onRetry(selected).catch(()=>{})} className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 px-3 py-2.5 text-sm font-semibold text-indigo-700 disabled:opacity-50 cursor-pointer"><RotateCcw size={15}/>{selected.retryJobId?'Open retry':'Retry generation'}</button>}
            {canManage&&(showTrash?<button type="button" disabled={busy} onClick={()=>void onRestore(selected)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50 cursor-pointer"><RotateCcw size={15}/>Restore creation</button>:<button type="button" disabled={busy||!deleteAllowed(selected)} title={deleteAllowed(selected)?'Move this creation to Trash':'Running, approved and submitted content is protected'} onClick={()=>open('delete',selected)} className="inline-flex items-center gap-2 rounded-xl border border-red-100 px-3 py-2.5 text-sm font-medium text-red-700 disabled:opacity-40 cursor-pointer"><Trash2 size={15}/>Delete</button>)}
          </div>
        </>:<div className="flex min-h-44 items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">{showTrash?'Trash is empty.':'Submit a brief to start your first creation.'}</div>}
      </div>
      <div className="flex max-h-[45%] min-h-36 shrink-0 flex-col border-t border-slate-200 bg-slate-50/60">
        <div className="flex shrink-0 items-center justify-between px-5 py-3"><h3 className="text-sm font-semibold text-slate-800">{showTrash?'Deleted creations':'Recent creations'} <span className="font-normal text-slate-400">({visibleJobs.length}{!showTrash&&!showAll&&jobs.length>3?` of ${jobs.length}`:''})</span></h3><div className="flex items-center gap-1">{!showTrash&&jobs.length>3&&<button type="button" onClick={()=>setShowAll(value=>!value)} className="rounded-lg px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50">{showAll?'Latest 3':'View all'}</button>}<button type="button" onClick={onToggleTrash} className="rounded-lg px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50">{showTrash?'Back to recent':'View Trash'}</button></div></div>
        <div tabIndex={0} aria-label={showTrash?'Deleted creations':'Recent creations'} className="min-h-0 space-y-2 overflow-y-auto overscroll-contain px-4 pb-4">{visibleJobs.map(job=><div key={job.id} className={`flex items-center gap-2 rounded-xl border ${selected?.id===job.id?'border-indigo-200 bg-indigo-50':'border-slate-200 bg-white'}`}><button type="button" aria-pressed={selected?.id===job.id} onClick={()=>onSelect(job.id)} className="min-w-0 flex-1 p-2.5 text-left"><p className="truncate text-sm font-medium text-slate-800">{job.title}</p><p className="mt-1 text-xs text-slate-500">{job.kind==='post'?'Image post':'Video'} · {labels[job.status]||job.status}</p></button>{canManage&&!showTrash&&deleteAllowed(job)&&<button type="button" disabled={busy} aria-label={`Delete ${job.title}`} title="Move to Trash" onClick={()=>open('delete',job)} className="mr-2 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-700"><Trash2 size={15}/></button>}</div>)}</div>
      </div>
    </section>
    {dialog&&dialogJob&&<CreationDialog title={dialog==='delete'?'Delete this creation?':dialog==='regenerate'?'Regenerate with Image Reference & Change Instructions':'Generation failure report'} onClose={()=>{if(!busy)setDialog(null);}}>
      <p className="break-words font-medium text-slate-900">{dialogJob.title}</p>
      {dialog==='delete'?<><p className="mt-3 text-sm leading-relaxed text-slate-600">This moves the creation and its editable draft to Trash. You can restore it later. Generated files stay saved. Restored drafts need a new schedule and approval; restored queued briefs resume generation.</p><div className="mt-6 flex justify-end gap-3"><button type="button" disabled={busy} onClick={()=>setDialog(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm">Cancel</button><button type="button" disabled={busy} onClick={()=>void perform(()=>onTrash(dialogJob))} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy?'Deleting…':'Move to Trash'}</button></div></>:
      dialog==='regenerate'?<div className="mt-3 space-y-4">
        <p className="text-xs text-slate-600 leading-relaxed">
          Upload an image reference and provide specific change instructions to regenerate a revised version of this content.
        </p>

        {/* Reference Image Input */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
            <span>Reference Image (Style / Visual Direction)</span>
            {regenRefImageUrl && (
              <button
                type="button"
                onClick={() => setRegenRefImageUrl('')}
                className="text-[10px] text-red-600 hover:underline"
              >
                Remove
              </button>
            )}
          </label>

          {regenRefImageUrl ? (
            <div className="relative rounded-xl border border-indigo-200 overflow-hidden bg-slate-900 max-h-48 flex items-center justify-center">
              <img src={regenRefImageUrl} alt="Reference" className="max-h-48 w-full object-contain" />
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-xl p-4 text-center cursor-pointer bg-slate-50 hover:bg-indigo-50/30 transition-colors"
            >
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleUploadRefImage}
                className="hidden"
              />
              {isUploadingRefImage ? (
                <div className="flex items-center justify-center gap-2 text-xs font-medium text-indigo-700">
                  <Loader2 size={16} className="animate-spin" /> Uploading reference image...
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-700">Upload Reference Image (PNG/JPG)</p>
                  <p className="text-[10px] text-slate-500">Provide an image asset, product photo, or style guide</p>
                </div>
              )}
            </div>
          )}

          <input
            type="url"
            value={regenRefImageUrl}
            onChange={e => setRegenRefImageUrl(e.target.value)}
            placeholder="Or paste direct image URL (https://...)"
            className="w-full h-9 px-3 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
          />
        </div>

        {/* Instructions */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800">
            Regeneration Instructions &amp; What to Change *
          </label>
          <textarea
            rows={4}
            value={regenInstructions}
            onChange={e => setRegenInstructions(e.target.value)}
            placeholder="e.g. Change visual style to match the uploaded reference image, make the tone more energetic, update background colors, faster voiceover, highlight key benefits..."
            className="w-full p-3 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            disabled={busy}
            onClick={() => setDialog(null)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || isUploadingRefImage || !regenInstructions.trim() || !onRegenerate}
            onClick={() => void perform(() => onRegenerate!(dialogJob, { instructions: regenInstructions.trim(), referenceImageUrl: regenRefImageUrl || undefined }))}
            className="rounded-xl bg-purple-600 hover:bg-purple-700 px-5 py-2 text-xs font-bold text-white disabled:opacity-50 cursor-pointer shadow-sm transition-colors flex items-center gap-1.5"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
            🚀 Start Video Regeneration
          </button>
        </div>
      </div> :
      dialog === 'fix' ? (
        <div className="mt-2 space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            Select connected channels and choose whether to publish immediately or reschedule for later.
          </p>

          {/* Media preview */}
          {dialogJob.fileUrl && (
            <div className="rounded-xl overflow-hidden bg-slate-950 max-h-48 flex items-center justify-center border border-slate-200">
              {dialogJob.kind === 'post' ? (
                <img src={dialogJob.fileUrl} alt={dialogJob.title} className="max-h-48 object-contain" />
              ) : (
                <video src={dialogJob.fileUrl} controls preload="metadata" className="max-h-48 w-full" />
              )}
            </div>
          )}

          {/* Title & Caption */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800">Post Title</label>
            <input
              type="text"
              value={fixTitle}
              onChange={e => setFixTitle(e.target.value)}
              className="w-full h-9 px-3 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-800">Post Caption</label>
            <textarea
              rows={3}
              value={fixCaption}
              onChange={e => setFixCaption(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white"
            />
          </div>

          {/* Connected Channels Checkboxes */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 flex items-center justify-between">
              <span>Select Destination Channels</span>
              <span className="text-[10px] text-slate-500">Facebook, Instagram</span>
            </label>
            <div className="space-y-1.5 rounded-xl border border-slate-200 p-2.5 bg-slate-50">
              {(accounts || []).length > 0 ? (
                accounts.map(acc => {
                  const id = String(acc.accountId || acc.id);
                  const isChecked = fixAccountIds.includes(id);
                  const isConnected = acc.status === 'active' || acc.connectionStatus === 'connected';
                  return (
                    <label key={id} className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-colors ${isChecked ? 'bg-white shadow-2xs font-bold text-indigo-900' : 'text-slate-600 hover:bg-slate-100'}`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={e => {
                          if (e.target.checked) setFixAccountIds(prev => [...prev, id]);
                          else setFixAccountIds(prev => prev.filter(x => x !== id));
                        }}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span className="capitalize">{acc.platform}</span>
                      <span className="text-[10px] text-slate-400 font-mono">({acc.accountHandle || acc.accountName || acc.platform})</span>
                      <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isConnected ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                        {isConnected ? 'Active' : 'Offline'}
                      </span>
                    </label>
                  );
                })
              ) : (
                <p className="text-slate-500 text-[11px] py-1">No channels found. The server will use the brand's connected Facebook or Instagram accounts.</p>
              )}
            </div>
          </div>

          {/* Publishing Mode Tabs */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800">Publishing Mode</label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setFixPublishNow(true)}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  fixPublishNow ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>🚀 Publish Now Directly</span>
              </button>
              <button
                type="button"
                onClick={() => setFixPublishNow(false)}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !fixPublishNow ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>📅 Reschedule</span>
              </button>
            </div>
          </div>

          {/* Schedule Inputs if Rescheduling */}
          {!fixPublishNow && (
            <div className="grid grid-cols-2 gap-2 p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl">
              <div>
                <label className="block text-[11px] font-semibold text-blue-900 mb-1">Publication Date</label>
                <input
                  type="date"
                  value={fixDate}
                  onChange={e => setFixDate(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg border border-blue-300 bg-white text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-blue-900 mb-1">Publication Time</label>
                <input
                  type="time"
                  value={fixTime}
                  onChange={e => setFixTime(e.target.value)}
                  className="w-full h-8 px-2.5 rounded-lg border border-blue-300 bg-white text-xs text-slate-900"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={busy}
              onClick={() => setDialog(null)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || !onFixReschedule}
              onClick={() => void perform(async () => {
                await onFixReschedule!(dialogJob, {
                  title: fixTitle.trim(),
                  caption: fixCaption.trim(),
                  accountIds: fixAccountIds,
                  publishNow: fixPublishNow,
                  scheduleDate: !fixPublishNow ? fixDate : undefined,
                  scheduleTime: !fixPublishNow ? fixTime : undefined,
                });
                setDialog(null);
              })}
              className={`rounded-xl px-5 py-2 text-xs font-bold text-white shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                fixPublishNow ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : fixPublishNow ? <Send size={14} /> : <CalendarIcon size={14} />}
              <span>{fixPublishNow ? '🚀 Publish Now Directly' : '📅 Reschedule & Save'}</span>
            </button>
          </div>
        </div>
      ) :
      <><dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs text-slate-600"><dt>Job ID</dt><dd className="break-all font-mono">{dialogJob.id}</dd><dt>Status</dt><dd>{labels[dialogJob.status]}</dd><dt>Created</dt><dd>{at(dialogJob.createdAt)}</dd><dt>Last stage</dt><dd>{dialogJob.progress?.label||'Generation on the PC'}</dd><dt>Last update</dt><dd>{at(dialogJob.progress?.updatedAt||dialogJob.updatedAt)}</dd></dl><h3 className="mt-5 text-sm font-semibold">Failure reason</h3><p className="mt-2 break-words rounded-xl bg-red-50 p-3 text-sm text-red-800">{dialogJob.error||'No failure reason was reported.'}</p><h3 className="mt-5 text-sm font-semibold">Recommended action</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{guidance(dialogJob)}</p><p className="mt-3 text-xs text-slate-500">Local log: runtime/logs/{dialogJob.id}.log</p><div className="mt-5 flex flex-wrap items-center gap-2">{dialogJob.fileUrl&&onFixReschedule&&<button type="button" onClick={()=>{setDialog(null);openFix(dialogJob);}} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm cursor-pointer transition-colors">🛠️ Fix Channels &amp; Reschedule / Publish</button>}{canManage&&retryAllowed(dialogJob)&&<button type="button" disabled={busy} onClick={()=>void perform(()=>onRetry(dialogJob))} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{dialogJob.retryJobId?'Open existing retry':'Retry generation'}</button>}</div></>}
      {dialogError&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{dialogError}</p>}
    </CreationDialog>}
  </>;
}
