import {DateTime} from 'luxon';
import crypto from 'node:crypto';
import {db} from '../db/sqlite';
import {audit,canAccessBrand,canEdit,resolveBrand,type Principal} from './access';
import {formatVideoJob,videoAccounts,videoError,videoTx} from './antigravityVideos';
import {computeIdempotencyKey} from '../utils/idGenerator';
import {sseManager} from './sseManager';

function editable(principal:Principal,id:string,version:unknown){
  if(!canEdit(principal))return videoError('Content editing permission is required.',403);
  const job:any=db.prepare('SELECT * FROM antigravity_video_jobs WHERE id=?').get(id);
  if(!job||!canAccessBrand(principal,resolveBrand(job.brand_id)))return videoError('Creator content not found.',404);
  const input=JSON.parse(job.input_json);
  if(input.workflow!=='creator')return videoError('Use the existing post queue for this content.',409);
  const post:any=job.post_id&&db.prepare('SELECT * FROM posts WHERE post_id=? AND deleted_at IS NULL').get(job.post_id);
  if(!post||!['READY_FOR_SCHEDULING','AWAITING_APPROVAL','SCHEDULED'].includes(job.status))return videoError('This version cannot be edited in the scheduling desk.',409);
  if(!Number.isInteger(version)||version!==post.version)return videoError('The content changed. Refresh before saving.',409);
  if(db.prepare("SELECT 1 FROM post_targets WHERE post_id=? AND status IN ('Processing','NeedsVerification','Posted')").get(post.post_id))return videoError('Publishing has started. Create a new content version instead.',409);
  return {job,input,post};
}

