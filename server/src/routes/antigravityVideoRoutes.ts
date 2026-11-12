import { Router, type Request, type Response, type NextFunction } from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { db } from '../db/sqlite';
import { canEdit, audit } from '../services/access';
import { canAutoPublishVideo, createVideoJob, claimVideoJob, formatVideoJob, leasedVideoJob,
  scheduleNextVideo, setVideoSetting, videoAccounts, videoError, videoPrincipal, videoSetting } from '../services/antigravityVideos';

export const videoDashboardRouter = Router();
export const videoMachineRouter = Router();
const wrap = (fn: (req: Request, res: Response) => any) => (req: Request, res: Response) => {
  Promise.resolve().then(() => fn(req,res)).catch(error => {
    if (error.videoJobId) db.prepare("UPDATE antigravity_video_jobs SET status='NEEDS_ATTENTION',error=?,updated_at=? WHERE id=? AND status='READY'")
      .run(error.message,new Date().toISOString(),error.videoJobId);
    if (!res.headersSent) res.status(error.status || 500).json({error: error.status ? error.message : 'The video operation could not be completed.'});
  });
};
const configured = () => (process.env.ANTIGRAVITY_N8N_KEY || '').length >= 32 && (process.env.ANTIGRAVITY_WORKER_KEY || '').length >= 32;
const keyAuth = (environment: string, header: string) => (req: Request, res: Response, next: NextFunction) => {
  const expected = process.env[environment] || ''; const supplied = req.get(header) || '';
  if (expected.length < 32) return res.status(503).json({error:'Video automation machine credentials are not configured.'});
  if (expected.length !== supplied.length || !crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(supplied))) return res.status(401).json({error:'Invalid automation credential.'});
  next();
};
const automationAuth = keyAuth('ANTIGRAVITY_N8N_KEY','X-Automation-Key');
const workerAuth = keyAuth('ANTIGRAVITY_WORKER_KEY','X-Worker-Key');
const uploadRoot = () => path.resolve(process.env.UPLOADS_DIRECTORY || path.join(process.env.DATA_DIRECTORY || process.cwd(),'uploads'));
const uploadLimit = () => Math.min(1024 * 1024 * 1024,Math.max(1024,Number(process.env.ANTIGRAVITY_MAX_UPLOAD_BYTES) || 524288000));
const activeUploads = new Set<string>();

videoDashboardRouter.get('/status', (req,res) => {
  const worker = videoSetting('worker');
  res.json({configured:configured(),dispatcherConfigured:!!process.env.ANTIGRAVITY_DISPATCH_URL,
    canGenerate:canEdit(req.principal),canAutoPublish:canAutoPublishVideo(req.principal),
    workerOnline:!!worker && Date.now()-Date.parse(worker.lastSeenAt)<90000,worker,
    publishingEnabled:process.env.ENABLE_BACKGROUND_WORKERS==='true',supportedPlatforms:['instagram'],
    manualDefaults:videoSetting(`manual:${req.principal.id}`)});
});
videoDashboardRouter.get('/jobs', (req,res) => {
  const principal=req.principal;
  const rows = principal.global ? db.prepare('SELECT * FROM antigravity_video_jobs ORDER BY created_at DESC LIMIT 50').all()
    : db.prepare('SELECT * FROM antigravity_video_jobs WHERE client_id=? ORDER BY created_at DESC LIMIT 50').all(principal.clientId);
  res.json({jobs:rows.map(formatVideoJob)});
});
videoDashboardRouter.post('/jobs',wrap(async(req,res)=>{
  if (!configured()) return videoError('An administrator must configure the local video worker connection first.',503);
  const row:any=createVideoJob(req.principal,req.body);
  let dispatchPending=!row.dispatched;
  const target=process.env.ANTIGRAVITY_DISPATCH_URL;
  if (dispatchPending && target) {
    const url=new URL(target);
    const expected=new URL(process.env.N8N_BASE_URL || 'https://n8n.webtrionix.com');
    if (url.origin!==expected.origin || url.protocol!=='https:') return videoError('The Antigravity dispatch URL must use the configured n8n HTTPS origin.',503);
    try {
      const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-Automation-Key':process.env.ANTIGRAVITY_N8N_KEY!},
        body:JSON.stringify({jobId:row.id}),signal:AbortSignal.timeout(5000),redirect:'error'});
      dispatchPending=!response.ok;
    } catch { dispatchPending=true; }
  }
  res.status(202).json({job:formatVideoJob(db.prepare('SELECT * FROM antigravity_video_jobs WHERE id=?').get(row.id)),dispatchPending});
}));
videoDashboardRouter.post('/manual-defaults',wrap((req,res)=>{
  if (!canEdit(req.principal)) return videoError('Content editing permission is required.',403);
  if (req.body.enabled===false) {
    db.prepare("DELETE FROM antigravity_video_settings WHERE key='manual:active' AND json_extract(value_json,'$.userId')=?").run(req.principal.id);
    setVideoSetting(`manual:${req.principal.id}`,null);
    return res.json({enabled:false});
  }
  const {brand,accounts}=videoAccounts(req.principal,req.body.brandId,req.body.accountIds);
  if(req.body.autoPublish===true&&!canAutoPublishVideo(req.principal))return videoError('Automatic publishing is not enabled for your role and workspace.',403);
  const previous=videoSetting('manual:active');
  if(previous&&previous.userId!==req.principal.id)return videoError('Another user owns the local-folder routing. Ask that user to disable it before changing brands.',409);
  const value={userId:req.principal.id,brandId:brand.brand_id,accountIds:accounts.map(a=>a.account_id),autoPublish:req.body.autoPublish===true,enabled:true};
  setVideoSetting('manual:active',value);setVideoSetting(`manual:${req.principal.id}`,value);
  audit(req.principal,'antigravity_video','manual-folder','configure',{brandId:brand.brand_id,enabled:true,autoPublish:value.autoPublish});
  res.json(value);
}));

