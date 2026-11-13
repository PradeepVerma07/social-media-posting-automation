import test from 'node:test';
import assert from 'node:assert/strict';
import {hashSync,compareSync} from 'bcryptjs';

process.env.DATABASE_URL=':memory:';
process.env.ENABLE_DEMO_DATA='false';
process.env.ENABLE_BACKGROUND_WORKERS='false';
process.env.NODE_ENV='test';
const {db}=await import('../src/db/sqlite');
const {app}=await import('../src/app');

test('team members can be created, sign in, and remain within the selected workspace',async t=>{
  const now=new Date().toISOString();const password='Local member test password 123!';
  for (const [id,name,status] of [['team-one','Team One','active'],['team-two','Team Two','active'],['team-inactive','Inactive Workspace','inactive']]) {
    db.prepare('INSERT INTO clients (client_id,name,status,created_at,updated_at) VALUES (?,?,?,?,?)').run(id,name,status,now,now);
    db.prepare('INSERT INTO brands (brand_id,client_id,brand_name,created_at,updated_at) VALUES (?,?,?,?,?)').run('BR-'+id,id,name+' brand',now,now);
  }
  for (const [email,role] of [['owner@team.test','Super Admin'],['admin@team.test','Admin'],['editor@team.test','Content Manager']]) {
    db.prepare('INSERT INTO users (email,full_name,role,client_id,password,created_at) VALUES (?,?,?,?,?,?)').run(email,role,role,'team-one',hashSync(password,4),now);
  }
  const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${(server.address() as any).port}/api/v1`;
  const signIn=async(email:string)=>fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
  const login=async(email:string)=>{const r=await signIn(email);assert.equal(r.status,200);return {'Content-Type':'application/json',Cookie:r.headers.get('set-cookie')!.split(';')[0]};};
  const owner=await login('owner@team.test'),admin=await login('admin@team.test'),editor=await login('editor@team.test');
  const create=async(body:any,headers:any=owner)=>{
    const response=await fetch(base+'/users',{method:'POST',headers,body:JSON.stringify(body)});
    return {status:response.status,data:await response.json() as any};
  };
  const input={fullName:'Video Approval Manager',email:'reviewer@team.test',role:'Approver',clientId:'team-two',tenantScope:'Global (All Brands)',password,isActive:true,avatarUrl:'https://example.test/avatar.png'};
  try {
    await t.test('only administrators can load assignment options or add members',async()=>{
      assert.equal((await fetch(base+'/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)})).status,401);
      assert.equal((await create(input,editor)).status,403);
      assert.equal((await fetch(base+'/users/workspaces',{headers:editor})).status,403);
      const all=await (await fetch(base+'/users/workspaces',{headers:owner})).json() as any;
      assert.deepEqual(all.data.map((w:any)=>w.clientId).sort(),['team-one','team-two']);
      assert.deepEqual(all.data.find((w:any)=>w.clientId==='team-two').brands,['Team Two brand']);
      const own=await (await fetch(base+'/users/workspaces',{headers:admin})).json() as any;
      assert.deepEqual(own.data.map((w:any)=>w.clientId),['team-one']);
    });
    await t.test('invalid defaults, unsupported roles and missing workspace fail clearly',async()=>{
      const short=await create({...input,password:'Admin@123'});assert.equal(short.status,400);assert.match(short.data.error,/12–128/);
      assert.equal((await create({...input,role:'Super Admin'})).status,400);
      assert.equal((await create({...input,clientId:undefined})).status,400);
      assert.equal((await create({...input,clientId:'team-inactive'})).status,400);
      assert.equal((await create({...input,email:'invalid-address'})).status,400);
      assert.equal((await create({...input,isActive:'false'})).status,400);
    });
    await t.test('creating an approver persists login, workspace, avatar and role',async()=>{
      const response=await create(input);assert.equal(response.status,201,JSON.stringify(response.data));
      assert.equal(response.data.clientId,'team-two');assert.equal(response.data.tenantScope,'Team Two');
      assert.equal(response.data.avatarUrl,input.avatarUrl);assert.equal(response.data.isActive,true);
      assert.equal(response.data.role,'Approver');assert.equal('password' in response.data,false);
      const stored:any=db.prepare('SELECT * FROM users WHERE user_id=?').get(response.data.id);
      assert.notEqual(stored.password,password);assert.equal(compareSync(password,stored.password),true);
      const member=await login(input.email);
      assert.equal((await fetch(base+'/automation/videos/reviews',{headers:member})).status,200);
      const brands=await (await fetch(base+'/brands',{headers:member})).json() as any;
      assert.deepEqual(brands.data.map((b:any)=>b.brandId),['BR-team-two']);
      assert.equal((await fetch(base+'/users/workspaces',{headers:member})).status,403);
      assert.equal((db.prepare("SELECT count(*) n FROM audit_log WHERE entity='user' AND entity_id=? AND action='create'").get(String(response.data.id)) as any).n,1);
    });
    await t.test('duplicate emails return a useful conflict without creating a second member',async()=>{
      const duplicate=await create({...input,email:'  REVIEWER@TEAM.TEST  '});
      assert.equal(duplicate.status,409);assert.match(duplicate.data.error,/already exists/);
      assert.equal((db.prepare('SELECT count(*) n FROM users WHERE LOWER(email)=?').get(input.email) as any).n,1);
    });
    await t.test('inactive accounts remain inactive and ordinary admins cannot cross workspaces',async()=>{
      assert.equal((await create({...input,email:'forbidden@team.test'},admin)).status,403);
      const inactive=await create({...input,email:'inactive@team.test',clientId:undefined,isActive:false},admin);
      assert.equal(inactive.status,201,JSON.stringify(inactive.data));
      assert.equal(inactive.data.clientId,'team-one');assert.equal(inactive.data.isActive,false);
      assert.equal((await signIn('inactive@team.test')).status,401);
      const members=await (await fetch(base+'/users',{headers:admin})).json() as any;
      assert.equal(members.data.some((m:any)=>m.email===input.email),false);
    });
  } finally {await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
