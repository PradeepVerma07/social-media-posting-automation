import React,{useEffect,useRef,useState} from 'react';
import {Film,Image,Monitor,ArrowRight,RefreshCw,Loader2,Sparkles} from 'lucide-react';
import {api} from '../../api/client';
import {CreationPanel} from './CreationPanel';
import {SocialDestinationSelect} from './SocialDestinationSelect';
import type {Brand,SocialAccount} from '../../../server/src/types';

const field='w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';
export function CreatorStudio({brands,onOpenDesk}:{brands:Brand[];onOpenDesk:(id?:string)=>void}){
  const [kind,setKind]=useState<'video'|'post'>('video'),[brandId,setBrandId]=useState(brands[0]?.id||0);
  const [title,setTitle]=useState(''),[brief,setBrief]=useState(''),[caption,setCaption]=useState('');
  const [language,setLanguage]=useState('English'),[aspect,setAspect]=useState('9:16'),[duration,setDuration]=useState(30);
  const [status,setStatus]=useState<any>(null),[accounts,setAccounts]=useState<SocialAccount[]>([]),[accountIds,setAccountIds]=useState<string[]>([]);
  const [showTrash,setShowTrash]=useState(false),[actionBusy,setActionBusy]=useState(false);
  const trashRef=useRef(false),refreshing=useRef<Promise<void>|null>(null);trashRef.current=showTrash;
  const [jobs,setJobs]=useState<any[]>([]),[selectedId,setSelectedId]=useState(''),[busy,setBusy]=useState(false);
  const brandRef=useRef(brandId);brandRef.current=brandId;
  const [error,setError]=useState(''),[loadError,setLoadError]=useState(''),[notice,setNotice]=useState('');const requestId=useRef<string|null>(null);
  const refresh=()=>{
    if(refreshing.current)return refreshing.current;
    const requestedBrand=brandRef.current,trash=trashRef.current;
    const task=(async()=>{const [state,data,rows]=await Promise.all([api.getVideoAutomationStatus(),api.getVideoJobs(trash),requestedBrand?api.getSocialAccounts(requestedBrand):Promise.resolve([])]);
      setStatus(state);if(trash===trashRef.current)setJobs(data.jobs.filter(j=>j.workflow==='creator'));if(requestedBrand===brandRef.current)setAccounts(rows);setLoadError('');})();
    refreshing.current=task;void task.finally(()=>{refreshing.current=null;}).catch(()=>{});return task;
  };
  useEffect(()=>{void refresh().catch(e=>setLoadError(e.message));},[]);
  const hasActive=jobs.some(job=>['QUEUED','GENERATING','READY'].includes(job.status));
  useEffect(()=>{const timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh().catch(e=>setLoadError(e.message));},hasActive?5000:15000);return()=>clearInterval(timer);},[hasActive]);
  useEffect(()=>{setSelectedId('');setJobs([]);void (async()=>{await refreshing.current?.catch(()=>{});await refresh();})().catch(e=>setLoadError(e.message));},[showTrash]);
  useEffect(()=>{if(!brands.some(b=>b.id===brandId))setBrandId(brands[0]?.id||0);},[brands,brandId]);
  useEffect(()=>{setAccountIds([]);setAccounts([]);if(brandId)void refresh().catch(e=>setLoadError(e.message));},[brandId]);
  useEffect(()=>{setAccountIds([]);setAspect(kind==='post'?'1:1':'9:16');},[kind]);
  useEffect(()=>{requestId.current=null;},[kind,brandId,title,brief,caption,language,aspect,duration,accountIds]);
  const eligible=accounts.filter(account=>account.connectionStatus==='connected'&&status?.capabilities?.[account.platform]?.placements?.[kind==='post'?'feed':'reels_shorts']?.includes(kind==='post'?'image':'video'));
  const selected=jobs.find(j=>j.id===selectedId)||jobs[0];
  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');
    try{requestId.current||=crypto.randomUUID();const result=await api.createVideoJob({workflow:'creator',kind,requestId:requestId.current,brandId,accountIds,title,topic:brief,caption:caption||brief.slice(0,5000),language,aspectRatio:aspect,durationSeconds:duration,autoPublish:false});
      setShowTrash(false);trashRef.current=false;setJobs(previous=>[result.job,...previous.filter(j=>j.id!==result.job.id)]);setSelectedId(result.job.id);setNotice('Brief accepted. Creation will continue on your PC; the result will appear in Social Media Desk for editing and scheduling.');requestId.current=null;await refresh().catch(e=>setLoadError(e.message));
    }catch(e:any){setError(e.message);}finally{setBusy(false);}
  };
  const runAction=async(action:()=>Promise<any>,message:string)=>{
    if(actionBusy)return;setActionBusy(true);setError('');
    try{const result=await action();if(result.job&&!result.job.deletedAt)setSelectedId(result.job.id);setNotice(message);await refresh().catch(e=>setLoadError(e.message));}
    catch(e:any){setError(e.message);throw e;}finally{setActionBusy(false);}
  };
  const retry=async(job:any)=>{await runAction(()=>api.retryCreation(job.id),'Retry queued. A separate creation will return through scheduling and approval.');};
  const restore=async(job:any)=>{await runAction(()=>api.restoreCreation(job.id),'Creation restored. Review its schedule before submitting it for approval.');};
  const trash=async(job:any)=>{await runAction(()=>api.trashCreation(job.id,job.postVersion),'Creation moved to Trash. You can restore it from View Trash.');};
  return <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <header className="flex flex-wrap justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Create → schedule → approve</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Creator Studio</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">Paste a detailed brief, create a video or image post, and review the result before planning its publication.</p></div><span className={`inline-flex h-fit items-center gap-2 rounded-full px-3 py-2 text-xs font-medium ${status?.workerOnline?'bg-emerald-100 text-emerald-800':'bg-amber-100 text-amber-900'}`}><Monitor size={15}/>{status?.workerOnline?'Creation PC online':'Creation PC offline · briefs will wait'}</span></header>
    <div className="grid gap-3 sm:grid-cols-3">{['1 · Write the creative brief','2 · Edit and choose a schedule','3 · Get manager approval'].map(text=><div key={text} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700">{text}</div>)}</div>
    {(error||loadError)&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error||loadError}</p>}{notice&&<p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
    <div className="grid items-start gap-6 xl:grid-cols-[1.1fr_1fr]">
      <form onSubmit={submit} className="min-w-0 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex rounded-xl bg-slate-100 p-1">{(['video','post'] as const).map(value=><button key={value} type="button" aria-pressed={kind===value} onClick={()=>setKind(value)} className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold ${kind===value?'bg-white text-indigo-700 shadow-sm':'text-slate-600'}`}>{value==='video'?<Film size={17}/>:<Image size={17}/>} {value==='video'?'Video editor':'Image post creator'}</button>)}</div>
        <fieldset disabled={busy||!status?.canGenerate} className="space-y-4">
          <label className="block space-y-2 text-sm font-medium">Brand<select required className={field} value={brandId} onChange={e=>setBrandId(Number(e.target.value))}><option value={0} disabled>Select a brand</option>{brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <label className="block space-y-2 text-sm font-medium">Working title<input required maxLength={160} className={field} value={title} onChange={e=>setTitle(e.target.value)} placeholder="A short name for this content"/></label>
          <label className="block space-y-2 text-sm font-medium">{kind==='video'?'Detailed video description':'Detailed post description'}<textarea required minLength={10} maxLength={12000} rows={8} className={field} value={brief} onChange={e=>setBrief(e.target.value)} placeholder={kind==='video'?'Paste the script, scene descriptions, visual style, voice, captions, audience, verified details, and call to action.':'Paste your post brief, key message, audience, verified product details, visual direction, brand colours, and call to action.'}/></label>
          <label className="block space-y-2 text-sm font-medium">Caption guidance (optional)<textarea maxLength={5000} rows={2} className={field} value={caption} onChange={e=>setCaption(e.target.value)} placeholder="You can edit the final caption in Social Media Desk."/></label>
          <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-2 text-sm font-medium">Language<input required maxLength={50} className={field} value={language} onChange={e=>setLanguage(e.target.value)}/></label><label className="block space-y-2 text-sm font-medium">Format<select className={field} value={aspect} onChange={e=>setAspect(e.target.value)}>{(kind==='post'?['1:1','4:5','9:16','16:9']:['9:16','16:9','1:1']).map(a=><option key={a}>{a}</option>)}</select></label></div>
          {kind==='video'&&<label className="block space-y-2 text-sm font-medium">Video length (seconds)<input className={field} type="number" required min={5} max={180} value={duration} onChange={e=>setDuration(Number(e.target.value))}/></label>}
          <SocialDestinationSelect key={`${brandId}:${kind}`} options={eligible.map(account=>({id:String((account as any).accountId),name:account.accountName||account.accountHandle||account.platform,platform:account.platform}))} value={accountIds} onChange={setAccountIds} disabled={busy||!status?.canGenerate}/>
          {!eligible.length&&<p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Connect a supported account for this brand and content format.</p>}
        </fieldset><p className="text-xs text-slate-500">Creation uses Antigravity on your PC. Finished content stays as a draft until its schedule is set and a manager approves it.</p>
        <button disabled={busy||!status?.configured||!status?.canGenerate||!accountIds.length} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy?<Loader2 className="animate-spin" size={18}/>:<Sparkles size={18}/>}Create {kind==='video'?'video':'image post'}</button>
      </form>
      <CreationPanel jobs={jobs} selected={selected} onSelect={setSelectedId} onRefresh={()=>void refresh().catch(e=>setLoadError(e.message))} onOpenDesk={onOpenDesk}
        onTrash={trash} onRestore={job=>restore(job).catch(()=>{})} onRetry={retry} showTrash={showTrash} onToggleTrash={()=>setShowTrash(value=>!value)} canManage={!!status?.canGenerate} busy={actionBusy} workerOnline={!!status?.workerOnline}/>

    </div>
  </div>;
}
