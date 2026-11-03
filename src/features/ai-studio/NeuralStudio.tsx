import React, { useEffect, useState } from 'react';
import { Sparkles, Loader2, AlertCircle, Copy, FileText, Download } from 'lucide-react';
import { api } from '../../api/client';
import type { Brand, Post } from '../../../server/src/types';
import type { StudioInput, StudioTextOutput } from '../../../server/src/services/ai/studioGemini';

interface Props { brands?: Brand[]; posts?: Post[]; onNavigateToTab?: (tab:string)=>void; }
type Result = { id:string; text:StudioTextOutput|null; imageUrl:string|null; model:string; usage:{inputTokens:number|null;outputTokens:number|null}; };
const field = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-60';
const tasks = [['write','Write a post'],['rewrite','Improve copy'],['review','Review content'],['image','Create or edit an image']] as const;

export const GeminiStudio: React.FC<Props> = ({brands=[],posts=[],onNavigateToTab}) => {
  const [status,setStatus] = useState<Awaited<ReturnType<typeof api.getStudioStatus>>|null>(null);
  const [brandId,setBrandId] = useState(brands[0]?.id || 0);
  const [task,setTask] = useState<StudioInput['task']>('write');
  const [prompt,setPrompt] = useState('');
  const [platform,setPlatform] = useState<StudioInput['platform']>('instagram');
  const [tone,setTone] = useState<StudioInput['tone']>('professional');
  const [language,setLanguage] = useState('English');
  const [aspectRatio,setAspectRatio] = useState<StudioInput['aspectRatio']>('1:1');
  const [sourceImage,setSourceImage] = useState<StudioInput['sourceImage']>();
  const [busy,setBusy] = useState(false);
  const [saving,setSaving] = useState(false);
  const [saved,setSaved] = useState(false);
  const [copied,setCopied] = useState(false);
  const [error,setError] = useState('');
  const [result,setResult] = useState<Result|null>(null);
  const [resultBrandId,setResultBrandId] = useState(0);
  const [history,setHistory] = useState<any[]>([]);
  const [historyError,setHistoryError] = useState('');
  const loadHistory = () => api.getStudioHistory().then(r=>{setHistory(r.data);setHistoryError('');}).catch(()=>setHistoryError('Recent activity could not be loaded.'));
  const loadStatus = () => {setError('');api.getStudioStatus().then(setStatus).catch(e=>setError(e.message));};
  useEffect(()=>{loadStatus();loadHistory();},[]);
  useEffect(()=>{if(!brands.some(b=>b.id===brandId)){setBrandId(brands[0]?.id||0);setResult(null);}},[brands,brandId]);
  const clearResult = () => {setResult(null);setSaved(false);setError('');setCopied(false);};
  const readImage = async (file?:File) => {
    setError('');setSourceImage(undefined);if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>6_000_000){setError('Choose a PNG, JPEG, or WebP image smaller than 6 MB.');return;}
    try {
      const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Could not read the image.'));reader.readAsDataURL(file);});
      setSourceImage({mimeType:file.type as 'image/png'|'image/jpeg'|'image/webp',data});
    }catch(e:any){setError(e.message);}
  };
  const generate = async (event:React.FormEvent) => {
    event.preventDefault();if(busy)return;setBusy(true);clearResult();
    try {setResult(await api.generateStudio({brandId,task,prompt,platform,tone,language,aspectRatio,...(task==='image'&&sourceImage?{sourceImage}:{})}));setResultBrandId(brandId);}
    catch(e:any){setError(e.message);}finally{setBusy(false);loadHistory();}
  };
  const saveDraft = async () => {
    if(!result?.text||saving||saved)return;setSaving(true);setError('');
    try {await api.createPost({brandId:resultBrandId,title:result.text.title,masterCaption:result.text.caption,hashtags:result.text.hashtags,platforms:[],media:[],submitForApproval:false});setSaved(true);}
    catch(e:any){setError(e.message);}finally{setSaving(false);}
  };
  const copy = async () => {if(!result?.text)return;try{await navigator.clipboard.writeText([result.text.caption,result.text.hashtags.join(' ')].filter(Boolean).join('\n\n'));setCopied(true);}catch{setError('Clipboard access was denied. Select the text and copy it manually.');}};
  return <div className="mx-auto max-w-7xl space-y-6 p-4 pb-24 sm:p-6">
    <header className="rounded-2xl bg-slate-950 p-6 text-white sm:p-8"><div className="mb-3 flex items-center gap-2 text-sm text-indigo-200"><Sparkles size={18}/>Google Gemini</div><h1 className="text-2xl font-semibold sm:text-3xl">AI Neural Studio</h1><p className="mt-2 max-w-2xl text-slate-300">Create content, improve your copy, and develop visuals for your brand. Review every result before adding it to your publishing workflow.</p></header>
    {!status ? <div className="rounded-xl border bg-white p-4"><p>{error||'Checking Gemini configuration…'}</p>{error&&<button onClick={loadStatus} className="mt-2 text-indigo-700">Retry connection check</button>}</div> : !status.configured || !status.canGenerate ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{!status.configured?status.message:'Content editing permission is required to generate.'}{!status.configured&&<button onClick={loadStatus} className="ml-3 underline">Check again</button>}</div> : null}
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={generate} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <fieldset disabled={busy||saving} className="space-y-5">
          <legend className="mb-4 text-lg font-semibold">Your brief</legend>
          <label className="block space-y-2 text-sm font-medium">Brand<select className={field} value={brandId} onChange={e=>{setBrandId(Number(e.target.value));clearResult();}} required><option value={0} disabled>Select a brand</option>{brands.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <div className="grid grid-cols-2 gap-2" aria-label="Choose a tool">{tasks.map(([key,label])=><button key={key} type="button" aria-pressed={task===key} onClick={()=>{setTask(key);clearResult();}} className={`rounded-xl border p-3 text-left text-sm font-medium ${task===key?'border-indigo-600 bg-indigo-50':'border-slate-200 hover:bg-slate-50'}`}>{label}</button>)}</div>
          {task!=='image'&&<label className="block space-y-2 text-sm font-medium">Start from an existing post (optional)<select className={field} value="" onChange={e=>{const post=posts.find(p=>String(p.id)===e.target.value);if(post){setPrompt(post.masterCaption);clearResult();}}}><option value="">Choose a post to copy into this brief</option>{posts.filter(p=>p.brandId===brandId).map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>}
          <label className="block space-y-2 text-sm font-medium">{task==='image'?'Describe the image or edits you want':'Brief or text to improve'}<textarea required minLength={10} maxLength={12000} rows={7} className={field} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder={task==='image'?'Describe the subject, composition, style, and text to include.':'Add your topic, audience, verified facts, and call to action.'}/><span className="block text-right text-xs font-normal text-slate-500">{prompt.length.toLocaleString()} / 12,000</span></label>
          {task==='image'?<><label className="block space-y-2 text-sm font-medium">Reference image (optional)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>readImage(e.target.files?.[0])} className={field}/><span className="block text-xs font-normal text-slate-500">PNG, JPEG, or WebP · up to 6 MB. Leave empty to create a new image.</span></label>{sourceImage&&<div><img src={`data:${sourceImage.mimeType};base64,${sourceImage.data}`} alt="Reference image" className="max-h-48 rounded-xl object-contain"/><button type="button" className="mt-2 text-sm underline" onClick={()=>setSourceImage(undefined)}>Remove reference</button></div>}<label className="block space-y-2 text-sm font-medium">Aspect ratio<select className={field} value={aspectRatio} onChange={e=>setAspectRatio(e.target.value as StudioInput['aspectRatio'])}>{['1:1','4:5','9:16','16:9'].map(v=><option key={v}>{v}</option>)}</select></label></>:<div className="grid gap-3 sm:grid-cols-2"><label className="space-y-2 text-sm font-medium">Platform<select className={field} value={platform} onChange={e=>setPlatform(e.target.value as StudioInput['platform'])}>{['facebook','instagram','linkedin','youtube','x','whatsapp'].map(v=><option key={v} value={v}>{v==='x'?'X':v[0].toUpperCase()+v.slice(1)}</option>)}</select></label><label className="space-y-2 text-sm font-medium">Tone<select className={field} value={tone} onChange={e=>setTone(e.target.value as StudioInput['tone'])}>{['professional','friendly','concise','persuasive'].map(v=><option key={v}>{v}</option>)}</select></label></div>}
          <label className="block space-y-2 text-sm font-medium">Language<input required minLength={2} maxLength={50} className={field} value={language} onChange={e=>setLanguage(e.target.value)}/></label>
          <p className="text-xs leading-relaxed text-slate-500">Generating sends your brief, brand name, and any reference image to Google Gemini. Only include material you are permitted to share. Review results for mistakes.</p>
          <button disabled={!status?.configured||!status.canGenerate||!brandId||prompt.trim().length<10} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50" type="submit">{busy?<Loader2 className="animate-spin" size={18}/>:<Sparkles size={18}/>} {busy?'Generating…':task==='image'?'Generate image':'Generate content'}</button>
        </fieldset>
      </form>
      <section aria-live="polite" aria-busy={busy} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Review your result</h2>
        {error&&<div role="alert" className="mt-4 flex gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-800"><AlertCircle className="shrink-0" size={18}/><p>{error}</p></div>}
        {busy?<div className="py-20 text-center text-slate-600"><Loader2 className="mx-auto mb-3 animate-spin"/><p>Gemini is working on your brief.</p><p className="mt-2 text-sm">This can take up to 90 seconds.</p></div>:!result?<div className="py-20 text-center text-slate-500"><FileText className="mx-auto mb-3"/><p>Your generated result will appear here.</p></div>:<div className="mt-5 space-y-5">
          <p className="text-xs text-slate-500">Generated with {result.model} · {brands.find(b=>b.id===resultBrandId)?.name||'Selected brand'}</p>
          {result.text&&<><h3 className="text-xl font-semibold">{result.text.title}</h3><p className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 leading-relaxed">{result.text.caption}</p>{result.text.hashtags.length>0&&<p className="break-words text-sm text-indigo-700">{result.text.hashtags.join(' ')}</p>}{[['Suggested improvements',result.text.suggestions],['Check before publishing',result.text.checks]].map(([title,items])=>(items as string[]).length>0&&<div key={title as string}><h4 className="mb-2 font-medium">{title as string}</h4><ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">{(items as string[]).map((item,i)=><li key={i}>{item}</li>)}</ul></div>)}<div className="flex flex-wrap gap-3"><button type="button" onClick={copy} className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm"><Copy size={16}/>{copied?'Copied':'Copy caption'}</button><button type="button" disabled={saving||saved||!status?.canGenerate} onClick={saveDraft} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving?'Saving…':saved?'Draft saved':'Save as draft'}</button></div>{saved&&<p role="status" className="text-sm text-green-700">Saved as an unscheduled draft. Add media and channels before submitting for approval. <button className="underline" onClick={()=>onNavigateToTab?.('content')}>Open content</button></p>}</>}
          {result.imageUrl&&<><img src={result.imageUrl} alt="Image generated by Gemini from your brief" className="w-full rounded-xl object-contain"/><a href={result.imageUrl} download={`gemini-${result.id}`} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm"><Download size={16}/>Download image</a><p className="text-sm text-slate-500">Review the image, then upload it in the post composer.</p></>}
          <p className="text-xs text-slate-500">Provider-reported tokens: {result.usage.inputTokens??'Unavailable'} input · {result.usage.outputTokens??'Unavailable'} output</p>
        </div>}
      </section>
    </div>
    <section className="rounded-2xl border bg-white p-5"><div className="flex justify-between"><h2 className="font-semibold">Your recent activity</h2><button onClick={loadHistory} className="text-sm text-indigo-700">Refresh</button></div>{historyError&&<p role="alert" className="mt-3 text-sm text-red-700">{historyError}</p>}{!history.length?<p className="mt-3 text-sm text-slate-500">No generations yet.</p>:<ul className="mt-3 divide-y">{history.map(item=><li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><span>{item.task} · {item.status} · {new Date(item.createdAt).toLocaleString()}</span>{item.result&&<button disabled={busy||saving} onClick={()=>{const brand=brands.find(b=>(b as any).brandId===item.brandId);if(!brand){setError('This brand is no longer available to you.');return;}setResult({id:item.id,...item.result});setResultBrandId(brand.id);setSaved(false);setError('');setCopied(false);}} className="text-indigo-700 disabled:opacity-50">View result</button>}</li>)}</ul>}</section>
  </div>;
};
