import React,{useEffect,useState} from 'react';
import {ArrowRight,CalendarClock,CheckCircle2,Film,Monitor,RefreshCw,ShieldCheck,Workflow,AlertCircle} from 'lucide-react';
import {api} from '../../api/client';
import {isTabAllowed} from '../../utils/rbac';
import type {Post,Brand,RoleName} from '../../../server/src/types';

interface AIStudioDashboardProps {posts?:Post[];brands?:Brand[];selectedBrandId?:number|null;currentRole?:RoleName;onNavigateToTab?:(tab:string)=>void;}
const panel='rounded-2xl border border-slate-200 bg-white p-5 sm:p-6';
export const AIStudioDashboard:React.FC<AIStudioDashboardProps>=({posts=[],brands=[],selectedBrandId=null,currentRole='Client',onNavigateToTab})=>{
  const [status,setStatus]=useState<any>(null),[jobs,setJobs]=useState<any[]>([]),[n8n,setN8n]=useState<any>(null);
  const [error,setError]=useState(''),[loading,setLoading]=useState(true);
  const refresh=async()=>{
    setLoading(true);setError('');
    const results=await Promise.allSettled([api.getVideoAutomationStatus(),api.getVideoJobs(),currentRole==='Super Admin'?api.getN8nHealth():Promise.resolve(null)]);
    if(results[0].status==='fulfilled')setStatus(results[0].value);else setError(results[0].reason.message);
    if(results[1].status==='fulfilled')setJobs(results[1].value.jobs);else setError(results[1].reason.message);
    if(results[2].status==='fulfilled')setN8n(results[2].value);else setN8n({reachable:false});
    setLoading(false);
  };
  useEffect(()=>{void refresh();const timer=setInterval(()=>void refresh(),30000);return()=>clearInterval(timer);},[currentRole]);
  const scopedJobs=jobs.filter(j=>!selectedBrandId||j.uiBrandId===selectedBrandId);
  const scopedPosts=posts.filter(p=>!selectedBrandId||p.brandId===selectedBrandId);
  const brandName=brands.find(b=>b.id===selectedBrandId)?.name||'All brands';
  const navigate=(tab:string)=>onNavigateToTab?.(tab);
  const allowed=(tab:string)=>isTabAllowed(tab as any,currentRole);
  const steps=[{tab:'creator',label:'Create content',detail:'Paste a detailed video or image-post brief. Antigravity creates the media on your connected PC.',icon:Film,action:'Open Creator Studio'},
    {tab:'social-desk',label:'Edit & schedule',detail:'Review the result, edit the caption, select accounts and choose a publication time.',icon:CalendarClock,action:'Open Social Media Desk'},
    {tab:'video-approvals',label:'Manager approval',detail:'Approve the planned version, reject it, or request changes with instructions for recreation.',icon:ShieldCheck,action:'Open Creator Approvals'}];
  const failures=scopedPosts.filter(p=>p.platforms?.some(t=>['failed','needs_reconciliation'].includes(String(t.publishingStatus))));
  return <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-blue-700">Content automation · {brandName}</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Automation Studio</h1><p className="mt-2 max-w-2xl text-sm text-slate-600">Create content, plan its publication, and send it to your manager for approval.</p></div><button type="button" disabled={loading} onClick={()=>void refresh()} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-50"><RefreshCw size={16} className={loading?'animate-spin':''}/>Refresh status</button></header>
    {error&&<p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    <section aria-label="Automation connections" className="grid gap-3 md:grid-cols-3">{[
      {name:'Antigravity PC',icon:Monitor,ok:status?.workerOnline,text:!status?'Checking connection…':status.workerOnline?'Online · ready to create':'Offline · new briefs wait for the PC'},
      {name:'n8n workflow',icon:Workflow,ok:status?.configured&&status?.dispatcherConfigured&&(currentRole!=='Super Admin'||n8n?.reachable),text:!status?'Checking connection…':!status.configured||!status.dispatcherConfigured?'Connection needs setup':n8n?.reachable?'Connected · checks completed output every minute':currentRole==='Super Admin'?'n8n is unreachable':'Dispatch configured · managed by administrator'},
      {name:'Scheduled publishing',icon:CheckCircle2,ok:status?.publishingEnabled,text:!status?'Checking publisher…':status.publishingEnabled?'Enabled · manager approval required':'Publisher is paused'},
    ].map(item=><div key={item.name} className={panel+' flex items-start gap-3'}><span className={'rounded-xl p-2.5 '+(item.ok?'bg-emerald-50 text-emerald-700':'bg-slate-100 text-slate-500')}><item.icon size={20}/></span><div><h2 className="text-sm font-semibold text-slate-900">{item.name}</h2><p className="mt-1 text-xs leading-5 text-slate-600">{item.text}</p></div></div>)}</section>
    <section aria-label="Automation workflow" className="grid gap-4 lg:grid-cols-3">{steps.map((step,index)=><article key={step.tab} className={panel+' flex flex-col'}><div className="flex items-center justify-between"><span className="rounded-xl bg-blue-50 p-3 text-blue-700"><step.icon size={22}/></span><span className="text-xs font-semibold text-slate-400">STEP {index+1}</span></div><h2 className="mt-5 text-lg font-semibold text-slate-950">{step.label}</h2><p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{step.detail}</p>{allowed(step.tab)?<button type="button" onClick={()=>navigate(step.tab)} className="mt-5 inline-flex items-center justify-between gap-2 rounded-xl bg-blue-700 px-4 py-3 text-left text-sm font-semibold text-white hover:bg-blue-800">{step.action}<ArrowRight size={16}/></button>:<p className="mt-5 text-xs text-slate-500">Handled by your {index===2?'approver':'content team'}.</p>}</article>)}</section>
    <section aria-label="Current automation jobs" className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[['Queued',scopedJobs.filter(j=>j.status==='QUEUED').length],['Creating',scopedJobs.filter(j=>j.status==='GENERATING').length],['Ready to schedule',scopedJobs.filter(j=>j.status==='READY_FOR_SCHEDULING').length],['Awaiting approval',scopedJobs.filter(j=>j.status==='AWAITING_APPROVAL').length]].map(([label,count])=><div key={String(label)} className={panel}><h2 className="text-xs font-medium text-slate-600">{label}</h2><p className="mt-2 text-2xl font-bold text-slate-950">{status?count:'—'}</p></div>)}</section>
    {!!failures.length&&<section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex gap-3"><AlertCircle size={20} className="shrink-0 text-amber-700"/><div><h2 className="font-semibold text-amber-950">{failures.length} post{failures.length===1?'':'s'} need publishing attention</h2><p className="mt-1 text-sm text-amber-900">Open Failure details for the cause, connection checks and available retry actions.</p></div></div>{allowed('content')&&<button type="button" onClick={()=>navigate('content')} className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-950">Review failures</button>}</section>}
    <section className={panel}><header className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-950">Recent creations</h2><p className="mt-1 text-xs text-slate-500">Latest jobs for the selected brand scope.</p></div>{allowed('creator')&&<button type="button" onClick={()=>navigate('creator')} className="text-sm font-medium text-blue-700">View all</button>}</header><div className="mt-4 divide-y divide-slate-100">{scopedJobs.slice(0,6).map(job=><div key={job.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0 flex-1"><p className="line-clamp-1 text-sm font-semibold text-slate-900">{job.title}</p><p className="mt-1 text-xs text-slate-500">{job.brandName} · {job.kind==='post'?'Image post':'Video'}</p></div><span className={'rounded-full px-3 py-1 text-xs font-medium '+(/FAILED|NEEDS_ATTENTION/.test(job.status)?'bg-amber-50 text-amber-900':'bg-blue-50 text-blue-800')}>{job.status.replaceAll('_',' ')}</span></div>)}</div>{!scopedJobs.length&&<p className="py-8 text-center text-sm text-slate-500">{loading?'Loading creations…':'No creations yet. Start with a detailed brief in Creator Studio.'}</p>}</section>
    <p className="text-xs leading-5 text-slate-500">Keep the creation PC awake with the worker running. Videos support Instagram Reels; image posts support eligible Facebook and Instagram feeds. Nothing publishes until the current version is approved.</p>
  </div>;
};
