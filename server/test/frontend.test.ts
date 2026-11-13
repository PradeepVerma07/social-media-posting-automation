import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {mkdtemp,mkdir,writeFile,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {mountFrontend} from '../src/web/frontend';

test('production frontend serves clean deep links, a real favicon and cache-safe HTML',async t=>{
  const folder=await mkdtemp(path.join(tmpdir(),'dashboard-routes-'));
  await mkdir(path.join(folder,'assets'));
  await writeFile(path.join(folder,'index.html'),'<!doctype html><title>Webtrionix 360</title><main>Dashboard shell</main>');
  await writeFile(path.join(folder,'assets/index-tested.js'),'export const ready=true;');
  await copyFile(path.resolve('public/assets/webtrionix-logo.webp'),path.join(folder,'assets/webtrionix-logo.webp'));
  const app=express();mountFrontend(app,folder);const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve=>server.once('listening',resolve));
  const base=`http://127.0.0.1:${(server.address() as any).port}`;
  try{
    await t.test('root and direct page refreshes return the dashboard with no-store headers',async()=>{
      for(const route of ['/','/automation-studio','/creator-studio','/social-media-desk','/creator-approvals','/content']){const r=await fetch(base+route);assert.equal(r.status,200,route);assert.match(await r.text(),/Dashboard shell/);assert.match(r.headers.get('cache-control')!,/no-store/);assert.equal(r.headers.get('cdn-cache-control'),'no-store');}
    });
    await t.test('old path aliases redirect to their canonical destination',async()=>{
      for(const [legacy,canonical] of [['/ai-studio','/automation-studio'],['/creator','/creator-studio'],['/social-desk','/social-media-desk'],['/video-approvals','/creator-approvals']]){const r=await fetch(base+legacy,{redirect:'manual'});assert.equal(r.status,308);assert.equal(r.headers.get('location'),canonical);}
    });
    await t.test('the browser favicon request returns an image instead of dashboard HTML',async()=>{
      const r=await fetch(base+'/favicon.ico');assert.equal(r.status,200);assert.match(r.headers.get('content-type')!,/image\/webp/);const bytes=Buffer.from(await r.arrayBuffer());assert.equal(bytes.toString('ascii',0,4),'RIFF');
    });
    await t.test('missing assets and service endpoints never receive the SPA HTML',async()=>{
      for(const route of ['/assets/missing.js','/favicon-missing.ico','/api/v1/missing','/internal/missing','/uploads/missing.png']){const r=await fetch(base+route);assert.equal(r.status,404,route);assert.match(r.headers.get('content-type')!,/application\/json/);assert.deepEqual(await r.json(),{error:'Resource not found.'});}
      const asset=await fetch(base+'/assets/index-tested.js');assert.match(asset.headers.get('cache-control')!,/immutable/);
    });
    await t.test('unknown public links show a professional recovery page',async()=>{
      const r=await fetch(base+'/unknown-old-page');assert.equal(r.status,404);const text=await r.text();assert.match(text,/Webtrionix 360/);assert.match(text,/href="\/automation-studio"/);assert(!text.includes('Dashboard shell'));
    });
  }finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));assert.equal(path.dirname(folder),path.resolve(tmpdir()));assert(path.basename(folder).startsWith('dashboard-routes-'));await rm(folder,{recursive:true,force:true});}
});
