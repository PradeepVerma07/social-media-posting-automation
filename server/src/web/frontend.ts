import express,{type Express} from 'express';
import path from 'node:path';
import fs from 'node:fs';
import {resolveNavigation,navigationPath} from '../../../src/utils/navigation';

export function mountFrontend(app:Express,distPath:string) {
  const indexPath=path.join(distPath,'index.html');
  if(!fs.existsSync(indexPath)||!fs.existsSync(path.join(distPath,'assets')))throw new Error('The built dashboard files are missing. Build the client before starting production.');
  const noStore=(res:express.Response)=>{res.setHeader('Cache-Control','no-store, max-age=0');res.setHeader('CDN-Cache-Control','no-store');};
  app.get('/favicon.ico',(_req,res)=>{res.setHeader('Cache-Control','public, max-age=3600');res.redirect(308,'/assets/webtrionix-logo.webp');});
  app.use(express.static(distPath,{index:false,dotfiles:'deny',setHeaders:(res,file)=>{
    if(file.endsWith('.html'))noStore(res);
    else if(/[\\/]assets[\\/]index-[\w-]+\.(js|css)$/.test(file))res.setHeader('Cache-Control','public, max-age=31536000, immutable');
    else res.setHeader('Cache-Control','public, max-age=3600');
  }}));
  app.get('*',(req,res)=>{
    const route=resolveNavigation({pathname:req.path});
    if(route){
      const canonical=navigationPath(route);
      if(req.path!==canonical&&req.path!=='/'){noStore(res);return res.redirect(308,canonical);}
      noStore(res);return res.sendFile(indexPath);
    }
    noStore(res);
    if(/^\/(api|internal|uploads|assets)(\/|$)/.test(req.path)||path.extname(req.path))return res.status(404).json({error:'Resource not found.'});
    return res.status(404).type('html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found | Webtrionix 360</title><style>body{margin:0;background:#f6f8fc;color:#101828;font:16px system-ui,sans-serif;display:grid;place-items:center;min-height:100vh}main{max-width:480px;margin:24px;padding:40px;border:1px solid #e4e7ec;border-radius:24px;background:white}small{color:#1336e8;font-weight:700}h1{font-size:30px}p{color:#667085;line-height:1.6}a{display:inline-block;margin-top:16px;padding:12px 18px;border-radius:12px;background:#1336e8;color:white;text-decoration:none}</style></head><body><main><small>WEBTRIONIX 360</small><h1>We couldn't find that page</h1><p>The link may have changed. Open Automation Studio to continue creating, scheduling and reviewing your content.</p><a href="/automation-studio">Open Automation Studio</a></main></body></html>`);
  });
}
