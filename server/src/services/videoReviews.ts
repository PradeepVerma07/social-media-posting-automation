import crypto from 'node:crypto';
import { DateTime } from 'luxon';
import { db } from '../db/sqlite';
import { audit, canAccessBrand, canApprove, canEdit, resolveBrand, type Principal } from './access';
import { formatVideoJob, videoAccounts, videoError, videoPrincipal, videoTx } from './antigravityVideos';
import { computeIdempotencyKey } from '../utils/idGenerator';
import { sseManager } from './sseManager';

export function reviewVideoJob(principal: Principal, jobId: string, raw: any) {
  if (!canApprove(principal)) return videoError('Approval permission is required.',403);
  const action=String(raw.action || ''); const notes=String(raw.notes || '').trim();
  if (!['approve','reject','request-changes'].includes(action)) return videoError('Choose approve, reject, or request changes.');
  if (notes.length>6000 || (action!=='approve' && notes.length<(action==='request-changes'?10:1))) return videoError('Provide a reason, or at least 10 characters describing the required changes (maximum 6,000).');
  let tenant='';
  const result=videoTx(()=>{
    const row:any=db.prepare('SELECT * FROM antigravity_video_jobs WHERE id=?').get(jobId);
    if (!row || !canAccessBrand(principal,resolveBrand(row.brand_id))) return videoError('Video not found.',404);
    const post:any=row.post_id && db.prepare('SELECT * FROM posts WHERE post_id=? AND deleted_at IS NULL').get(row.post_id);
    if (row.status!=='AWAITING_APPROVAL' || !post || post.approval_status!=='PendingApproval') return videoError('This version is no longer waiting for approval. Refresh the queue.',409);
    if (!Number.isInteger(raw.versionNumber) || raw.versionNumber!==post.version) return videoError('The post changed. Refresh and review its current version.',409);
    const targets:any[]=db.prepare("SELECT * FROM post_targets WHERE post_id=? AND status!='Cancelled'").all(post.post_id);
    if (!targets.length || targets.some(t=>t.status!=='Draft')) return videoError('The publication state changed. Review it in the content queue.',409);
    const input=JSON.parse(row.input_json); const now=new Date().toISOString(); let replacement:any=null;
    if (action==='approve') {
      if (row.user_id===principal.id && process.env.ALLOW_SELF_APPROVAL!=='true') return videoError('A different approval manager must review this video.',403);
      if (post.media_urls!==JSON.stringify([row.file_url]) || post.title!==input.title || post.caption!==input.caption) return videoError('The post was edited after generation. Request a new video version before approving.',409);
      if(input.workflow==='creator'&&(JSON.parse(post.revision_data||'{}').unscheduled||Date.parse(post.scheduled_utc)<=Date.now()))return videoError('The selected publication time has passed. Return this content to the scheduling desk.',409);
      const {brand,accounts}=videoAccounts(principal,row.brand_id,input.accountIds,input.kind);
      if (targets.length!==accounts.length || targets.some(t=>!accounts.some(a=>a.account_id===t.account_id && a.platform===t.platform))) return videoError('The destinations changed. Request a new version.',409);
      const publishAt=input.workflow==='creator'?post.scheduled_utc:new Date(Date.now()+600000).toISOString();
      const local=DateTime.fromISO(publishAt).setZone(brand.default_timezone || 'Asia/Kolkata');
      const version=post.version+1;
      db.prepare(`UPDATE posts SET approval_status='Approved',version=?,approved_version=?,approved_by=?,approved_at=?,
        scheduled_utc=?,schedule_local_date=?,schedule_local_time=?,updated_at=? WHERE post_id=?`)
        .run(version,version,principal.email,now,publishAt,local.toISODate()!,local.toFormat('HH:mm:ss'),now,post.post_id);
      for (const target of targets) db.prepare("UPDATE post_targets SET status='Scheduled',idempotency_key=?,version=version+1,updated_at=? WHERE target_id=?")
        .run(computeIdempotencyKey(target.target_id,publishAt,version),now,target.target_id);
      db.prepare("UPDATE antigravity_video_jobs SET status='SCHEDULED',publish_at=?,updated_at=? WHERE id=?").run(publishAt,now,row.id);
      db.prepare('INSERT INTO post_revision_snapshots (post_id,version,snapshot,actor,created_at) VALUES (?,?,?,?,?)')
        .run(post.post_id,version,JSON.stringify(db.prepare('SELECT * FROM posts WHERE post_id=?').get(post.post_id)),principal.email,now);
    } else {
      if (action==='request-changes') {
        const author=videoPrincipal(row.user_id);
        if (!canEdit(author)) return videoError('The author no longer has editing access. An administrator must reassign this video.',403);
        videoAccounts(author,row.brand_id,input.accountIds,input.kind);
        const count:any=db.prepare('SELECT count(*) AS n FROM antigravity_video_jobs WHERE client_id=? AND created_at>?').get(row.client_id,new Date(Date.now()-86400000).toISOString());
        if (count.n>=100) return videoError('The workspace daily video limit has been reached.',429);
        const revisionNumber=(input.revisionNumber || 1)+1;
        if (revisionNumber>20) return videoError('This video has reached its revision limit. Create a new topic.');
        const id=crypto.randomUUID();
        const next={...input,autoPublish:false,manual:false,parentJobId:row.id,revisionNumber,revisionNotes:notes,
          revisionHistory:[...(input.revisionHistory || []),notes]};
        delete next.generatedResult;
        db.prepare('INSERT INTO antigravity_video_jobs (id,request_id,input_json,client_id,brand_id,user_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)')
          .run(id,'revision:'+row.id,JSON.stringify(next),row.client_id,row.brand_id,row.user_id,now,now);
        replacement=formatVideoJob(db.prepare('SELECT * FROM antigravity_video_jobs WHERE id=?').get(id));
      }
      db.prepare('UPDATE posts SET approval_status=?,approved_version=NULL,approved_by=NULL,approved_at=NULL,updated_at=? WHERE post_id=?')
        .run(action==='reject'?'Rejected':'ChangesRequested',now,post.post_id);
      db.prepare("UPDATE post_targets SET status='Cancelled',version=version+1,updated_at=? WHERE post_id=?").run(now,post.post_id);
      db.prepare('UPDATE antigravity_video_jobs SET status=?,updated_at=? WHERE id=?').run(action==='reject'?'REJECTED':'CHANGES_REQUESTED',now,row.id);
    }
    db.prepare(`INSERT INTO antigravity_video_reviews (job_id,action,notes,reviewer_id,reviewer_name,created_at,replacement_job_id) VALUES (?,?,?,?,?,?,?)
      ON CONFLICT(job_id) DO UPDATE SET action=excluded.action,notes=excluded.notes,reviewer_id=excluded.reviewer_id,reviewer_name=excluded.reviewer_name,created_at=excluded.created_at,replacement_job_id=excluded.replacement_job_id`)
      .run(row.id,action,notes,principal.id,principal.fullName,now,replacement?.id || null);
    audit(principal,'antigravity_video',row.id,action,{notes,postId:post.post_id,reviewedVersion:post.version,replacementJobId:replacement?.id || null});
    tenant=row.client_id;
    return {job:formatVideoJob(db.prepare('SELECT * FROM antigravity_video_jobs WHERE id=?').get(row.id)),replacementJob:replacement};
  });
  sseManager.emit('post.updated',tenant,{postId:result.job?.postId});
  return result;
}
