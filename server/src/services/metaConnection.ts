import crypto from 'node:crypto';
import {db} from '../db/sqlite';
import {encryptToken} from '../crypto/tokenVault';
import {isAdmin,audit,type Principal} from './access';
import {sseManager} from './sseManager';

const fail=(message:string,status=400):never=>{throw Object.assign(new Error(message),{status});};
export async function connectMetaAccount(principal:Principal,brand:any,input:{token?:unknown;pageId?:unknown},fetcher:typeof fetch=fetch){
  if(!isAdmin(principal))return fail('Only administrators can connect social accounts.',403);
  if(!brand||(!principal.global&&brand.client_id!==principal.clientId))return fail('Brand not found.',404);
  const token=typeof input.token==='string'?input.token.trim():'';
  if(token.length<20||token.length>12000)return fail('Enter a complete Meta access token.');
  const pageId=String(input.pageId||'').trim();if(pageId&&!/^\d{5,30}$/.test(pageId))return fail('Enter the numeric Facebook Page ID.');
  const version=/^v\d+\.\d+$/.test(process.env.META_GRAPH_VERSION||'')?process.env.META_GRAPH_VERSION:'v21.0';
  const graph=async(resource:string,credential:string)=>{
    let response:Response;try{response=await fetcher(`https://graph.facebook.com/${version}/${resource}`,{headers:{Authorization:`Bearer ${credential}`,Accept:'application/json'},signal:AbortSignal.timeout(20000),redirect:'error'});}catch{return fail('Meta could not be reached. Check the connection and try again.',502);}
    let data:any;try{data=await response.json();}catch{return fail('Meta returned an unreadable response. Please try again.',502);}
    return {ok:response.ok&&!data.error,data};
  };
  const discovered=await graph('me/accounts?fields=id,name,access_token,instagram_business_account{id,username}',token);
  let pages:any[]=Array.isArray(discovered.data.data)?discovered.data.data:[];
  // Page access tokens identify the Page through /me rather than /me/accounts.
  if(!pages.length){
    const direct=await graph('me?fields=id,name,instagram_business_account{id,username}',token);
    if(direct.ok&&direct.data.id&&direct.data.name&&!Array.isArray(direct.data.data)){
      const identity=await graph(`${encodeURIComponent(direct.data.id)}?fields=id,name,category,instagram_business_account{id,username}`,token);
      if(identity.ok&&identity.data.category)pages=[{...identity.data,access_token:token}];
    }
  }
  if(!pages.length)return fail(discovered.data.error?.code===190?'Meta rejected this token. Generate a fresh token and reconnect the selected Page.':'No accessible Facebook Page was found. Check the Page assignment and token permissions.');
  const candidates=pageId?pages.filter(page=>String(page.id)===pageId):pages;
  if(candidates.length!==1)return fail(pageId?'The token does not grant access to that Facebook Page.':'This token covers multiple Pages. Enter the Facebook Page ID for the selected brand.',409);
  const page=candidates[0],pageToken=typeof page.access_token==='string'?page.access_token:token;
  if(!/^\d+$/.test(String(page.id)))return fail('Meta did not return a valid Page identity.',502);
  const targets=[{platform:'facebook',externalId:String(page.id),name:String(page.name||'Facebook Page'),handle:''}];
  if(page.instagram_business_account?.id)targets.push({platform:'instagram',externalId:String(page.instagram_business_account.id),name:String(page.name||'Facebook Page')+' (Instagram)',handle:page.instagram_business_account.username?'@'+page.instagram_business_account.username:''});
  const now=new Date().toISOString();const channels:any[]=[];
  db.exec('BEGIN IMMEDIATE');
  try{
    for(const target of targets){
      const foreign:any=db.prepare('SELECT brand_id FROM social_accounts WHERE platform=? AND external_id=? AND (client_id!=? OR brand_id!=?)').get(target.platform,target.externalId,brand.client_id,brand.brand_id);
      if(foreign)return fail('This Page or Instagram account is already assigned to another brand. Ask an administrator to review its assignment.',409);
      const existing:any=db.prepare('SELECT account_id FROM social_accounts WHERE client_id=? AND brand_id=? AND platform=? AND external_id=?').get(brand.client_id,brand.brand_id,target.platform,target.externalId);
      const enc=encryptToken(pageToken),id=existing?.account_id||'ACC-'+crypto.randomUUID();
      if(existing)db.prepare(`UPDATE social_accounts SET token_ciphertext=?,token_iv=?,token_tag=?,token_version=?,token_expires_at=NULL,account_name=?,account_handle=?,status='active',last_checked_at=?,updated_at=?,version=version+1 WHERE account_id=?`)
        .run(enc.ciphertext,enc.iv,enc.tag,enc.version,target.name,target.handle,now,now,id);
      else db.prepare(`INSERT INTO social_accounts (account_id,client_id,brand_id,platform,account_name,account_handle,external_id,token_ciphertext,token_iv,token_tag,token_version,status,last_checked_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,'active',?,?,?)`)
        .run(id,brand.client_id,brand.brand_id,target.platform,target.name,target.handle,target.externalId,enc.ciphertext,enc.iv,enc.tag,enc.version,now,now,now);
      channels.push({accountId:id,platform:target.platform,name:target.name});
    }
    audit(principal,'social_account',brand.brand_id,'connect_meta',{accountIds:channels.map(channel=>channel.accountId)});
    db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
  sseManager.emit('account.updated',brand.client_id,{brandId:brand.brand_id});
  return {success:true,message:`Verified and connected ${channels.length} Meta channel(s) to ${brand.brand_name}.`,channels};
}
