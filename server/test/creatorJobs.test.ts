import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {hashSync} from 'bcryptjs';
process.env.DATABASE_URL=':memory:';process.env.ENABLE_DEMO_DATA='false';process.env.ENABLE_BACKGROUND_WORKERS='false';process.env.NODE_ENV='test';
process.env.ANTIGRAVITY_WORKER_KEY='progress-worker-test-key-'.repeat(3);process.env.ANTIGRAVITY_N8N_KEY='progress-automation-test-key-'.repeat(3);
const {db}=await import('../src/db/sqlite');const {app}=await import('../src/app');
const {createVideoJob,claimVideoJob,formatVideoJob}=await import('../src/services/antigravityVideos');
const {recordCreationProgress,retryCreation,trashCreation,restoreCreation}=await import('../src/services/creatorJobs');
import type {Principal} from '../src/services/access';

test('creation progress, retry and recoverable deletion preserve access and publishing boundaries',async t=>{
  const now=new Date().toISOString();
  for(const id of ['progress-one','progress-other']){
    db.prepare('INSERT INTO clients (client_id,name,created_at,updated_at) VALUES (?,?,?,?)').run(id,id,now,now);
    db.prepare('INSERT INTO brands (brand_id,client_id,brand_name,created_at,updated_at) VALUES (?,?,?,?,?)').run('BR-'+id,id,id,now,now);
  }
  const authorId=Number(db.prepare('INSERT INTO users (email,full_name,role,client_id,password,created_at) VALUES (?,?,?,?,?,?)')
    .run('progress@test.invalid','Editor','Content Manager','progress-one',hashSync('Progress test password!',4),now).lastInsertRowid);
  const editor:Principal={id:authorId,email:'progress@test.invalid',fullName:'Editor',role:'Content Manager',clientId:'progress-one',global:false};
  const other={...editor,clientId:'progress-other'},approver={...editor,role:'Approver'};
  db.prepare('INSERT INTO social_accounts (account_id,client_id,brand_id,platform,external_id,token_ciphertext,token_iv,token_tag,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run('progress-ig','progress-one','BR-progress-one','instagram','external-progress','test','test','test',now,now);
  const create=()=>createVideoJob(editor,{workflow:'creator',kind:'video',title:'Progress test creation',topic:'A detailed and verified brief for testing creation.',caption:'Caption',accountIds:['progress-ig'],brandId:'BR-progress-one',requestId:crypto.randomUUID(),durationSeconds:15});
  const read=(id:string):any=>db.prepare('SELECT * FROM antigravity_video_jobs WHERE id=?').get(id);
  const claim=(row:any)=>{db.prepare('UPDATE antigravity_video_jobs SET dispatched=1 WHERE id=?').run(row.id);return claimVideoJob('test-worker');};
  let first:any,entry:any;
  await t.test('progress requires the active lease, accepts only fixed labels and keeps a bounded history',()=>{
    first=create();entry=claim(first);
    assert.throws(()=>recordCreationProgress(first.id,'0'.repeat(64),{stage:'rendering',activity:'render'}),/lease/);
    assert.throws(()=>recordCreationProgress(first.id,entry.leaseToken,{stage:'secret from log',activity:'reading'}),/Unsupported/);
    recordCreationProgress(first.id,entry.leaseToken,{stage:'rendering',activity:'render',completedSteps:8,rawLog:'DO NOT EXPOSE',command:'SECRET'});
    let formatted:any=formatVideoJob(read(first.id));assert.equal(formatted.progress.completedSteps,8);assert.equal(formatted.progress.label,'Rendering the media');
    assert.equal(JSON.stringify(formatted).includes('SECRET'),false);assert.equal(JSON.stringify(formatted).includes('leaseToken'),false);
    for(let i=0;i<30;i++)recordCreationProgress(first.id,entry.leaseToken,{stage:i%2?'rendering':'generating',activity:i%2?'render':'writing',completedSteps:2});
    formatted=formatVideoJob(read(first.id));assert.equal(formatted.progress.history.length,20);assert.equal(formatted.progress.completedSteps,8);
  });
  await t.test('active generation cannot be trashed or retried',()=>{
    assert.throws(()=>trashCreation(editor,first.id,null),/running/);
    assert.throws(()=>retryCreation(editor,first.id),/failed generation/);
    db.prepare("UPDATE antigravity_video_jobs SET status='NEEDS_ATTENTION' WHERE id=?").run(first.id);
    assert.throws(()=>retryCreation(editor,first.id),/still active/);
    assert.throws(()=>trashCreation(editor,first.id,null),/running/);
  });
  let retry:any;
  await t.test('failed retries are idempotent, scoped, separate, and never inherit approval or completed media',()=>{
    db.prepare("UPDATE antigravity_video_jobs SET status='FAILED',error='Required tool denied' WHERE id=?").run(first.id);
    assert.throws(()=>retryCreation(other,first.id),/not found/);assert.throws(()=>retryCreation(approver,first.id),/editing permission/);
    retry=retryCreation(editor,first.id).job;assert.ok(retry);assert.notEqual(retry.id,first.id);assert.equal(retry.status,'QUEUED');assert.equal(retry.postId,null);assert.equal(retry.autoPublish,false);
    assert.equal(retryCreation(editor,first.id).job?.id,retry.id);
    const input=JSON.parse(read(retry.id).input_json);assert.equal(input.retryOfJobId,first.id);assert.equal(input.generatedResult,undefined);
    assert.throws(()=>recordCreationProgress(first.id,entry.leaseToken,{stage:'rendering',activity:'render'}),/no longer active/);
  });
  await t.test('trashed queued jobs cannot be dispatched, claimed or uploaded; restoration is recoverable',()=>{
    assert.throws(()=>trashCreation(other,retry.id,null),/not found/);
    trashCreation(editor,retry.id,null);assert.ok(read(retry.id).deleted_at);
    assert.throws(()=>retryCreation(editor,first.id),/in Trash/);
    db.prepare('UPDATE antigravity_video_jobs SET dispatched=1 WHERE id=?').run(retry.id);assert.equal(claimVideoJob('test-worker').job,null);
    restoreCreation(editor,retry.id);assert.equal(read(retry.id).deleted_at,null);assert.equal(claimVideoJob('test-worker').job?.id,retry.id);
  });
  await t.test('draft deletion checks its version and restoration clears approval without scheduling publication',()=>{
    const row=create(),postId='progress-draft';
    db.prepare(`INSERT INTO posts (post_id,client_id,brand_id,title,caption,media_type,media_urls,schedule_local_date,schedule_local_time,timezone,scheduled_utc,approval_status,created_by_user_id,revision_data,created_at,updated_at) VALUES (?,?,?,?,?,'video','[]','2026-11-20','10:00:00','Asia/Kolkata','2026-11-20T04:30:00Z','Draft',?,'{}',?,?)`)
      .run(postId,'progress-one','BR-progress-one','Draft','Caption',authorId,now,now);
    db.prepare("UPDATE antigravity_video_jobs SET post_id=?,status='READY_FOR_SCHEDULING' WHERE id=?").run(postId,row.id);
    db.prepare("INSERT INTO post_targets (target_id,post_id,account_id,platform,status,idempotency_key,created_at,updated_at) VALUES ('progress-target',?,'progress-ig','instagram','Draft','progress-key',?,?)").run(postId,now,now);
    assert.throws(()=>trashCreation(editor,row.id,0),/changed/);assert.equal(read(row.id).deleted_at,null);
    trashCreation(editor,row.id,1);assert.ok(read(row.id).deleted_at);
    let post:any=db.prepare('SELECT * FROM posts WHERE post_id=?').get(postId);assert.ok(post.deleted_at);
    restoreCreation(editor,row.id);post=db.prepare('SELECT * FROM posts WHERE post_id=?').get(postId);
    assert.equal(post.deleted_at,null);assert.equal(post.approval_status,'Draft');assert.equal(post.approved_version,null);assert.equal(JSON.parse(post.revision_data).unscheduled,true);assert.equal(read(row.id).publish_at,null);
    assert.equal((db.prepare("SELECT status FROM post_targets WHERE target_id='progress-target'").get() as any).status,'Cancelled');
    db.prepare("UPDATE post_targets SET status='Posted' WHERE target_id='progress-target'").run();
    assert.throws(()=>trashCreation(editor,row.id,post.version),/Publishing activity/);
    db.prepare("UPDATE antigravity_video_jobs SET status='AWAITING_APPROVAL' WHERE id=?").run(row.id);assert.throws(()=>trashCreation(editor,row.id,post.version),/approval/);
  });
  await t.test('HTTP routes distinguish active history from Trash and authenticate machine progress',async()=>{
    const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
    const base=`http://127.0.0.1:${(server.address() as any).port}/api/v1`;
    try{
      const login=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:editor.email,password:'Progress test password!'})});
      assert.equal(login.status,200);const headers={'Content-Type':'application/json',Cookie:login.headers.get('set-cookie')!.split(';')[0]};
      const row=create();
      const deleted=await fetch(base+'/automation/videos/jobs/'+row.id,{method:'DELETE',headers,body:'{}'});assert.equal(deleted.status,200);
      let list:any=await (await fetch(base+'/automation/videos/jobs',{headers})).json();assert.equal(list.jobs.some((j:any)=>j.id===row.id),false);
      list=await (await fetch(base+'/automation/videos/jobs?trash=true',{headers})).json();assert.equal(list.jobs.some((j:any)=>j.id===row.id),true);
      assert.equal((await fetch(base+'/automation/videos/worker/progress',{method:'POST',headers,body:JSON.stringify({jobId:row.id,stage:'rendering',activity:'render'})})).status,401);
      assert.equal((await fetch(base+'/automation/videos/jobs/'+row.id+'/restore',{method:'POST',headers})).status,200);
    }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
  });
});
