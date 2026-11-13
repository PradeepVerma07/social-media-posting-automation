import test from 'node:test';
import assert from 'node:assert/strict';
import {hashSync} from 'bcryptjs';
process.env.DATABASE_URL=':memory:';process.env.ENABLE_DEMO_DATA='false';process.env.ENABLE_BACKGROUND_WORKERS='false';process.env.NODE_ENV='test';
const {db}=await import('../src/db/sqlite');const {connectMetaAccount,checkMetaAccount}=await import('../src/services/metaConnection');const {decryptToken}=await import('../src/crypto/tokenVault');const {app}=await import('../src/app');
const principal={id:1,email:'admin@meta.test',fullName:'Admin',role:'Admin',clientId:'meta-one',global:false};
const now=new Date().toISOString(),token='private-test-user-token-123456',pageToken='private-test-page-token-654321';
const response=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const fake=(pages:any[]):typeof fetch=>async(url,options)=>{assert(!String(url).includes(token));assert(!String(url).includes(pageToken));assert.match(new Headers(options?.headers).get('Authorization')!,/^Bearer /);return response({data:pages});};
test('Meta connections verify credentials, preserve brand ownership and never expose tokens',async t=>{
  for(const client of ['meta-one','meta-two']){db.prepare('INSERT INTO clients (client_id,name,created_at,updated_at) VALUES (?,?,?,?)').run(client,client,now,now);db.prepare('INSERT INTO brands (brand_id,client_id,brand_name,created_at,updated_at) VALUES (?,?,?,?,?)').run('BR-'+client,client,'Original brand name',now,now);}
  const brand:any=db.prepare('SELECT * FROM brands WHERE brand_id=?').get('BR-meta-one');
  await t.test('one Page and linked Instagram account are encrypted only into the selected brand',async()=>{
    const fetcher=fake([{id:'1234567',name:'Real Page',access_token:pageToken,instagram_business_account:{id:'7654321',username:'real_brand'}}]);const result=await connectMetaAccount(principal,brand,{token},fetcher);assert.equal(result.channels.length,2);assert(!JSON.stringify(result).includes(token));assert(!JSON.stringify(result).includes(pageToken));
    const rows:any[]=db.prepare('SELECT * FROM social_accounts WHERE brand_id=?').all(brand.brand_id);assert.equal(rows.length,2);for(const row of rows){assert.equal(row.client_id,brand.client_id);assert.equal(decryptToken({ciphertext:row.token_ciphertext,iv:row.token_iv,tag:row.token_tag}),pageToken);}
    await connectMetaAccount(principal,brand,{token},fetcher);assert.equal((db.prepare('SELECT count(*) n FROM social_accounts WHERE brand_id=?').get(brand.brand_id) as any).n,2);assert.equal((db.prepare('SELECT brand_name FROM brands WHERE brand_id=?').get(brand.brand_id) as any).brand_name,'Original brand name');
  });
  await t.test('roles, workspace and missing credentials fail before provider access',async()=>{
    const fetcher:typeof fetch=async()=>{throw new Error('should not reach provider');};await assert.rejects(()=>connectMetaAccount({...principal,role:'Approver'},brand,{token},fetcher),(e:any)=>e.status===403);await assert.rejects(()=>connectMetaAccount({...principal,clientId:'other'},brand,{token},fetcher),(e:any)=>e.status===404);await assert.rejects(()=>connectMetaAccount(principal,brand,{token:'short'},fetcher),/complete Meta/);
  });
  await t.test('multiple Pages require an explicit Page selection',async()=>{
    const fetcher=fake([{id:'2222222',name:'Page Two',access_token:pageToken},{id:'3333333',name:'Page Three',access_token:pageToken}]);await assert.rejects(()=>connectMetaAccount(principal,brand,{token},fetcher),/multiple Pages/);const result=await connectMetaAccount(principal,brand,{token,pageId:'3333333'},fetcher);assert.equal(result.channels.length,1);
  });
  await t.test('Page tokens use the Page identity fallback',async()=>{
    const fetcher:typeof fetch=async(url)=>String(url).includes('me/accounts')?response({error:{code:100}},400):String(url).includes('/me?')?response({id:'4444444',name:'Direct Page'}):response({id:'4444444',name:'Direct Page',category:'Business'});
    assert.equal((await connectMetaAccount(principal,brand,{token:pageToken},fetcher)).channels.length,1);
  });
  await t.test('accounts already assigned elsewhere are never overwritten',async()=>{
    const other:any=db.prepare('SELECT * FROM brands WHERE brand_id=?').get('BR-meta-two');await assert.rejects(()=>connectMetaAccount({...principal,global:true},other,{token},fake([{id:'1234567',name:'Wrong brand',access_token:pageToken}])),/another brand/);assert.equal((db.prepare('SELECT count(*) n FROM social_accounts WHERE brand_id=?').get(other.brand_id) as any).n,0);
  });
  await t.test('provider errors do not reflect credentials or raw provider payloads',async()=>{
    await assert.rejects(()=>connectMetaAccount(principal,brand,{token},async()=>response({error:{code:190,message:'secret='+token}},400)),(e:any)=>e.message.includes('fresh token')&&!e.message.includes(token));
  });
  await t.test('stored account checks verify the provider identity without exposing credentials',async()=>{
    const account:any=db.prepare("SELECT * FROM social_accounts WHERE brand_id=? AND platform='instagram'").get(brand.brand_id);
    const result=await checkMetaAccount(principal,account.account_id,async(url,options)=>{assert(!String(url).includes(pageToken));assert.equal(new Headers(options?.headers).get('Authorization'),'Bearer '+pageToken);return response({id:account.external_id,username:'real_brand'});});assert.equal(result.verified,true);assert(!JSON.stringify(result).includes(pageToken));assert.equal((db.prepare('SELECT last_checked_at FROM social_accounts WHERE account_id=?').get(account.account_id) as any).last_checked_at,result.checkedAt);
    await assert.rejects(()=>checkMetaAccount({...principal,clientId:'other'},account.account_id),/not found/);
    await assert.rejects(()=>checkMetaAccount(principal,account.account_id,async()=>response({error:{code:190,message:'secret='+pageToken}},400)),(e:any)=>e.message.includes('fresh token')&&!e.message.includes(pageToken));assert.equal((db.prepare('SELECT status FROM social_accounts WHERE account_id=?').get(account.account_id) as any).status,'needs_reauth');
  });
  await t.test('the real endpoint requires a session, administrator and explicit brand',async()=>{
    const password='meta-test-password-123';for(const role of ['Admin','Approver'])db.prepare('INSERT INTO users (email,full_name,role,client_id,password,created_at) VALUES (?,?,?,?,?,?)').run(role+'@meta.test',role,role,'meta-one',hashSync(password,4),now);
    const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));const base=`http://127.0.0.1:${(server.address() as any).port}/api/v1`;
    const login=async(role:string)=>{const r=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:role+'@meta.test',password})});return {'Content-Type':'application/json',Cookie:r.headers.get('set-cookie')!.split(';')[0]};};
    try{assert.equal((await fetch(base+'/social-accounts/connect',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,401);const admin=await login('Admin'),approver=await login('Approver');assert.equal((await fetch(base+'/social-accounts/connect',{method:'POST',headers:admin,body:JSON.stringify({platform:'meta'})})).status,400);assert.equal((await fetch(base+'/social-accounts/connect',{method:'POST',headers:approver,body:JSON.stringify({platform:'meta',brandId:brand.brand_id})})).status,403);assert.equal((await fetch(base+'/social-accounts/connect',{method:'POST',headers:admin,body:JSON.stringify({platform:'meta',brandId:'BR-meta-two'})})).status,404);}
    finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
  });
});
