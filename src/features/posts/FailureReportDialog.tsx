import React,{useEffect,useRef,useState} from 'react';
import {AlertCircle,CheckCircle2,RefreshCw,RotateCcw,X} from 'lucide-react';
import {api} from '../../api/client';
import type {Post} from '../../../server/src/types';
import type {DeliveryFailureReport} from '../../../server/src/types/postFailures';

export function FailureReportDialog({post,onClose,onPostUpdated}:{post:Post;onClose:()=>void;onPostUpdated?:(post:Post)=>void}) {
  const [report,setReport]=useState<DeliveryFailureReport|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[confirmId,setConfirmId]=useState('');
  const panel=useRef<HTMLDivElement>(null);
  const load=async()=>{setLoading(true);setError('');setConfirmId('');try{setReport(await api.getPostFailureReport(post.id));}catch(e:any){setError(e.message);}finally{setLoading(false);}};
  useEffect(()=>{void load();},[post.id]);
  useEffect(()=>{const previous=document.activeElement as HTMLElement|null;panel.current?.focus();return()=>previous?.focus();},[]);
  const retry=async(targetId:string)=>{
    const target=report?.destinations.find(d=>d.targetId===targetId);if(!report||!target||busy)return;
    setBusy(true);setError('');setNotice('');setConfirmId('');
    try{
      const data=await api.retryPostDestination(post.id,{targetId,postVersion:report.postVersion,targetVersion:target.targetVersion});
      setReport(data.report);onPostUpdated?.(data.post);
      setNotice(data.result.targetStatus==='Posted'?'The provider confirmed publication for this destination.':data.result.targetStatus==='Retrying'?'A temporary error occurred. A further attempt is scheduled; see the updated report.':'The retry finished without confirmed publication. See the updated cause and attempt history below.');
    }catch(e:any){setError(e.message);try{setReport(await api.getPostFailureReport(post.id));}catch{}}
    finally{setBusy(false);}
  };
  const date=(value:string|null)=>value?new Date(value).toLocaleString():'—';
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 sm:p-6" onClick={e=>{if(e.target===e.currentTarget&&!busy)onClose();}}>
    <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="failure-report-title" aria-describedby="failure-report-description" className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-xl outline-none" onKeyDown={e=>{
      if(e.key==='Escape'&&!busy){e.stopPropagation();onClose();}
      if(e.key==='Tab'){
        const nodes=Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),[tabindex="0"]')||[]);const first=nodes[0],last=nodes[nodes.length-1];
        if(!first){e.preventDefault();return;}
        if(e.shiftKey&&(document.activeElement===first||document.activeElement===panel.current)){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===panel.current)){e.preventDefault();first.focus();}
      }
    }}>
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 sm:p-6"><div><p className="text-xs font-semibold uppercase tracking-widest text-blue-700">Publishing support</p><h2 id="failure-report-title" className="mt-2 text-xl font-bold text-slate-950">Failure details & retry</h2><p id="failure-report-description" className="mt-2 line-clamp-2 text-sm text-slate-600">{post.title}</p></div><button type="button" disabled={busy} aria-label="Close failure report" onClick={onClose} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-40"><X size={20}/></button></header>
      <div className="space-y-4 overflow-y-auto p-5 sm:p-6">
        {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {notice&&<p role="status" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">{notice}</p>}
        {loading?<p role="status" className="text-sm text-slate-600">Loading delivery report…</p>:report&&<>
          <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-600"><span>Content version {report.postVersion} · {report.approvalStatus}</span><span>Updated {date(report.generatedAt)}</span></div>
          {report.destinations.map(target=><section key={target.targetId} className="space-y-4 rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold capitalize text-slate-900">{target.platform} · {target.accountName}</h3><p className="mt-1 text-xs text-slate-500">{target.targetId}</p></div><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${target.status==='Posted'?'bg-emerald-50 text-emerald-800':'bg-amber-50 text-amber-900'}`}>{target.status==='Posted'?<CheckCircle2 size={13}/>:<AlertCircle size={13}/>}{target.status.replace(/([a-z])([A-Z])/g,'$1 $2')}</span></div>
            <div><h4 className="text-sm font-semibold">Result explained</h4><p className="mt-1 text-sm text-slate-700">{target.cause}</p>{target.errorMessage&&<p className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 font-mono text-xs text-red-800">{target.errorMessage}</p>}</div>
            <dl className="grid gap-3 text-xs sm:grid-cols-2"><div><dt className="text-slate-500">Error code</dt><dd className="mt-1 break-words font-medium">{target.errorCode||'Not recorded'}</dd></div><div><dt className="text-slate-500">Failure stage</dt><dd className="mt-1 font-medium">{target.stage}</dd></div><div><dt className="text-slate-500">Recorded attempts</dt><dd className="mt-1 font-medium">{target.attempts}</dd></div><div><dt className="text-slate-500">Last result</dt><dd className="mt-1 font-medium">{date(target.updatedAt)}</dd></div></dl>
            <div className="rounded-lg bg-slate-50 p-3"><h4 className="text-sm font-semibold">What to do next</h4><ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-slate-700">{target.nextSteps.map(step=><li key={step}>{step}</li>)}</ol><p className="mt-3 text-xs text-slate-600">Connection check: {target.connection}</p></div>
            {!!target.history.length&&<details className="text-sm"><summary className="cursor-pointer font-medium">Attempt history ({target.history.length} most recent)</summary><ul className="mt-2 space-y-2">{target.history.map(a=><li key={a.id} className="rounded-lg border border-slate-100 p-2 text-xs text-slate-600">{date(a.startedAt)} → {date(a.finishedAt)} · {a.result}{a.errorCode?' · '+a.errorCode:''}</li>)}</ul></details>}
            {target.status!=='Posted'&&<div className="border-t border-slate-100 pt-3">
              {target.retryBlockedReason&&<p className="mb-3 text-sm text-amber-900">{target.retryBlockedReason}</p>}
              {confirmId===target.targetId?<div className="rounded-xl border border-blue-200 bg-blue-50 p-3"><p className="text-sm text-blue-950">Retry this destination now using the approved content? This may publish immediately. The saved schedule and other destinations stay unchanged.</p><div className="mt-3 flex gap-2"><button type="button" onClick={()=>void retry(target.targetId)} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white">Confirm retry now</button><button type="button" onClick={()=>setConfirmId('')} className="rounded-lg border bg-white px-3 py-2 text-sm">Cancel</button></div></div>:<button type="button" disabled={!target.canRetry||busy} onClick={()=>setConfirmId(target.targetId)} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-200 disabled:text-slate-500"><RotateCcw size={15}/>{busy?'Retry in progress…':'Retry destination'}</button>}
            </div>}
          </section>)}
          {!report.destinations.length&&<p className="text-sm text-slate-600">No destination deliveries are recorded.</p>}
        </>}
      </div>
      <footer className="flex items-center justify-between gap-3 border-t border-slate-200 p-4"><p className="text-xs text-slate-500">Successful and uncertain deliveries are protected from repeat sends.</p><button type="button" disabled={busy||loading} onClick={()=>void load()} className="inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm disabled:opacity-40"><RefreshCw size={14}/>Refresh report</button></footer>
    </div>
  </div>;
}
