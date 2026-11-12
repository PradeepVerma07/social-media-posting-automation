import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { hashSync } from 'bcryptjs';

process.env.DATABASE_URL=':memory:';process.env.ENABLE_DEMO_DATA='false';
process.env.ENABLE_BACKGROUND_WORKERS='false';process.env.NODE_ENV='test';
process.env.ANTIGRAVITY_N8N_KEY='automation-test-key-'.repeat(3);
process.env.ANTIGRAVITY_WORKER_KEY='worker-test-key-'.repeat(3);
process.env.ANTIGRAVITY_DISPATCH_URL='';process.env.ALLOW_SELF_APPROVAL='false';
process.env.PUBLIC_BASE_URL='https://360.webtrionix.com';
const mediaDir=await mkdtemp(path.join(tmpdir(),'antigravity-video-test-'));
process.env.UPLOADS_DIRECTORY=mediaDir;
const {db}=await import('../src/db/sqlite');
const {app}=await import('../src/app');

test('Antigravity dashboard, local upload and scheduler maintain authentication and exactly one post',async t=>{
  const now=new Date().toISOString();
  for(const tenant of ['video-one','video-two']){
    db.prepare('INSERT INTO clients (client_id,name,created_at,updated_at) VALUES (?,?,?,?)').run(tenant,tenant,now,now);
    db.prepare('INSERT INTO brands (brand_id,client_id,brand_name,created_at,updated_at) VALUES (?,?,?,?,?)').run('BR-'+tenant,tenant,tenant,now,now);
  }
  for(const [email,role,client] of [['video-owner@example.test','Super Admin','video-one'],['video-editor@example.test','Content Manager','video-one'],['video-manager@example.test','Approver','video-one'],['other-manager@example.test','Approver','video-two']]){
    db.prepare('INSERT INTO users (email,full_name,role,client_id,password,created_at) VALUES (?,?,?,?,?,?)').run(email,role,role,client,hashSync('Only-test-password-123',4),now);
  }
  db.prepare(`INSERT INTO social_accounts (account_id,client_id,brand_id,platform,external_id,token_ciphertext,token_iv,token_tag,created_at,updated_at)
    VALUES ('video-ig','video-one','BR-video-one','instagram','test-ig','test','test','test',?,?)`).run(now,now);
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${(server.address() as any).port}/api/v1`;
  const workerHeaders={'Content-Type':'application/json','X-Worker-Key':process.env.ANTIGRAVITY_WORKER_KEY!};
  const automationHeaders={'Content-Type':'application/json','X-Automation-Key':process.env.ANTIGRAVITY_N8N_KEY!};
  const request=async(endpoint:string,body:any,headers:any=workerHeaders)=>{
    const response=await fetch(base+'/automation/videos'+endpoint,{method:'POST',headers,body:JSON.stringify(body)});
    return {status:response.status,data:await response.json() as any};
  };
  const login=async(email:string)=>{
    const response=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:'Only-test-password-123'})});
    assert.equal(response.status,200);
    return {'Content-Type':'application/json',Cookie:response.headers.get('set-cookie')!.split(';')[0]};
  };
  const owner=await login('video-owner@example.test');const editor=await login('video-editor@example.test');
  const manager=await login('video-manager@example.test');const otherManager=await login('other-manager@example.test');
  const input={requestId:crypto.randomUUID(),topic:'Create a clear video about our new local business website.',brandId:'BR-video-one',accountIds:['video-ig'],autoPublish:false};
  const box=(kind:string,data:string)=>{const header=Buffer.alloc(8);header.writeUInt32BE(8+Buffer.byteLength(data));header.write(kind,4);return Buffer.concat([header,Buffer.from(data)]);};
  const bytes=Buffer.concat([box('ftyp','isom0000'),box('mdat','test-only-video'),box('moov','test-metadata')]);
  const digest=crypto.createHash('sha256').update(bytes).digest('hex');
  let entry:any;
  try{
    await t.test('machine endpoints reject user sessions and wrong machine credentials',async()=>{
      assert.equal((await request('/worker/claim',{workerId:'test'},owner)).status,401);
      assert.equal((await request('/dispatch-pending',{},workerHeaders)).status,401);
      assert.equal((await fetch(base+'/automation/videos/jobs')).status,401);
    });
    await t.test('tenant and approval permissions apply before queueing',async()=>{
      assert.equal((await request('/jobs',{...input,brandId:'BR-video-two'},editor)).status,404);
      assert.equal((await request('/jobs',{...input,autoPublish:true},editor)).status,403);
    });
    await t.test('every generated version requires a human approval even if old auto flags are enabled',async()=>{
      process.env.ALLOW_SELF_APPROVAL='true';process.env.ANTIGRAVITY_AUTO_PUBLISH='true';
      assert.equal((await request('/jobs',{...input,autoPublish:true},owner)).status,403);
      const status=await (await fetch(base+'/automation/videos/status',{headers:owner})).json() as any;
      assert.equal(status.canAutoPublish,false);assert.equal(status.canReview,true);
      process.env.ALLOW_SELF_APPROVAL='false';
    });
    await t.test('topic submission is idempotent and n8n must release the job',async()=>{
      const first=await request('/jobs',input,owner);assert.equal(first.status,202,JSON.stringify(first.data));
      const repeated=await request('/jobs',input,owner);assert.equal(repeated.data.job.id,first.data.job.id);
      assert.equal((await request('/jobs',{...input,topic:'A different topic using the same request identifier.'},owner)).status,409);
      assert.equal((await request('/worker/claim',{workerId:'test'})).data.job,null);
      assert.equal((await request('/dispatch',{jobId:first.data.job.id},automationHeaders)).status,200);
      entry=(await request('/worker/claim',{workerId:'test'})).data;assert.equal(entry.job.id,first.data.job.id);
      assert.equal((await request('/worker/claim',{workerId:'second-worker'})).data.job,null);
      assert.equal(JSON.stringify(first.data).includes('leaseToken'),false);
    });
    await t.test('upload requires the correct lease and complete matching bytes',async()=>{
      const url=base+'/automation/videos/worker/upload/'+entry.job.id;
      const headers={'Content-Type':'video/mp4','X-Worker-Key':process.env.ANTIGRAVITY_WORKER_KEY!,'X-Job-Lease':entry.leaseToken,'X-Content-SHA256':digest};
      assert.equal((await fetch(url,{method:'PUT',headers:{...headers,'X-Job-Lease':'0'.repeat(64)},body:bytes})).status,403);
      assert.equal((await fetch(url,{method:'PUT',headers:{...headers,'X-Content-SHA256':'0'.repeat(64)},body:bytes})).status,400);
      const response=await fetch(url,{method:'PUT',headers,body:bytes});assert.equal(response.status,201,await response.clone().text());
      const uploaded=await response.json() as any;
      assert.equal(Date.parse(uploaded.job.publishAt)-Date.parse(uploaded.job.readyAt),600000);
      const repeated=await fetch(url,{method:'PUT',headers,body:bytes});assert.equal(repeated.status,200);
      assert.equal((await repeated.json() as any).job.publishAt,uploaded.job.publishAt);
    });
    await t.test('the minute scheduler creates exactly one unapproved post and no eligible publishing target',async()=>{
      const response=await request('/schedule-next',{},automationHeaders);assert.equal(response.status,200,JSON.stringify(response.data));
      assert.equal(response.data.job.status,'AWAITING_APPROVAL');
      const post:any=db.prepare('SELECT * FROM posts WHERE post_id=?').get(response.data.job.postId);
      assert.equal(post.approval_status,'PendingApproval');assert.equal(post.approved_version,null);
      assert.equal(post.media_type,'video');assert.equal(post.source,'antigravity');
      const targets:any[]=db.prepare('SELECT * FROM post_targets WHERE post_id=?').all(post.post_id);
      assert.equal(targets.length,1);assert.equal(targets[0].status,'Draft');
      assert.equal((await request('/schedule-next',{},automationHeaders)).data.job,null);
      assert.equal((db.prepare("SELECT count(*) n FROM posts WHERE source='antigravity'").get() as any).n,1);
    });
    await t.test('manual folder files require explicit brand routing and deduplicate by content',async()=>{
      assert.equal((await request('/worker/discover',{filename:'new-video.mp4',sha256:digest})).status,422);
      assert.equal((await request('/manual-defaults',{brandId:'BR-video-one',accountIds:['video-ig'],autoPublish:false},editor)).status,200);
      const discovered=await request('/worker/discover',{filename:'new-video.mp4',sha256:digest});assert.equal(discovered.status,200);
      const again=await request('/worker/discover',{filename:'new-video.mp4',sha256:digest});assert.equal(again.data.job.id,discovered.data.job.id);
      const response=await fetch(base+'/automation/videos/worker/upload/'+discovered.data.job.id,{method:'PUT',headers:{'Content-Type':'video/mp4','X-Worker-Key':process.env.ANTIGRAVITY_WORKER_KEY!,'X-Job-Lease':discovered.data.leaseToken,'X-Content-SHA256':digest},body:bytes});assert.equal(response.status,201);
      assert.equal((await request('/worker/discover',{filename:'renamed-video.mp4',sha256:digest})).data.alreadyStored,true);
      const scheduled=await request('/schedule-next',{},automationHeaders);assert.equal(scheduled.data.job.status,'AWAITING_APPROVAL');
      const post:any=db.prepare('SELECT * FROM posts WHERE post_id=?').get(scheduled.data.job.postId);assert.equal(post.approval_status,'PendingApproval');
    });
    await t.test('review queue and decisions enforce manager role, tenant, current version and separate approval',async()=>{
      assert.equal((await fetch(base+'/automation/videos/reviews',{headers:editor})).status,403);
      const list=await (await fetch(base+'/automation/videos/reviews',{headers:manager})).json() as any;
      assert.equal(list.jobs.length,2);
      const job=list.jobs.find((j:any)=>j.id===entry.job.id);
      assert.equal((await request('/jobs/'+job.id+'/review',{action:'approve',versionNumber:job.postVersion},editor)).status,403);
      assert.equal((await request('/jobs/'+job.id+'/review',{action:'approve',versionNumber:job.postVersion},otherManager)).status,404);
      assert.equal((await request('/jobs/'+job.id+'/review',{action:'approve',versionNumber:job.postVersion+1},manager)).status,409);
      assert.equal((await request('/jobs/'+job.id+'/review',{action:'approve',versionNumber:job.postVersion},owner)).status,403);
      assert.equal((await request('/jobs/'+job.id+'/review',{action:'request-changes',notes:'',versionNumber:job.postVersion},manager)).status,400);
    });
    await t.test('change instructions cancel the old version and queue exactly one replacement for another review',async()=>{
      const job:any=db.prepare('SELECT * FROM antigravity_video_jobs WHERE id=?').get(entry.job.id);
      const post:any=db.prepare('SELECT * FROM posts WHERE post_id=?').get(job.post_id);
      const payload={action:'request-changes',notes:'Shorten the opening and use Hindi narration with a website end card.',versionNumber:post.version};
      const changed=await request('/jobs/'+job.id+'/review',payload,manager);
      assert.equal(changed.status,200,JSON.stringify(changed.data));
      assert.equal(changed.data.job.status,'CHANGES_REQUESTED');
      const child=changed.data.replacementJob;
      assert.equal(child.parentJobId,job.id);assert.equal(child.revisionNumber,2);assert.equal(child.revisionNotes,payload.notes);
      assert.equal(child.status,'QUEUED');assert.equal(child.autoPublish,false);
      assert.equal((await request('/jobs/'+job.id+'/review',payload,manager)).status,409);
      assert.equal((db.prepare("SELECT count(*) n FROM antigravity_video_jobs WHERE request_id=?").get('revision:'+job.id) as any).n,1);
      assert.equal((db.prepare('SELECT status FROM post_targets WHERE post_id=?').get(post.post_id) as any).status,'Cancelled');
      await request('/dispatch-pending',{},automationHeaders);
      const claim=(await request('/worker/claim',{workerId:'test'})).data;
      assert.equal(claim.job.id,child.id);assert.deepEqual(claim.job.revisionHistory,[payload.notes]);
      const uploaded=await fetch(base+'/automation/videos/worker/upload/'+child.id,{method:'PUT',headers:{'Content-Type':'video/mp4','X-Worker-Key':process.env.ANTIGRAVITY_WORKER_KEY!,'X-Job-Lease':claim.leaseToken,'X-Content-SHA256':digest},body:bytes});
      assert.equal(uploaded.status,201);
      const scheduled=await request('/schedule-next',{},automationHeaders);
      assert.equal(scheduled.data.job.id,child.id);assert.equal(scheduled.data.job.status,'AWAITING_APPROVAL');
    });
    await t.test('rejection stops publishing and cannot be resubmitted through the general post queue',async()=>{
      const child:any=db.prepare('SELECT * FROM antigravity_video_jobs WHERE request_id=?').get('revision:'+entry.job.id);
      const post:any=db.prepare('SELECT * FROM posts WHERE post_id=?').get(child.post_id);
      const rejected=await request('/jobs/'+child.id+'/review',{action:'reject',notes:'Incorrect product information.',versionNumber:post.version},manager);
      assert.equal(rejected.status,200);assert.equal(rejected.data.job.status,'REJECTED');assert.equal(rejected.data.replacementJob,null);
      assert.equal((db.prepare('SELECT status FROM post_targets WHERE post_id=?').get(post.post_id) as any).status,'Cancelled');
      assert.equal((await request('/worker/claim',{workerId:'test'})).data.job,null);
      const submit=await fetch(base+'/posts/'+post.post_id+'/submit',{method:'POST',headers:editor,body:JSON.stringify({versionNumber:post.version})});
      assert.equal(submit.status,409);
    });
    await t.test('the standard approval action uses the same video gate and schedules 10 minutes after manager approval',async()=>{
      const row:any=db.prepare("SELECT * FROM antigravity_video_jobs WHERE status='AWAITING_APPROVAL'").get();
      const post:any=db.prepare('SELECT * FROM posts WHERE post_id=?').get(row.post_id);
      // A delayed review must not inherit an expired upload-based target.
      db.prepare('UPDATE posts SET scheduled_utc=? WHERE post_id=?').run('2020-01-01T00:00:00.000Z',post.post_id);
      const before=Date.now();
      const response=await fetch(base+'/posts/'+post.post_id+'/approve',{method:'POST',headers:manager,body:JSON.stringify({versionNumber:post.version})});
      assert.equal(response.status,200,await response.clone().text());
      const approved:any=db.prepare('SELECT * FROM posts WHERE post_id=?').get(post.post_id);
      assert.equal(approved.approval_status,'Approved');assert.equal(approved.approved_version,approved.version);
      assert.ok(Date.parse(approved.scheduled_utc)>=before+600000);
      assert.ok(Date.parse(approved.scheduled_utc)<Date.now()+601000);
      assert.equal((db.prepare('SELECT status FROM post_targets WHERE post_id=?').get(post.post_id) as any).status,'Scheduled');
      assert.equal((db.prepare('SELECT status FROM antigravity_video_jobs WHERE id=?').get(row.id) as any).status,'SCHEDULED');
      assert.equal((await request('/jobs/'+row.id+'/review',{action:'reject',notes:'Late duplicate',versionNumber:approved.version},manager)).status,409);
    });
  }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));await rm(mediaDir,{recursive:true,force:true});}
});
