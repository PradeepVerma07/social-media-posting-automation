import crypto from 'node:crypto';
import {db} from '../db/sqlite';
import {decryptToken} from '../crypto/tokenVault';
import {canApprove, type Principal} from './access';
import {approvalIsCurrent,claimFailedTarget,loadDelivery} from './deliveryClaims';
import {publishDelivery,type PublishAdapter} from './reliablePublisher';
import type {DeliveryFailureReport} from '../types/postFailures';

const fail=(message:string,status=409):never=>{throw Object.assign(new Error(message),{status});};
export function redactFailure(value:unknown):string|null {
  if(!value)return null;
  return String(value).replace(/Bearer\s+[^\s,;"']+/gi,'Bearer [redacted]')
    .replace(/((?:access[_-]?token|refresh[_-]?token|api[_-]?key|client[_-]?secret|password|authorization)["']?\s*[=:]\s*["']?)[^\s&;,"']+/gi,'$1[redacted]')
    .replace(/\bEAA[A-Za-z0-9_-]{12,}\b/g,'[redacted]')
    .replace(/\b[A-Za-z0-9_+\/-]{80,}={0,2}\b/g,'[redacted]').slice(0,2000);
}
function scopedPost(p:Principal,id:string):any {
  const post:any=db.prepare('SELECT * FROM posts WHERE post_id=? AND deleted_at IS NULL').get(id);
  if(!post||(!p.global&&post.client_id!==p.clientId))return fail('Post not found.',404);
  return post;
}
function credentialCheck(row:any):string|null {
  if(row.account_status!=='active')return 'Reconnect or activate this social account in Social Accounts.';
  if(row.token_expires_at&&Date.parse(row.token_expires_at)<=Date.now())return 'The stored credential has expired. Reconnect this account in Social Accounts.';
  if(!row.token_ciphertext)return 'This account has no saved publishing credential. Reconnect it in Social Accounts.';
  try{if(!decryptToken({ciphertext:row.token_ciphertext,iv:row.token_iv,tag:row.token_tag,version:row.token_version}).trim())throw new Error();}
  catch{return 'The server cannot read the saved credential. An administrator must restore the matching encryption key or reconnect this account.';}
  return null;
}
function uncertain(row:any):boolean {
  return row.status==='NeedsVerification'||row.error_category==='unknown'||!!row.platform_post_id||!!row.post_url||!!row.posted_at
    ||/UNKNOWN|UNCONFIRMED|TIMEOUT|WARN_PARTIAL/i.test(row.error_code||'')
    ||/timed? ?out|network|fetch failed|socket|connection reset|unknown outcome/i.test(row.error_message||'');
}
function providerAuthFailure(row:any):boolean {
  return /AUTH|TOKEN|^190$/i.test(row.error_code||'')||/access token|credential|oauth|session has expired/i.test(row.error_message||'');
}
function retryBlock(p:Principal,row:any):string|null {
  if(!canApprove(p))return 'Publishing permission is required to retry. Ask an administrator or approver.';
  if(row.status==='Posted')return 'This destination is already published.';
  if(uncertain(row))return 'Check the social account and reconcile the earlier outcome before retrying to prevent duplicate posts.';
  if(row.status!=='Failed')return row.status==='Missed'?'Choose a new schedule and obtain approval for a missed publication.':'Only a failed destination can be retried here.';
  if(row.lock_execution_id||row.lock_stage)return 'An earlier delivery is still locked. Wait for reconciliation.';
  if(!approvalIsCurrent(row))return 'The current content version must be approved and the selected account active before retrying.';
  const problem=credentialCheck(row);if(problem)return problem;
  const account:any=db.prepare('SELECT updated_at FROM social_accounts WHERE account_id=?').get(row.account_id);
  if(providerAuthFailure(row)&&!(Date.parse(account.updated_at)>Date.parse(row.updated_at)))return 'The previous credential was rejected. Reconnect this account with a fresh credential, then refresh this report.';
  let placements:any;try{placements=JSON.parse(row.placement||'["feed"]');}catch{return 'Correct the invalid placement and submit the content for approval again.';}
  if(!Array.isArray(placements)||placements.length!==1)return 'Use one placement per post, then submit the corrected content for approval.';
  const placement=placements[0];
  if(!((row.platform==='facebook'&&placement==='feed'&&row.media_type==='image')||(row.platform==='instagram'&&['feed','story','reels_shorts'].includes(placement)&&['image','video'].includes(row.media_type)&&(placement!=='reels_shorts'||row.media_type==='video'))))return 'This media and placement are not supported. Edit the post and request approval again.';
  return null;
}
export function getDeliveryFailureReport(p:Principal,id:string):DeliveryFailureReport {
  const post=scopedPost(p,id);
  const targets:any[]=db.prepare('SELECT * FROM post_targets WHERE post_id=? ORDER BY created_at,target_id').all(id);
  return {postId:id,title:post.title,postVersion:post.version,approvalStatus:post.approval_status,generatedAt:new Date().toISOString(),destinations:targets.map(target=>{
    const row=loadDelivery(target.target_id);
    if(!row)return {targetId:target.target_id,targetVersion:target.version,accountName:'Unavailable account',platform:target.platform,status:target.status,errorCode:target.error_code,errorMessage:redactFailure(target.error_message),cause:'The selected social account is unavailable.',nextSteps:['Restore or replace the selected account and review the post.'],connection:'Unavailable',stage:'Account lookup',attempts:target.attempt_count,updatedAt:target.updated_at,canRetry:false,retryBlockedReason:'The selected account no longer exists.',history:[]};
    const problem=credentialCheck(row),blocked=retryBlock(p,row);
    const auth=providerAuthFailure(row)||!!problem;
    const unknown=uncertain(row)&&row.status!=='Posted';
    const media=/MEDIA|FORMAT|PROCESSING|INVALID.*URL/i.test(row.error_code||'');
    const cause=row.status==='Posted'?'The provider confirmed this destination was published.':unknown?'The earlier publication outcome needs verification.':auth?'The social account credential is missing, expired, unreadable, or was rejected.':media?'The provider could not accept or process the selected media.':row.error_message?'The publishing request failed.':'No failure is recorded for this destination.';
    const nextSteps=row.status==='Posted'?['Keep this successful delivery; it will not be retried.']:unknown?['Open the social account and check whether the post exists.','Ask an administrator to reconcile the delivery before retrying.']:auth?[problem||'Reconnect the selected account with a fresh credential in Social Accounts.','Refresh this report after the connection is fixed, then retry the failed destination.']:media?['Review the media URL, format and placement.','If content changes are needed, edit and submit it for approval again.']:['Read the provider error and correct the reported problem.','Retry only this failed destination using the approved content.'];
    const account:any=db.prepare('SELECT account_name,account_handle FROM social_accounts WHERE account_id=?').get(row.account_id);
    const history:any[]=db.prepare('SELECT attempt_id,started_at,finished_at,result,error_code FROM publish_attempts WHERE target_id=? ORDER BY started_at DESC LIMIT 10').all(row.target_id);
    const total:any=db.prepare('SELECT count(*) n FROM publish_attempts WHERE target_id=?').get(row.target_id);
    return {targetId:row.target_id,targetVersion:row.version,accountName:account.account_name||account.account_handle||row.account_id,platform:row.platform,status:row.status,errorCode:redactFailure(row.error_code),errorMessage:redactFailure(row.error_message),cause,nextSteps,connection:problem||'Saved credential is readable; provider validity is checked during publishing.',stage:unknown?'Publication confirmation':auth?'Account authentication':media?'Media processing':'Publishing request',attempts:Math.max(row.attempt_count,total.n),updatedAt:row.updated_at,canRetry:!blocked,retryBlockedReason:blocked,history:history.map(a=>({id:a.attempt_id,startedAt:a.started_at,finishedAt:a.finished_at,result:a.result,errorCode:redactFailure(a.error_code)}))};
  })};
}
export async function retryFailedDestination(p:Principal,postId:string,input:{targetId:string;postVersion:number;targetVersion:number},adapter?:PublishAdapter) {
  scopedPost(p,postId);
  if(!canApprove(p))return fail('Publishing permission is required to retry.',403);
  if(!Number.isInteger(input.postVersion)||!Number.isInteger(input.targetVersion))return fail('Refresh the failure report before retrying; both versions are required.',428);
  const row=loadDelivery(input.targetId);
  if(!row||row.post_id!==postId)return fail('Destination not found.',404);
  if(row.post_version!==input.postVersion||row.version!==input.targetVersion)return fail('This delivery changed. Refresh the failure report before retrying.');
  const blocked=retryBlock(p,row);if(blocked)return fail(blocked);
  const executionId=`retry-${crypto.randomUUID()}`;
  claimFailedTarget(input.targetId,executionId,input.postVersion,input.targetVersion,p.email);
  // Manual retries are single attempts, including when the original time has
  // passed. They never move the post schedule or start a hidden retry loop.
  const result=await publishDelivery(input.targetId,executionId,adapter,{allowAutomaticRetry:false});
  return {result,report:getDeliveryFailureReport(p,postId)};
}
