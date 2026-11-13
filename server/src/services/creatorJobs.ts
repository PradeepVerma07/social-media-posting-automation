import crypto from 'node:crypto';
import {db} from '../db/sqlite';
import {audit,canAccessBrand,canEdit,resolveBrand,type Principal} from './access';
import {formatVideoJob,videoAccounts,videoError,videoTx,leasedVideoJob} from './antigravityVideos';
import {sseManager} from './sseManager';

export const CREATION_STAGES:Record<string,string>={
  preparing:'Preparing the creative brief',inspecting:'Checking project assets',
  generating:'Creating scenes and artwork',narrating:'Producing narration',
  rendering:'Rendering the media',validating:'Checking the finished files',
  uploading:'Uploading the finished media',upload_wait:'Waiting to retry the upload',
  ready:'Preparing the scheduling draft',
};
export const CREATION_ACTIVITIES:Record<string,string>={
  started:'Antigravity started',reading:'Reading project files',writing:'Updating the creative files',
  image:'Generating artwork',command:'Running a production step',narration:'Creating the voiceover',
  render:'Rendering the output',checking:'Checking file completeness',upload:'Uploading media',
  copy:'Saving the generated caption',waiting:'Waiting for the file to finish',
};

// Only fixed labels cross the worker boundary. Prompts, shell text and raw logs stay on the PC.
export function recordCreationProgress(jobId:string,lease:string,raw:any){
  const row=leasedVideoJob(jobId,lease);
  if(row.deleted_at||!['GENERATING','NEEDS_ATTENTION'].includes(row.status))return videoError('This generation is no longer active.',409);
  if(!Object.hasOwn(CREATION_STAGES,raw.stage)||!Object.hasOwn(CREATION_ACTIVITIES,raw.activity))return videoError('Unsupported creation progress.');
  const previous=JSON.parse(row.progress_json||'{}'),now=new Date().toISOString();
  const count=Number.isSafeInteger(raw.completedSteps)?Math.min(100000,Math.max(previous.completedSteps||0,raw.completedSteps)):previous.completedSteps||0;
  const history=Array.isArray(previous.history)?previous.history.slice(-19):[];
  const last=history.at(-1);
  if(last?.stage!==raw.stage||last?.activity!==raw.activity)history.push({stage:raw.stage,activity:raw.activity,at:now});
  const progress={stage:raw.stage,label:CREATION_STAGES[raw.stage],activity:CREATION_ACTIVITIES[raw.activity],completedSteps:count,
    startedAt:previous.startedAt||now,updatedAt:now,history};
  db.prepare('UPDATE antigravity_video_jobs SET progress_json=?,updated_at=?,lease_until=? WHERE id=?')
    .run(JSON.stringify(progress),now,new Date(Date.now()+120000).toISOString(),jobId);
  return {ok:true};
}

function creatorRow(principal:Principal,id:string,includeDeleted=false):any{
  if(!canEdit(principal))return videoError('Content editing permission is required.',403);
  const row:any=db.prepare('SELECT * FROM antigravity_video_jobs WHERE id=?').get(id);
  if(!row||(!includeDeleted&&row.deleted_at)||!canAccessBrand(principal,resolveBrand(row.brand_id))||JSON.parse(row.input_json).workflow!=='creator')return videoError('Creation not found.',404);
  return row;
}

export function retryCreation(principal:Principal,id:string){
  let tenant='';
  const result=videoTx(()=>{
    const row=creatorRow(principal,id);
    if(row.retry_job_id){
      const retry:any=db.prepare('SELECT * FROM antigravity_video_jobs WHERE id=?').get(row.retry_job_id);
      if(retry?.deleted_at)return videoError('The retry is in Trash. Restore it before continuing.',409);
      return {job:formatVideoJob(retry),alreadyQueued:true};
    }
    if(!['FAILED','NEEDS_ATTENTION'].includes(row.status)||row.post_id||row.file_sha256)return videoError('Only a failed generation without completed media can be retried.',409);
    if(row.lease_until&&Date.parse(row.lease_until)>Date.now()&&row.status!=='FAILED')return videoError('The worker is still active. Wait for it to finish before retrying.',409);
    const input=JSON.parse(row.input_json);
    videoAccounts(principal,row.brand_id,input.accountIds,input.kind);
    const count:any=db.prepare('SELECT COUNT(*) n FROM antigravity_video_jobs WHERE client_id=? AND created_at>?').get(row.client_id,new Date(Date.now()-86400000).toISOString());
    if(count.n>=100)return videoError('The workspace daily creation limit has been reached.',429);
    const now=new Date().toISOString(),retryId=crypto.randomUUID();
    const {generatedResult,...brief}=input;
    db.prepare('INSERT INTO antigravity_video_jobs (id,request_id,input_json,client_id,brand_id,user_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)')
      .run(retryId,'retry:'+row.id,JSON.stringify({...brief,autoPublish:false,retryOfJobId:row.id}),row.client_id,row.brand_id,principal.id,now,now);
    db.prepare('UPDATE antigravity_video_jobs SET retry_job_id=?,updated_at=? WHERE id=?').run(retryId,now,id);
    audit(principal,'antigravity_video',id,'retry_generation',{replacementJobId:retryId});tenant=row.client_id;
    return {job:formatVideoJob(db.prepare('SELECT * FROM antigravity_video_jobs WHERE id=?').get(retryId)),alreadyQueued:false};
  });
  if(tenant)sseManager.emit('creation.updated',tenant,{jobId:result.job?.id});return result;
}

