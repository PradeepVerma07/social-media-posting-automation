import React,{useEffect,useRef,useState} from 'react';
import {DateTime} from 'luxon';
import {CalendarClock,Send,Save,RefreshCw,ArrowLeft} from 'lucide-react';
import {api} from '../../api/client';
import {getRolePermissions} from '../../utils/rbac';
import type {RoleName,SocialAccount} from '../../../server/src/types';

const field='w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50';
export function SocialMediaDesk({initialJobId,currentRole,onCreate}:{initialJobId?:string;currentRole:RoleName;onCreate:()=>void}){
  const [jobs,setJobs]=useState<any[]>([]),[selectedId,setSelectedId]=useState(initialJobId||''),[filter,setFilter]=useState('all');
  const [accounts,setAccounts]=useState<SocialAccount[]>([]),[status,setStatus]=useState<any>(null);
  const [title,setTitle]=useState(''),[caption,setCaption]=useState(''),[hashtags,setHashtags]=useState('');
  const [timezone,setTimezone]=useState('Asia/Kolkata'),[localTime,setLocalTime]=useState(''),[accountIds,setAccountIds]=useState<string[]>([]);
  const [version,setVersion]=useState(0),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
  const [error,setError]=useState(''),[notice,setNotice]=useState('');const editingId=useRef('');
  const refresh=async()=>{const data=await api.getCreatorDesk();setJobs(data.jobs);};
  useEffect(()=>{let active=true;const load=async()=>{try{const data=await api.getCreatorDesk();if(active)setJobs(data.jobs);}catch(e:any){if(active)setError(e.message);}finally{if(active)setLoading(false);}};void load();void api.getVideoAutomationStatus().then(setStatus).catch(e=>setError(e.message));const timer=setInterval(load,15000);return()=>{active=false;clearInterval(timer);};},[]);
  useEffect(()=>{if(initialJobId){setSelectedId(initialJobId);setFilter('all');}},[initialJobId]);
  const visible=jobs.filter(j=>filter==='all'||j.status===filter);
  const selected=visible.find(j=>j.id===selectedId)||visible[0];
  useEffect(()=>{
    if(!selected)return;
    if(editingId.current===selected.id&&dirty)return;
    editingId.current=selected.id;setTitle(selected.title);setCaption(selected.caption);setHashtags(selected.hashtags||'');
    setTimezone(selected.timezone||'Asia/Kolkata');setLocalTime(selected.scheduledAt?DateTime.fromISO(selected.scheduledAt).setZone(selected.timezone||'Asia/Kolkata').toFormat("yyyy-MM-dd'T'HH:mm"):'');
    setAccountIds(selected.accountIds||[]);setVersion(selected.postVersion);setDirty(false);
  },[selected?.id,selected?.postVersion,dirty]);
  useEffect(()=>{let alive=true;setAccounts([]);if(selected?.uiBrandId)api.getSocialAccounts(selected.uiBrandId).then(rows=>{if(alive)setAccounts(rows.filter(a=>a.brandId===selected.uiBrandId));}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[selected?.uiBrandId]);
  const canEdit=getRolePermissions(currentRole).canCreatePost;
  const editable=canEdit&&!!selected&&['READY_FOR_SCHEDULING','AWAITING_APPROVAL','SCHEDULED'].includes(selected.status);
  const save=async(submit:boolean)=>{
    if(!selected||busy)return;setBusy(true);setError('');setNotice('');
    try{const saved=await api.saveCreatorSchedule(selected.id,{title,caption,hashtags,timezone,localDateTime:localTime,accountIds,versionNumber:version});setDirty(false);setVersion(saved.job.postVersion);
      if(submit){await api.submitCreatorForApproval(selected.id,saved.job.postVersion);setNotice('Sent to the approver with the selected publication time. Publishing waits for approval.');}
      else setNotice('Draft saved. Send it for approval when the content and schedule are ready.');
    }catch(e:any){setError(e.message);}finally{await refresh().catch(e=>setError(e.message));setBusy(false);}
  };
  const update=(fn:()=>void)=>{fn();setDirty(true);};
  const eligible=accounts.filter(a=>a.connectionStatus==='connected'&&status?.capabilities?.[a.platform]?.placements?.[selected?.kind==='post'?'feed':'reels_shorts']?.includes(selected?.kind==='post'?'image':'video'));
  return <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <header className="flex flex-wrap justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Plan the next step</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Social Media Desk</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">Edit finished content, choose destinations and a publication time, then send the current version to your approver.</p></div><button onClick={onCreate} className="inline-flex h-fit items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm"><ArrowLeft size={16}/>Creator Studio</button></header>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[['READY_FOR_SCHEDULING','Ready to schedule'],['AWAITING_APPROVAL','Awaiting approval'],['SCHEDULED','Approved / scheduled'],['REJECTED','Rejected']].map(([value,label])=><button key={value} aria-pressed={filter===value} onClick={()=>setFilter(filter===value?'all':value)} className={`rounded-2xl border p-4 text-left ${filter===value?'border-indigo-300 bg-indigo-50':'bg-white'}`}><p className="text-sm text-slate-600">{label}</p><p className="mt-1 text-2xl font-bold">{jobs.filter(j=>j.status===value).length}</p></button>)}</div>
    {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}{notice&&<p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
    <div className="flex justify-between"><button onClick={()=>setFilter('all')} className="text-sm text-indigo-700 underline">All content</button><button onClick={()=>{setDirty(false);setError('');void refresh().catch(e=>setError(e.message));}} className="inline-flex items-center gap-2 text-sm text-indigo-700"><RefreshCw size={15}/>{dirty?'Reload saved version':'Refresh'}</button></div>
    {loading?<p role="status" className="text-sm text-slate-500">Loading content…</p>:!selected?<div className="rounded-2xl border border-dashed bg-white p-10 text-center"><CalendarClock className="mx-auto mb-3 text-slate-400"/><h2 className="font-semibold">No content in this view</h2><p className="mt-2 text-sm text-slate-500">Completed Creator Studio videos and image posts arrive here as drafts.</p></div>:<div className="grid items-start gap-5 lg:grid-cols-[280px_1fr]">
      <nav aria-label="Content scheduling queue" className="max-h-[800px] space-y-2 overflow-y-auto">{visible.map(job=><button key={job.id} onClick={()=>{setSelectedId(job.id);setDirty(false);}} className={`w-full rounded-xl border p-4 text-left ${job.id===selected.id?'border-indigo-300 bg-indigo-50':'bg-white'}`}><p className="text-xs font-medium text-indigo-600">{job.brandName} · {job.kind==='post'?'Image post':'Video'}</p><p className="mt-2 line-clamp-2 text-sm font-semibold">{job.title}</p><p className="mt-2 text-xs text-slate-500">{job.status.replaceAll('_',' ')}</p></button>)}</nav>
      <section className="space-y-5 rounded-2xl border bg-white p-5 sm:p-6"><div className="grid items-start gap-5 xl:grid-cols-[.8fr_1fr]"><div>{selected.kind==='post'?<img src={selected.fileUrl} alt={selected.title} className="max-h-[420px] w-full rounded-xl object-contain"/>:<video src={selected.fileUrl} controls preload="metadata" className="max-h-[420px] w-full rounded-xl bg-slate-950"/>}<p className="mt-3 text-xs text-slate-500">{selected.brandName} · Version {selected.revisionNumber} · {selected.status.replaceAll('_',' ')}</p><details className="mt-4 text-sm"><summary className="cursor-pointer font-medium">Original brief</summary><p className="mt-2 whitespace-pre-wrap text-slate-600">{selected.topic}</p></details></div>
        <fieldset disabled={!editable||busy} className="space-y-4"><label className="block space-y-2 text-sm font-medium">Title<input className={field} maxLength={255} value={title} onChange={e=>update(()=>setTitle(e.target.value))}/></label><label className="block space-y-2 text-sm font-medium">Caption<textarea className={field} rows={6} maxLength={5000} value={caption} onChange={e=>update(()=>setCaption(e.target.value))}/></label><label className="block space-y-2 text-sm font-medium">Hashtags<input className={field} maxLength={2000} value={hashtags} onChange={e=>update(()=>setHashtags(e.target.value))}/></label>
          <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-2 text-sm font-medium">Publication time<input type="datetime-local" className={field} value={localTime} onChange={e=>update(()=>setLocalTime(e.target.value))}/></label><label className="block space-y-2 text-sm font-medium">Timezone<input className={field} value={timezone} maxLength={80} onChange={e=>update(()=>setTimezone(e.target.value))}/></label></div>
          <fieldset className="space-y-2"><legend className="mb-2 text-sm font-semibold">Publish destinations</legend>{eligible.map(a=>{const id=String((a as any).accountId);return <label key={id} className="flex gap-2 rounded-lg border p-3 text-sm"><input type="checkbox" checked={accountIds.includes(id)} onChange={e=>update(()=>setAccountIds(ids=>e.target.checked?[...ids,id]:ids.filter(v=>v!==id)))}/>{a.accountName||a.accountHandle} · {a.platform}</label>;})}{!eligible.length&&<p className="text-sm text-amber-800">Reconnect an eligible account for this brand before sending for approval.</p>}</fieldset>
        </fieldset></div>
        {editable&&<><p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Saving an edit returns this version to Draft. A manager must approve the updated content and schedule before publication.</p><div className="flex flex-wrap gap-3"><button disabled={busy||!accountIds.length} onClick={()=>void save(false)} className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold disabled:opacity-50"><Save size={17}/>Save draft</button><button disabled={busy||!localTime||!accountIds.length} onClick={()=>void save(true)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><Send size={17}/>{busy?'Saving…':'Send for approval'}</button></div></>}
        {selected.review?.notes&&<div className="rounded-xl bg-amber-50 p-4 text-sm"><h3 className="font-semibold">Manager feedback</h3><p className="mt-2 whitespace-pre-wrap">{selected.review.notes}</p></div>}
      </section>
    </div>}
  </div>;
}
