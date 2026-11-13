import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {hashSync} from 'bcryptjs';
import {DateTime} from 'luxon';

process.env.DATABASE_URL=':memory:';process.env.ENABLE_DEMO_DATA='false';process.env.ENABLE_BACKGROUND_WORKERS='false';process.env.NODE_ENV='test';
process.env.ANTIGRAVITY_N8N_KEY='creator-automation-test-key-'.repeat(3);
process.env.ANTIGRAVITY_WORKER_KEY='creator-worker-test-key-'.repeat(3);
process.env.ANTIGRAVITY_DISPATCH_URL='';process.env.ALLOW_SELF_APPROVAL='false';process.env.PUBLIC_BASE_URL='https://360.webtrionix.com';
const uploads=await mkdtemp(path.join(tmpdir(),'creator-test-'));process.env.UPLOADS_DIRECTORY=uploads;
const {db}=await import('../src/db/sqlite');const {app}=await import('../src/app');

test('creator generation passes through schedule editing before exact-version approval',async t=>{
  const now=new Date().toISOString();const password='Creator test password 123!';
  for(const client of ['creator-one','creator-two']){
    db.prepare('INSERT INTO clients (client_id,name,created_at,updated_at) VALUES (?,?,?,?)').run(client,client,now,now);
    db.prepare('INSERT INTO brands (brand_id,client_id,brand_name,created_at,updated_at) VALUES (?,?,?,?,?)').run('BR-'+client,client,client,now,now);
  }
  for(const [email,role,client] of [['creator@case.test','Content Manager','creator-one'],['approver@case.test','Approver','creator-one'],['other@case.test','Content Manager','creator-two']])
    db.prepare('INSERT INTO users (email,full_name,role,client_id,password,created_at) VALUES (?,?,?,?,?,?)').run(email,role,role,client,hashSync(password,4),now);
  for(const platform of ['instagram','facebook'])db.prepare('INSERT INTO social_accounts (account_id,client_id,brand_id,platform,external_id,token_ciphertext,token_iv,token_tag,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run('creator-'+platform,'creator-one','BR-creator-one',platform,'external-'+platform,'test','test','test',now,now);
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${(server.address() as any).port}/api/v1`;
  const login=async(email:string)=>{const r=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});assert.equal(r.status,200);return {'Content-Type':'application/json',Cookie:r.headers.get('set-cookie')!.split(';')[0]};};
  const editor=await login('creator@case.test'),approver=await login('approver@case.test'),other=await login('other@case.test');
  const automation={'Content-Type':'application/json','X-Automation-Key':process.env.ANTIGRAVITY_N8N_KEY!};
  const worker={'Content-Type':'application/json','X-Worker-Key':process.env.ANTIGRAVITY_WORKER_KEY!};
  const call=async(endpoint:string,body:any,headers:any=editor,method='POST')=>{const r=await fetch(base+'/automation/videos'+endpoint,{method,headers,body:JSON.stringify(body)});return {status:r.status,data:await r.json() as any};};
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAIAAABMXPacAAAA+klEQVR4nO3RQQ0AIAzAwElBCtKQjow9ekkFNLk592mxWT+IBwBAOwAA2gEA0A4AgHYAALQDAKAdAADtAABoBwBAOwAA2gEA0A4AgHYAALQDAKAdAADtAABoBwBAOwAA2gEA0A4AgHYAALQDAKAdAADtAABoBwBAOwAA2gEA0A4AgHYAALQDAKAdAADtAABoBwBAOwAA2gEA0A4AgHYAALQDAKAdAADtAABoBwBAOwAA2gEA0A4AgHYAALQDAKAdAADtAABoBwBAOwAA2gEA0A4AgHYAALQDAKAdAADtAABoBwBAOwAA2gEA0A4AgHYAALQDAKAdAADtAABoBwBAOwAA2gEA0A4AgHYAALQDAKAdAAA33QejnANJg7YpnwAAAABJRU5ErkJggg==','base64');
  const box=(kind:string)=>{const b=Buffer.alloc(16);b.writeUInt32BE(16);b.write(kind,4);return b;};
  const mp4=Buffer.concat([box('ftyp'),box('mdat'),box('moov')]);
  const createReady=async(kind:'video'|'post')=>{
    const created=await call('/jobs',{requestId:crypto.randomUUID(),workflow:'creator',kind,brandId:'BR-creator-one',accountIds:kind==='post'?['creator-instagram','creator-facebook']:['creator-instagram'],title:'A complete creator brief',topic:'Create a useful social campaign using only these verified brand details.',language:'English',aspectRatio:kind==='post'?'1:1':'9:16',durationSeconds:15});
    assert.equal(created.status,202,JSON.stringify(created.data));
    await call('/dispatch',{jobId:created.data.job.id},automation);
    const claimed=await call('/worker/claim',{workerId:'creator-test'},worker);assert.equal(claimed.data.job.id,created.data.job.id);
    const id=created.data.job.id,lease=claimed.data.leaseToken;
    if(kind==='post')assert.equal((await call('/worker/post-result/'+id,{title:'Generated title',caption:'Generated copy'}, {...worker,'X-Job-Lease':lease})).status,409);
    const bytes=kind==='post'?png:mp4;
    const upload=await fetch(base+'/automation/videos/worker/upload/'+id,{method:'PUT',headers:{'Content-Type':kind==='post'?'image/png':'video/mp4','X-Worker-Key':process.env.ANTIGRAVITY_WORKER_KEY!,'X-Job-Lease':lease,'X-Content-SHA256':crypto.createHash('sha256').update(bytes).digest('hex')},body:bytes});
    assert.equal(upload.status,201,await upload.clone().text());
    if(kind==='post'){
      const copy={title:'Generated image post',caption:'The actual generated caption.',hashtags:['#Creator']};
      assert.equal((await call('/worker/post-result/'+id,copy,{...worker,'X-Job-Lease':lease})).status,200);
      assert.equal((await call('/worker/post-result/'+id,copy,{...worker,'X-Job-Lease':lease})).status,200);
      assert.equal((await call('/worker/post-result/'+id,{...copy,caption:'Different copy'},{...worker,'X-Job-Lease':lease})).status,409);
    }
    const prepared=await call('/schedule-next',{},automation);assert.equal(prepared.status,200,JSON.stringify(prepared.data));
    assert.equal(prepared.data.job.id,id);assert.equal(prepared.data.job.status,'READY_FOR_SCHEDULING');return prepared.data.job;
  };
  const future=DateTime.utc().plus({days:2}).startOf('minute');
  const schedule={title:'Reviewed title',caption:'Edited final caption for the selected audience.',hashtags:'#Ready',timezone:'Asia/Kolkata',localDateTime:future.setZone('Asia/Kolkata').toFormat("yyyy-MM-dd'T'HH:mm")};
  let image:any,video:any;
  try{
    await t.test('generated image copy and PNG become a draft without entering approval',async()=>{
      image=await createReady('post');
      const post:any=db.prepare('SELECT * FROM posts WHERE post_id=?').get(image.postId);
      assert.equal(post.approval_status,'Draft');assert.equal(post.media_type,'image');assert.equal(image.scheduledAt,null);
      assert.equal(image.caption,'The actual generated caption.');assert.equal(JSON.parse(post.revision_data).unscheduled,true);
      assert.equal((await call('/jobs/'+image.id+'/review',{action:'approve',versionNumber:image.postVersion},approver)).status,409);
      assert.equal((await call('/jobs/'+image.id+'/submit',{versionNumber:image.postVersion})).status,400);
      assert.equal((await call('/schedule-next',{},automation)).data.job,null);
    });
    await t.test('schedule edits enforce roles, tenant boundaries, future time and post versions',async()=>{
      const body={...schedule,accountIds:['creator-facebook'],versionNumber:image.postVersion};
      assert.equal((await call('/jobs/'+image.id+'/schedule',body,approver,'PATCH')).status,403);
      assert.equal((await call('/jobs/'+image.id+'/schedule',body,other,'PATCH')).status,404);
      assert.equal((await call('/jobs/'+image.id+'/schedule',{...body,versionNumber:0},editor,'PATCH')).status,409);
      assert.equal((await call('/jobs/'+image.id+'/schedule',{...body,localDateTime:'2020-01-01T12:00'},editor,'PATCH')).status,400);
      const saved=await call('/jobs/'+image.id+'/schedule',body,editor,'PATCH');assert.equal(saved.status,200,JSON.stringify(saved.data));image=saved.data.job;
      assert.equal(image.status,'READY_FOR_SCHEDULING');assert.equal(image.caption,schedule.caption);assert.equal(image.scheduledAt,future.toISO());
      const targets:any[]=db.prepare("SELECT * FROM post_targets WHERE post_id=? AND status!='Cancelled'").all(image.postId);
      assert.equal(targets.length,1);assert.equal(targets[0].platform,'facebook');assert.equal(targets[0].status,'Draft');
    });
    await t.test('approval preserves the selected schedule and later edits require approval again',async()=>{
      assert.equal((await call('/jobs/'+image.id+'/submit',{versionNumber:image.postVersion})).status,200);
      const approved=await call('/jobs/'+image.id+'/review',{action:'approve',versionNumber:image.postVersion},approver);
      assert.equal(approved.status,200,JSON.stringify(approved.data));assert.equal(approved.data.job.publishAt,future.toISO());image=approved.data.job;
      const changed=await fetch(base+'/posts/'+image.postId,{method:'PATCH',headers:editor,body:JSON.stringify({title:'A newer reviewed title',versionNumber:image.postVersion})});
      assert.equal(changed.status,200,await changed.clone().text());
      const row:any=db.prepare('SELECT * FROM posts WHERE post_id=?').get(image.postId);assert.equal(row.approval_status,'Draft');assert.equal(row.approved_version,null);
      assert.equal((await call('/jobs/'+image.id+'/submit',{versionNumber:row.version})).status,200);
      assert.equal((await call('/jobs/'+image.id+'/review',{action:'approve',versionNumber:row.version},approver)).status,200);
      assert.equal((db.prepare("SELECT count(*) n FROM audit_log WHERE entity_id=? AND action='approve'").get(image.id) as any).n,2);
    });
    await t.test('creator videos follow the same schedule stage and rejection stops them',async()=>{
      video=await createReady('video');const saved=await call('/jobs/'+video.id+'/schedule',{...schedule,versionNumber:video.postVersion},editor,'PATCH');assert.equal(saved.status,200,JSON.stringify(saved.data));video=saved.data.job;
      await call('/jobs/'+video.id+'/submit',{versionNumber:video.postVersion});
      const rejected=await call('/jobs/'+video.id+'/review',{action:'reject',notes:'The video needs different content.',versionNumber:video.postVersion},approver);
      assert.equal(rejected.status,200);assert.equal(rejected.data.job.status,'REJECTED');
      assert.equal((await call('/jobs/'+video.id+'/schedule',{...schedule,versionNumber:video.postVersion},editor,'PATCH')).status,409);
      assert.equal((db.prepare("SELECT count(*) n FROM post_targets WHERE post_id=? AND status!='Cancelled'").get(video.postId) as any).n,0);
    });
    await t.test('change requests create a fresh generation that must return through scheduling',async()=>{
      const another=await createReady('post');const saved=await call('/jobs/'+another.id+'/schedule',{...schedule,versionNumber:another.postVersion},editor,'PATCH');
      await call('/jobs/'+another.id+'/submit',{versionNumber:saved.data.job.postVersion});
      const revision=await call('/jobs/'+another.id+'/review',{action:'request-changes',notes:'Use clearer typography and a simpler background.',versionNumber:saved.data.job.postVersion},approver);
      assert.equal(revision.status,200,JSON.stringify(revision.data));assert.equal(revision.data.replacementJob.workflow,'creator');assert.equal(revision.data.replacementJob.kind,'post');assert.equal(revision.data.replacementJob.status,'QUEUED');
      const child:any=db.prepare('SELECT * FROM antigravity_video_jobs WHERE id=?').get(revision.data.replacementJob.id);
      assert.equal(child.post_id,null);assert.equal(JSON.parse(child.input_json).generatedResult,undefined);
      assert.equal((await call('/jobs/'+another.id+'/review',{action:'approve',versionNumber:saved.data.job.postVersion},approver)).status,409);
    });
  }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));await rm(uploads,{recursive:true,force:true});}
});