export function trashCreation(principal:Principal,id:string,version:unknown){
  let tenant='';
  const result=videoTx(()=>{
    const row=creatorRow(principal,id,true);
    if(row.deleted_at)return {job:formatVideoJob(row)};
    if(row.status==='GENERATING'||(row.status==='NEEDS_ATTENTION'&&row.lease_until&&Date.parse(row.lease_until)>Date.now()))return videoError('Wait for the running generation to finish before deleting.',409);
    if(!['QUEUED','FAILED','NEEDS_ATTENTION','READY_FOR_SCHEDULING','REJECTED','CHANGES_REQUESTED'].includes(row.status))return videoError('Content awaiting approval or publication cannot be deleted here.',409);
    const post:any=row.post_id&&db.prepare('SELECT * FROM posts WHERE post_id=?').get(row.post_id);
    const now=new Date().toISOString();
    if(post){
      if(post.deleted_at)return videoError('This draft was already archived in Content Management.',409);
      if(!Number.isInteger(version)||version!==post.version)return videoError('The draft changed. Refresh before deleting.',409);
      if(!['Draft','Rejected','ChangesRequested'].includes(post.approval_status))return videoError('Withdraw the content from approval before deleting.',409);
      if(db.prepare("SELECT 1 FROM post_targets WHERE post_id=? AND status IN ('Processing','NeedsVerification','Posted')").get(post.post_id))return videoError('Publishing activity must be reconciled before deleting.',409);
      db.prepare('UPDATE posts SET deleted_at=?,approved_version=NULL,version=version+1,updated_at=? WHERE post_id=?').run(now,now,post.post_id);
      db.prepare("UPDATE post_targets SET status='Cancelled',version=version+1,updated_at=? WHERE post_id=?").run(now,post.post_id);
    }
    db.prepare('UPDATE antigravity_video_jobs SET deleted_at=?,updated_at=? WHERE id=?').run(now,now,id);
    audit(principal,'antigravity_video',id,'trash',{postId:row.post_id});tenant=row.client_id;
    return {job:formatVideoJob(db.prepare('SELECT * FROM antigravity_video_jobs WHERE id=?').get(id))};
  });
  if(tenant)sseManager.emit('creation.updated',tenant,{jobId:id});return result;
}

export function restoreCreation(principal:Principal,id:string){
  let tenant='';
  const result=videoTx(()=>{
    const row=creatorRow(principal,id,true);if(!row.deleted_at)return {job:formatVideoJob(row)};
    const post:any=row.post_id&&db.prepare('SELECT * FROM posts WHERE post_id=?').get(row.post_id);
    const now=new Date().toISOString();
    if(post){
      if(post.deleted_at!==row.deleted_at)return videoError('The linked post changed after deletion. Review it in Content Management.',409);
      const revision={...JSON.parse(post.revision_data||'{}'),unscheduled:true};
      db.prepare("UPDATE posts SET deleted_at=NULL,approval_status='Draft',approved_by=NULL,approved_at=NULL,approved_version=NULL,revision_data=?,version=version+1,updated_at=? WHERE post_id=?")
        .run(JSON.stringify(revision),now,post.post_id);
      // Targets remain Cancelled until the user saves the restored draft and resubmits it.
    }
    db.prepare('UPDATE antigravity_video_jobs SET deleted_at=NULL,status=?,publish_at=?,updated_at=? WHERE id=?')
      .run(post?'READY_FOR_SCHEDULING':row.status,post?null:row.publish_at,now,id);
    audit(principal,'antigravity_video',id,'restore',{postId:row.post_id});tenant=row.client_id;
    return {job:formatVideoJob(db.prepare('SELECT * FROM antigravity_video_jobs WHERE id=?').get(id))};
  });
  if(tenant)sseManager.emit('creation.updated',tenant,{jobId:id});return result;
}
