import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {hashSync} from 'bcryptjs';
process.env.DATABASE_URL=':memory:';process.env.ENABLE_DEMO_DATA='false';process.env.ENABLE_BACKGROUND_WORKERS='false';process.env.NODE_ENV='test';
const {db}=await import('../src/db/sqlite');
const {encryptToken}=await import('../src/crypto/tokenVault');
const {getDeliveryFailureReport,retryFailedDestination}=await import('../src/services/postFailures');
const {ProviderError}=await import('../src/services/reliablePublisher');
const {app}=await import('../src/app');
const principal={id:1,email:'approver@retry.test',fullName:'Approver',role:'Approver',clientId:'retry-one',global:false};
const now=new Date().toISOString(),old=new Date(Date.now()-86400000).toISOString();
const row=(id:string)=>db.prepare('SELECT * FROM post_targets WHERE target_id=?').get(id) as any;
let sequence=0;
function fixture(){
  const id='retry-post-'+(++sequence),target='retry-target-'+sequence;
  db.prepare(`INSERT INTO posts (post_id,client_id,brand_id,title,caption,media_urls,schedule_local_date,schedule_local_time,scheduled_utc,approval_status,approved_version,placement,created_at,updated_at) VALUES (?,'retry-one','retry-brand','A failed post','Approved caption','["https://example.test/image.png"]','2026-01-01','10:00:00',?,'Approved',1,'["feed"]',?,?)`).run(id,old,now,now);
  db.prepare(`INSERT INTO post_targets (target_id,post_id,account_id,platform,status,attempt_count,max_retries,error_code,error_message,idempotency_key,created_at,updated_at) VALUES (?,?,'retry-account','instagram','Failed',3,3,'MEDIA_PROCESSING_FAILED','Media processing failed',?,?,?)`).run(target,id,crypto.randomUUID(),now,now);
  return {id,target};
}
test('delivery failure reports and explicit retry preserve approval and successful destinations',async t=>{
  db.prepare('INSERT INTO clients (client_id,name,created_at,updated_at) VALUES (?,?,?,?)').run('retry-one','Retry',now,now);
  db.prepare('INSERT INTO brands (brand_id,client_id,brand_name,created_at,updated_at) VALUES (?,?,?,?,?)').run('retry-brand','retry-one','Retry',now,now);
  const token=encryptToken('private-test-token');
  db.prepare(`INSERT INTO social_accounts (account_id,client_id,brand_id,platform,external_id,account_name,token_ciphertext,token_iv,token_tag,created_at,updated_at) VALUES ('retry-account','retry-one','retry-brand','instagram','external-test','Retry Instagram',?,?,?,?,?)`).run(token.ciphertext,token.iv,token.tag,now,now);
  await t.test('report exposes cause and attempt history while redacting credentials',()=>{
    const f=fixture();
    db.prepare('UPDATE post_targets SET error_message=? WHERE target_id=?').run('Media failed https://example.test/?access_token=hidden-secret and {"api_key":"other-secret"} Bearer bearer-secret',f.target);
    db.prepare(`INSERT INTO publish_attempts (attempt_id,target_id,execution_id,started_at,finished_at,result,error_code,raw_response_redacted,created_at) VALUES (?,?,?,?,?,'failed','MEDIA_PROCESSING_FAILED',?,?)`).run('history-'+sequence,f.target,'test-exec',old,now,'{"secret":"must-not-be-returned"}',now);
    const report=getDeliveryFailureReport(principal,f.id),json=JSON.stringify(report);assert.equal(report.destinations[0].canRetry,true);assert.equal(report.destinations[0].history.length,1);
    assert(!json.includes('hidden-secret'));assert(!json.includes('other-secret'));assert(!json.includes('bearer-secret'));assert(!json.includes('private-test-token'));assert(!json.includes('must-not-be-returned'));assert(!json.includes(token.ciphertext));
  });
  await t.test('a retry claims only the failed target, preserves schedule and records another attempt',async()=>{
    const f=fixture();db.prepare(`INSERT INTO post_targets (target_id,post_id,account_id,platform,status,platform_post_id,post_url,idempotency_key,created_at,updated_at) VALUES (?,?,'retry-account','instagram','Posted','existing','https://instagram.com/p/existing',?,?,?)`).run('posted-'+sequence,f.id,crypto.randomUUID(),now,now);
    const before=row('posted-'+sequence);let calls=0;
    const result=await retryFailedDestination(principal,f.id,{targetId:f.target,postVersion:1,targetVersion:1},async()=>{calls++;return {id:'confirmed-new',confirmedPublished:true};});
    assert.equal(calls,1);assert.equal(result.result.targetStatus,'Posted');assert.equal(row(f.target).attempt_count,4);assert.deepEqual(row('posted-'+sequence),before);
    const post:any=db.prepare('SELECT * FROM posts WHERE post_id=?').get(f.id);assert.equal(post.scheduled_utc,old);assert.equal(post.approved_version,1);
    assert.equal((db.prepare('SELECT count(*) n FROM publish_attempts WHERE target_id=?').get(f.target) as any).n,1);
    await assert.rejects(()=>retryFailedDestination(principal,f.id,{targetId:f.target,postVersion:1,targetVersion:1}),/changed/);
  });
  await t.test('duplicate requests cannot start two deliveries',async()=>{
    const f=fixture();let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);let calls=0;
    const first=retryFailedDestination(principal,f.id,{targetId:f.target,postVersion:1,targetVersion:1},async()=>{calls++;await gate;return {id:'once',confirmedPublished:true};});
    await assert.rejects(()=>retryFailedDestination(principal,f.id,{targetId:f.target,postVersion:1,targetVersion:1}),/changed/);release();await first;assert.equal(calls,1);
  });
  await t.test('unknown outcomes and prior receipts block retries',async()=>{
    for(const update of ["status='NeedsVerification'","error_category='unknown'","error_code='PROVIDER_TIMEOUT'","platform_post_id='maybe-live'","error_message='fetch failed'"]){const f=fixture();db.prepare('UPDATE post_targets SET '+update+' WHERE target_id=?').run(f.target);assert.equal(getDeliveryFailureReport(principal,f.id).destinations[0].canRetry,false);await assert.rejects(()=>retryFailedDestination(principal,f.id,{targetId:f.target,postVersion:1,targetVersion:1}),/reconcile/);}
  });
  await t.test('credential problems and unapproved versions block retries',async()=>{
    const f=fixture();db.prepare("UPDATE social_accounts SET token_iv='broken' WHERE account_id='retry-account'").run();assert.match(getDeliveryFailureReport(principal,f.id).destinations[0].connection,/cannot read/);await assert.rejects(()=>retryFailedDestination(principal,f.id,{targetId:f.target,postVersion:1,targetVersion:1}),/cannot read/);
    db.prepare('UPDATE social_accounts SET token_iv=? WHERE account_id=?').run(token.iv,'retry-account');db.prepare('UPDATE posts SET approved_version=NULL WHERE post_id=?').run(f.id);await assert.rejects(()=>retryFailedDestination(principal,f.id,{targetId:f.target,postVersion:1,targetVersion:1}),/approved/);
    db.prepare('UPDATE posts SET approved_version=1 WHERE post_id=?').run(f.id);db.prepare("UPDATE post_targets SET error_code='AUTH_EXPIRED' WHERE target_id=?").run(f.target);assert.equal(getDeliveryFailureReport(principal,f.id).destinations[0].canRetry,false);
    db.prepare('UPDATE social_accounts SET updated_at=? WHERE account_id=?').run(new Date(Date.now()+1000).toISOString(),'retry-account');assert.equal(getDeliveryFailureReport(principal,f.id).destinations[0].canRetry,true);
  });
  await t.test('a failed manual retry records its result without changing the schedule or spinning automatic retries',async()=>{
    const f=fixture();const result=await retryFailedDestination(principal,f.id,{targetId:f.target,postVersion:1,targetVersion:1},async()=>{throw new ProviderError('Temporary provider failure','503',false,true);});assert.equal(result.result.targetStatus,'Failed');assert.equal(row(f.target).next_retry_at,null);assert.equal(result.report.destinations[0].history[0].result,'failed');
  });
  await t.test('HTTP routes enforce sessions, workspace, publishing role and versions',async()=>{
    const f=fixture(),password='retry-test-password-123';
    for(const [email,role] of [['approver@retry.test','Approver'],['editor@retry.test','Content Manager']])db.prepare('INSERT INTO users (email,full_name,role,client_id,password,created_at) VALUES (?,?,?,?,?,?)').run(email,role,role,'retry-one',hashSync(password,4),now);
    const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const base=`http://127.0.0.1:${(server.address() as any).port}/api/v1`;
    const login=async(email:string)=>{const r=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});assert.equal(r.status,200);return {'Content-Type':'application/json',Cookie:r.headers.get('set-cookie')!.split(';')[0]};};
    try{assert.equal((await fetch(base+`/posts/${f.id}/failure-report`)).status,401);const editor=await login('editor@retry.test'),approver=await login('approver@retry.test');assert.equal((await fetch(base+`/posts/${f.id}/failure-report`,{headers:editor})).status,200);assert.equal((await fetch(base+`/posts/${f.id}/retry`,{method:'POST',headers:editor,body:'{}'})).status,403);assert.equal((await fetch(base+`/posts/${f.id}/retry`,{method:'POST',headers:approver,body:'{}'})).status,428);assert.throws(()=>getDeliveryFailureReport({...principal,clientId:'other'},f.id),/not found/);await assert.rejects(()=>retryFailedDestination(principal,f.id,{targetId:'not-this-post',postVersion:1,targetVersion:1}),/not found/);}
    finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
  });
});