export function saveCreatorSchedule(principal:Principal,id:string,raw:any){
  let tenant='';
  const result=videoTx(()=>{
    const {job,input,post}=editable(principal,id,raw.versionNumber);
    const title=String(raw.title??post.title).trim(),caption=String(raw.caption??raw.masterCaption??post.caption).trim();
    const hashtags=String(raw.hashtags??post.hashtags??'').trim();
    if(!title||title.length>255||!caption||caption.length>5000||hashtags.length>2000)return videoError('Enter a title, a caption up to 5,000 characters, and hashtags up to 2,000 characters.');
    const {brand,accounts}=videoAccounts(principal,job.brand_id,raw.accountIds??input.accountIds,input.kind);
    const timezone=String(raw.timezone||post.timezone||brand.default_timezone||'Asia/Kolkata');
    if(!DateTime.now().setZone(timezone).isValid)return videoError('Choose a valid timezone.');
    const revision=JSON.parse(post.revision_data||'{}');let scheduledAt=revision.unscheduled?null:post.scheduled_utc;
    if(Object.hasOwn(raw,'localDateTime')){
      if(!raw.localDateTime)scheduledAt=null;
      else{
        const rawStr=String(raw.localDateTime).trim();
        const norm=rawStr.length>=16?rawStr.slice(0,16):rawStr;
        const at=DateTime.fromISO(norm,{zone:timezone});
        if(!at.isValid||at.toFormat("yyyy-MM-dd'T'HH:mm")!==norm||at.getPossibleOffsets().length>1)return videoError('Choose an unambiguous, valid local publication time.');
        scheduledAt=at.toUTC().toISO();
      }
    }else if(Object.hasOwn(raw,'scheduledAt')){
      if(!raw.scheduledAt)scheduledAt=null;
      else{
        if(!/([zZ]|[+-]\d{2}:\d{2})$/.test(String(raw.scheduledAt)))return videoError('Publication time must include a timezone offset.');
        const at=DateTime.fromISO(String(raw.scheduledAt),{setZone:true});
        if(!at.isValid)return videoError('Choose a valid publication time.');
        scheduledAt=at.toUTC().toISO();
      }
    }
    if(scheduledAt&&Date.parse(scheduledAt)<=Date.now())return videoError('Choose a future publication time.');
    const now=new Date().toISOString();const date=DateTime.fromISO(scheduledAt||now).setZone(timezone);const version=post.version+1;
    const platforms=accounts.map(a=>({platform:a.platform,accountId:a.account_id}));
    const updatedRevision={...revision,unscheduled:!scheduledAt,platforms,creatorWorkflow:true};
    db.prepare(`UPDATE posts SET title=?,caption=?,hashtags=?,timezone=?,scheduled_utc=?,schedule_local_date=?,schedule_local_time=?,
      revision_data=?,approval_status='Draft',approved_by=NULL,approved_at=NULL,approved_version=NULL,version=?,updated_at=? WHERE post_id=?`)
      .run(title,caption,hashtags,timezone,scheduledAt||now,date.toISODate()!,date.toFormat('HH:mm:ss'),JSON.stringify(updatedRevision),version,now,post.post_id);
    const existing:any[]=db.prepare('SELECT * FROM post_targets WHERE post_id=? ORDER BY created_at DESC').all(post.post_id);
    db.prepare("UPDATE post_targets SET status='Cancelled',version=version+1,updated_at=? WHERE post_id=?").run(now,post.post_id);
    for(const account of accounts){
      const reusable=existing.find(t=>t.account_id===account.account_id&&['Draft','Scheduled'].includes(t.status)&&t.attempt_count===0);
      if(reusable){
        db.prepare("UPDATE post_targets SET status='Draft',idempotency_key=?,updated_at=? WHERE target_id=?")
          .run(computeIdempotencyKey(reusable.target_id,scheduledAt||now,version),now,reusable.target_id);continue;
      }
      const targetId='TGT-'+crypto.randomUUID();
      db.prepare("INSERT INTO post_targets (target_id,post_id,account_id,platform,status,idempotency_key,created_at,updated_at) VALUES (?,?,?,?,'Draft',?,?,?)")
        .run(targetId,post.post_id,account.account_id,account.platform,computeIdempotencyKey(targetId,scheduledAt||now,version),now,now);
    }
    const updatedInput={...input,title,caption,hashtags,accountIds:accounts.map(a=>a.account_id).sort(),platforms:accounts.map(a=>a.platform)};
    db.prepare("UPDATE antigravity_video_jobs SET input_json=?,status='READY_FOR_SCHEDULING',publish_at=?,updated_at=? WHERE id=?")
      .run(JSON.stringify(updatedInput),scheduledAt,now,job.id);
    db.prepare('INSERT INTO post_revision_snapshots (post_id,version,snapshot,actor,created_at) VALUES (?,?,?,?,?)')
      .run(post.post_id,version,JSON.stringify(db.prepare('SELECT * FROM posts WHERE post_id=?').get(post.post_id)),principal.email,now);
    audit(principal,'antigravity_video',job.id,'edit_schedule',{postId:post.post_id,version,scheduledAt,approvalInvalidated:true});
    tenant=job.client_id;return {job:formatVideoJob(db.prepare('SELECT * FROM antigravity_video_jobs WHERE id=?').get(job.id))};
  });
  sseManager.emit('post.updated',tenant,{postId:result.job?.postId});return result;
}

export function submitCreatorForApproval(principal:Principal,id:string,version:unknown){
  let tenant='';
  const result=videoTx(()=>{
    const {job,input,post}=editable(principal,id,version);
    if(job.status!=='READY_FOR_SCHEDULING'||post.approval_status!=='Draft')return videoError('Save a draft before sending it for approval.',409);
    const revision=JSON.parse(post.revision_data||'{}');
    if(revision.unscheduled||Date.parse(post.scheduled_utc)<=Date.now())return videoError('Set a future publication time before sending for approval.');
    videoAccounts(principal,job.brand_id,input.accountIds,input.kind);
    const now=new Date().toISOString();
    db.prepare("UPDATE posts SET approval_status='PendingApproval',updated_at=? WHERE post_id=?").run(now,post.post_id);
    db.prepare("UPDATE antigravity_video_jobs SET status='AWAITING_APPROVAL',updated_at=? WHERE id=?").run(now,job.id);
    audit(principal,'antigravity_video',job.id,'submit_for_approval',{postId:post.post_id,version,scheduledAt:post.scheduled_utc});
    tenant=job.client_id;return {job:formatVideoJob(db.prepare('SELECT * FROM antigravity_video_jobs WHERE id=?').get(job.id))};
  });
  sseManager.emit('post.updated',tenant,{postId:result.job?.postId});return result;
}
