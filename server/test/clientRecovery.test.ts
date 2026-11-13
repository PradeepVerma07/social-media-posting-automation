import test from 'node:test';
import assert from 'node:assert/strict';
import {createApiRequester,ApiError} from '../../src/api/transport';
import {createSingleFlight,stableUser} from '../../src/utils/refresh';

const json=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
test('concurrent GET consumers share one request and a later refresh gets fresh data',async()=>{
  let calls=0,release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
  const request=createApiRequester({fetcher:async()=>{calls++;await gate;return json({value:calls});}});
  const one=request('/brands'),two=request('/brands');assert.equal(one,two);assert.equal(calls,1);release();assert.deepEqual(await one,{value:1});await request('/brands');assert.equal(calls,2);
});
test('POST actions are never silently duplicated or automatically retried',async()=>{
  let calls=0;const request=createApiRequester({fetcher:async()=>{calls++;throw new TypeError('network');}});
  await assert.rejects(()=>request('/automation/videos/jobs',{method:'POST',body:'{}'}),(e:any)=>e.code==='NETWORK_ERROR');assert.equal(calls,1);
});
test('HTML 403 identifies hosting blocking and pauses repeated requests without expiring the session',async()=>{
  let time=0,calls=0,expired=0;
  const request=createApiRequester({now:()=>time,onSessionExpired:()=>expired++,fetcher:async()=>{calls++;return calls===1?new Response('<html>Forbidden</html>',{status:403,headers:{'Content-Type':'text/html','x-hcdn-request-id':'example-edge-id'}}):json({recovered:true});}});
  await assert.rejects(()=>request('/brands'),(e:any)=>e.code==='HOSTING_BLOCKED'&&e.requestId==='example-edge-id');
  await assert.rejects(()=>request('/posts'),(e:any)=>e.code==='HOSTING_BLOCKED');assert.equal(calls,1);assert.equal(expired,0);
  time=31000;assert.deepEqual(await request('/posts'),{recovered:true});assert.equal(calls,2);
});
test('role rejection remains distinct from hosting blocks and only actual session expiry signs out',async()=>{
  let expired=0;const request=createApiRequester({onSessionExpired:()=>expired++,fetcher:async()=>json({error:'Your role does not allow this action.'},403)});
  await assert.rejects(()=>request('/users'),(e:any)=>e instanceof ApiError&&e.code==='API_ERROR'&&e.status===403&&e.message.includes('role'));assert.equal(expired,0);
  const expiredRequest=createApiRequester({onSessionExpired:()=>expired++,fetcher:async()=>json({error:'Sign in again'},401)});await assert.rejects(()=>expiredRequest('/auth/me'));assert.equal(expired,1);
});
test('GET requests do not pretend to send JSON and preserve explicit request headers',async()=>{
  const request=createApiRequester({fetcher:async(_url,options)=>{const headers=new Headers(options?.headers);assert.equal(headers.get('Content-Type'),null);assert.equal(headers.get('If-Match'),'3');assert.equal(options?.credentials,'same-origin');return json({ok:true});}});
  await request('/posts',{headers:{'If-Match':'3'}});
});
test('stalled requests time out with an actionable connection error',async()=>{
  const request=createApiRequester({timeoutMs:5,fetcher:async(_url,options)=>new Promise((_resolve,reject)=>options?.signal?.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'}))))});
  await assert.rejects(()=>request('/slow'),(e:any)=>e.code==='TIMEOUT');
});
test('overlapping refresh triggers run once and unchanged user data retains its identity',async()=>{
  let calls=0,release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve),refresh=createSingleFlight();
  const work=async()=>{calls++;await gate;};const one=refresh(work),two=refresh(work);assert.equal(one,two);await Promise.resolve();assert.equal(calls,1);release();await one;await refresh(work);assert.equal(calls,2);
  const user={id:1,email:'test@example.test',fullName:'Editor',role:'Content Manager',avatarUrl:''};assert.equal(stableUser(user,{...user}),user);assert.notEqual(stableUser(user,{...user,role:'Approver'}),user);
});
