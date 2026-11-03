import test from 'node:test';
import assert from 'node:assert/strict';
import { hashSync } from 'bcryptjs';

process.env.DATABASE_URL = ':memory:';
process.env.ENABLE_DEMO_DATA = 'false';
process.env.ENABLE_BACKGROUND_WORKERS = 'false';
process.env.NODE_ENV = 'test';
const { db } = await import('../src/db/sqlite');
const { app } = await import('../src/app');

test('session authentication and workspace isolation protect the API', async () => {
  const now = new Date().toISOString();
  for (const id of ['one', 'two']) {
    db.prepare('INSERT INTO clients (client_id,name,created_at,updated_at) VALUES (?,?,?,?)').run(id,id,now,now);
    db.prepare('INSERT INTO brands (brand_id,client_id,brand_name,created_at,updated_at) VALUES (?,?,?,?,?)').run('BR-'+id,id,id,now,now);
  }
  db.prepare('INSERT INTO users (email,full_name,role,client_id,password,created_at) VALUES (?,?,?,?,?,?)').run('editor@example.test','Editor','Content Manager','one',hashSync('Test-only-password-123',12),now);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening',resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}/api/v1`;
  try {
    assert.equal((await fetch(base+'/posts')).status,401);
    assert.equal((await fetch(base+'/posts',{headers:{Cookie:'webtrionix_session=%invalid'}})).status,401);
    assert.equal((await fetch(base+'/posts',{headers:{Authorization:'Bearer ci360_jwt_1_123'}})).status,401);
    const login = await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'editor@example.test',password:'Test-only-password-123'})});
    assert.equal(login.status,200);
    const cookie = login.headers.get('set-cookie')!; assert.match(cookie,/HttpOnly/); assert.match(cookie,/SameSite=Strict/);
    const headers = {Cookie:cookie.split(';')[0], 'Content-Type':'application/json'};
    const studioStatus = await fetch(base+'/ai/studio/status',{headers});
    assert.equal(studioStatus.status,200);
    assert.equal((await studioStatus.json() as any).canGenerate,true);
    const studioOtherTenant = await fetch(base+'/ai/studio/generate',{method:'POST',headers,body:JSON.stringify({brandId:'BR-two',task:'write',prompt:'Write a new post for this brand.'})});
    assert.equal(studioOtherTenant.status,404);
    assert.equal((await fetch(base+'/ai/studio/images/nonexistent',{headers})).status,404);
    const brands = await (await fetch(base+'/brands',{headers})).json() as any;
    assert.deepEqual(brands.data.map((b:any)=>b.brandId),['BR-one']);
    assert.equal((await fetch(base+'/posts?clientId=two',{headers})).status,403);
    assert.equal((await fetch(base+'/posts',{method:'POST',headers,body:JSON.stringify({brandId:'BR-two',title:'Forbidden',caption:'Forbidden'})})).status,404);
    const created = await fetch(base+'/posts',{method:'POST',headers,body:JSON.stringify({brandId:'BR-one',title:'Draft',masterCaption:'Review this content',media:[],platforms:[]})});
    assert.equal(created.status,201,await created.clone().text());
    const post = (await created.json() as any).data;
    assert.equal(post.approvalStatus,'draft');
    assert.equal((await fetch(base+`/posts/${post.id}/approve`,{method:'POST',headers})).status,403);
    assert.equal((await fetch(base+`/posts/${post.id}`,{method:'PATCH',headers,body:JSON.stringify({title:'Changed'})})).status,428);
    assert.equal((await fetch(base+`/posts/${post.id}`,{method:'PATCH',headers,body:JSON.stringify({title:'Changed',versionNumber:1})})).status,200);
    const draft = await (await fetch(base+`/posts/${post.id}`,{headers})).json() as any;
    assert.equal(draft.scheduledAt,undefined,'A title edit must leave an unscheduled draft unscheduled');
    assert.equal((await fetch(base+`/posts/${post.id}`,{method:'PATCH',headers,body:JSON.stringify({title:'Stale',versionNumber:1})})).status,409);
    const scheduledAt = new Date(Date.now()+86400000).toISOString();
    const scheduled = await fetch(base+`/posts/${post.id}`,{method:'PATCH',headers,body:JSON.stringify({scheduledAt,timezone:'Asia/Kolkata',versionNumber:2})});
    assert.equal(scheduled.status,200,await scheduled.clone().text());
    assert.equal((await scheduled.json() as any).scheduledAt,scheduledAt,'Rescheduling must clear the unscheduled flag');
    assert.equal((await fetch(base+`/posts/${post.id}/submit`,{method:'POST',headers,body:'{}'})).status,428);
    assert.equal((await fetch(base+`/posts/${post.id}/submit`,{method:'POST',headers,body:JSON.stringify({versionNumber:1})})).status,409);
    const report = await fetch(base+'/analytics/report?brandId=BR-two',{headers}); assert.equal(report.status,404);
    await fetch(base+'/auth/logout',{method:'POST',headers});
    assert.equal((await fetch(base+'/posts',{headers})).status,401);
  } finally { await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve())); }
});