videoMachineRouter.post('/dispatch',automationAuth,wrap((req,res)=>{
  const result=db.prepare("UPDATE antigravity_video_jobs SET dispatched=1,updated_at=? WHERE id=? AND status='QUEUED'").run(new Date().toISOString(),String(req.body.jobId||''));
  res.json({accepted:true,updated:Number(result.changes)});
}));
videoMachineRouter.post('/dispatch-pending',automationAuth,wrap((_req,res)=>{
  const result=db.prepare("UPDATE antigravity_video_jobs SET dispatched=1,updated_at=? WHERE dispatched=0 AND status='QUEUED'").run(new Date().toISOString());
  res.json({released:Number(result.changes)});
}));
videoMachineRouter.post('/schedule-next',automationAuth,wrap((_req,res)=>res.json(scheduleNextVideo())));
videoMachineRouter.post('/worker/ping',workerAuth,wrap((req,res)=>{
  setVideoSetting('worker',{workerId:String(req.body.workerId||'').slice(0,100),lastSeenAt:new Date().toISOString(),cliReady:req.body.cliReady===true});
  res.json({ok:true});
}));
videoMachineRouter.post('/worker/claim',workerAuth,wrap((req,res)=>res.json(claimVideoJob(String(req.body.workerId||'')))));
videoMachineRouter.post('/worker/heartbeat',workerAuth,wrap((req,res)=>{
  const row=leasedVideoJob(String(req.body.jobId||''),String(req.body.leaseToken||''));
  if(!['GENERATING','NEEDS_ATTENTION'].includes(row.status))return videoError('This generation is no longer active.',409);
  db.prepare('UPDATE antigravity_video_jobs SET lease_until=?,updated_at=? WHERE id=?').run(new Date(Date.now()+120000).toISOString(),new Date().toISOString(),row.id);
  res.json({ok:true});
}));
videoMachineRouter.post('/worker/fail',workerAuth,wrap((req,res)=>{
  const row=leasedVideoJob(String(req.body.jobId||''),String(req.body.leaseToken||''));
  if(['GENERATING','NEEDS_ATTENTION'].includes(row.status))db.prepare("UPDATE antigravity_video_jobs SET status='FAILED',error=?,updated_at=? WHERE id=?")
    .run(String(req.body.error||'Local generation failed.').slice(0,500),new Date().toISOString(),row.id);
  res.json({ok:true});
}));
videoMachineRouter.post('/worker/discover',workerAuth,wrap((req,res)=>{
  const defaults=videoSetting('manual:active');
  if(!defaults?.enabled)return videoError('Choose a brand and connected accounts for the local output folder in AI Studio first.',422);
  const filename=String(req.body.filename||'');const digest=String(req.body.sha256||'');
  if(!/^[a-f0-9]{64}$/.test(digest)||path.basename(filename)!==filename||!filename.toLowerCase().endsWith('.mp4'))return videoError('Invalid local video metadata.');
  const principal=videoPrincipal(defaults.userId);
  const requestId=`manual:${defaults.brandId}:${digest}`;
  let row:any=db.prepare('SELECT * FROM antigravity_video_jobs WHERE request_id=?').get(requestId);
  if(row?.file_sha256)return res.json({job:formatVideoJob(row),alreadyStored:true});
  if(!row)row=createVideoJob(principal,{...defaults,requestId,topic:`Video generated in Antigravity: ${filename}`,title:filename.replace(/\.mp4$/i,'').replace(/[_-]+/g,' '),caption:filename.replace(/\.mp4$/i,'').replace(/[_-]+/g,' ')},true);
  else videoAccounts(principal,row.brand_id,JSON.parse(row.input_json).accountIds);
  const leaseToken=row.lease_token||crypto.randomBytes(32).toString('hex');
  if(!['QUEUED','GENERATING','NEEDS_ATTENTION'].includes(row.status))return videoError('This local video requires attention in AI Studio.',409);
  db.prepare("UPDATE antigravity_video_jobs SET status='GENERATING',dispatched=1,lease_token=?,lease_until=?,updated_at=? WHERE id=?")
    .run(leaseToken,new Date(Date.now()+120000).toISOString(),new Date().toISOString(),row.id);
  res.json({job:formatVideoJob({...row,status:'GENERATING'}),leaseToken});
}));
videoMachineRouter.put('/worker/upload/:id',workerAuth,wrap(async(req,res)=>{
  const row=leasedVideoJob(req.params.id,String(req.get('X-Job-Lease')||''));
  const digest=String(req.get('X-Content-SHA256')||'');const length=Number(req.get('Content-Length'));
  if(req.get('Content-Type')!=='video/mp4'||!Number.isSafeInteger(length)||length<24||length>uploadLimit()||!/^[a-f0-9]{64}$/.test(digest))return videoError('Send a complete MP4 with a valid length and SHA-256 digest.');
  if(row.file_sha256){req.resume();if(row.file_sha256!==digest)return videoError('This job already has a different completed video.',409);return res.json({job:formatVideoJob(row)});}
  if(!['GENERATING','NEEDS_ATTENTION'].includes(row.status))return videoError('This job cannot receive a video.',409);
  if(activeUploads.has(row.id))return videoError('An upload is already running for this job.',409);
  const base=new URL(process.env.PUBLIC_BASE_URL||process.env.APP_URL||'https://360.webtrionix.com');
  if(base.protocol!=='https:'&&process.env.NODE_ENV!=='test')return videoError('Configure an HTTPS public dashboard URL.',503);
  activeUploads.add(row.id);
  const temporary=path.join(uploadRoot(),`${row.id}.${crypto.randomUUID()}.part`);
  const target=path.join(uploadRoot(),`${row.id}.mp4`);
  let complete=false;
  try{
    await fs.mkdir(uploadRoot(),{recursive:true});
    const handle=await fs.open(temporary,'wx',0o600);const hash=crypto.createHash('sha256');let received=0;let prefix=Buffer.alloc(0);
    try{for await(const chunk of req){const bytes=Buffer.from(chunk);received+=bytes.length;if(received>length||received>uploadLimit())return videoError('Video upload is larger than declared.',413);hash.update(bytes);if(prefix.length<12)prefix=Buffer.concat([prefix,bytes.subarray(0,12-prefix.length)]);await handle.writeFile(bytes);}}
    finally{await handle.close();}
    if(received!==length||hash.digest('hex')!==digest||prefix.toString('ascii',4,8)!=='ftyp')return videoError('Video upload is incomplete or its checksum does not match.');
    await fs.rename(temporary,target);
    const now=new Date().toISOString();const publishAt=new Date(Date.parse(now)+600000).toISOString();
    const fileUrl=new URL(`/uploads/${row.id}.mp4`,base).toString();
    db.prepare("UPDATE antigravity_video_jobs SET status='READY',file_url=?,file_sha256=?,ready_at=?,publish_at=?,error=NULL,updated_at=? WHERE id=? AND file_sha256 IS NULL")
      .run(fileUrl,digest,now,publishAt,now,row.id);
    complete=true;res.status(201).json({job:formatVideoJob(db.prepare('SELECT * FROM antigravity_video_jobs WHERE id=?').get(row.id))});
  }finally{activeUploads.delete(row.id);if(!complete)await fs.rm(temporary,{force:true}).catch(()=>{});}
}));
