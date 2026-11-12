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
process.env.ANTIGRAVITY_DISPATCH_URL='';process.env.ALLOW_SELF_APPROVAL='true';
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
  for(const [email,role,client] of [['video-owner@example.test','Super Admin','video-one'],['video-editor@example.test','Content Manager','video-one']]){
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
  const input={requestId:crypto.randomUUID(),topic:'Create a clear video about our new local business website.',brandId:'BR-video-one',accountIds:['video-ig'],autoPublish:true};
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
      assert.equal((await request('/jobs',input,editor)).status,403);
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
    await t.test('the minute scheduler creates one approved version and one target',async()=>{
      const response=await request('/schedule-next',{},automationHeaders);assert.equal(response.status,200,JSON.stringify(response.data));
      assert.equal(response.data.job.status,'SCHEDULED');
      const post:any=db.prepare('SELECT * FROM posts WHERE post_id=?').get(response.data.job.postId);
      assert.equal(post.approval_status,'Approved');assert.equal(post.approved_version,post.version);
      assert.equal(post.media_type,'video');assert.equal(post.source,'antigravity');
      const targets:any[]=db.prepare('SELECT * FROM post_targets WHERE post_id=?').all(post.post_id);
      assert.equal(targets.length,1);assert.equal(targets[0].status,'Scheduled');
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
  }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));await rm(mediaDir,{recursive:true,force:true});}
});
