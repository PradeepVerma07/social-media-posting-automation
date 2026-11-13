import { randomUUID } from 'node:crypto';
import { db } from '../db/sqlite';
import { transitionTarget } from './stateMachine';

export class DeliveryConflict extends Error {}

export function maxLatenessMinutes(): number {
  const configured = Number(process.env.MAX_LATENESS_MINUTES);
  return Number.isFinite(configured) && configured > 0 ? configured : 15;
}

export function loadDelivery(targetId: string): any {
  return db.prepare(`
    SELECT t.*, p.client_id, p.brand_id, p.caption, p.hashtags, p.media_type,
      p.media_urls, p.link_url, p.placement, p.scheduled_utc, p.deleted_at, p.revision_data,
      p.approval_status, p.approved_version, p.version AS post_version,
      a.external_id, a.status AS account_status, a.client_id AS account_client_id,
      a.brand_id AS account_brand_id, a.platform AS account_platform,
      a.token_ciphertext, a.token_iv, a.token_tag, a.token_version, a.token_expires_at
    FROM post_targets t JOIN posts p ON p.post_id = t.post_id
    JOIN social_accounts a ON a.account_id = t.account_id WHERE t.target_id = ?
  `).get(targetId);
}

export function approvalIsCurrent(row: any): boolean {
  return !!row && !row.deleted_at && row.approval_status === 'Approved'
    && Number(row.approved_version) === Number(row.post_version)
    && row.approved_version != null && row.account_client_id === row.client_id
    && row.account_brand_id === row.brand_id && row.account_platform === row.platform
    && row.account_status === 'active';
}

function eligible(row: any, now: number): boolean {
  const due = Date.parse(row?.scheduled_utc);
  const nextRetry = row?.next_retry_at ? Date.parse(row.next_retry_at) : 0;
  return approvalIsCurrent(row) && ['Scheduled', 'Retrying'].includes(row.status)
    && Number.isFinite(due) && due <= now && due >= now - maxLatenessMinutes() * 60000
    && Number.isFinite(nextRetry) && nextRetry <= now
    && row.attempt_count < row.max_retries;
}

// Shared by the application scheduler, Publish now and n8n. Never hold a DB
// transaction open while contacting an external service.
export function claimDueTargets(executionId: string, targetIds?: string[], limit = 10): any[] {
  const now = new Date().toISOString();
  const claimed: any[] = [];
  db.exec('BEGIN IMMEDIATE');
  try {
    const ids = targetIds?.length ? targetIds : (db.prepare(`
      SELECT t.target_id FROM post_targets t JOIN posts p ON p.post_id = t.post_id
      WHERE t.status IN ('Scheduled', 'Retrying') AND p.scheduled_utc <= ?
        AND p.scheduled_utc >= ? AND (t.next_retry_at IS NULL OR t.next_retry_at <= ?)
        AND p.approval_status = 'Approved' AND p.approved_version = p.version
        AND p.deleted_at IS NULL ORDER BY p.scheduled_utc LIMIT ?
    `).all(now, new Date(Date.now() - maxLatenessMinutes() * 60000).toISOString(), now, limit) as any[])
      .map(row => row.target_id);
    for (const targetId of ids.slice(0, limit)) {
      const row = loadDelivery(targetId);
      if (!eligible(row, Date.parse(now))) continue;
      const result = db.prepare(`UPDATE post_targets SET status = 'Processing',
        lock_execution_id = ?, lock_stage = 'claimed', locked_at = ?,
        claimed_post_version = ?, attempt_count = attempt_count + 1,
        next_retry_at = NULL, version = version + 1, updated_at = ?
        WHERE target_id = ? AND version = ? AND status = ?`).run(
          executionId, now, row.post_version, now, targetId, row.version, row.status);
      if (result.changes !== 1) continue;
      db.prepare(`INSERT INTO publish_attempts
        (attempt_id, target_id, execution_id, post_version, started_at, result, created_at)
        VALUES (?, ?, ?, ?, ?, 'running', ?)`)
        .run(randomUUID(), targetId, executionId, row.post_version, now, now);
      db.prepare(`INSERT INTO audit_log
        (id, actor, entity, entity_id, action, before_val, after_val, created_at)
        VALUES (?, 'publisher', 'post_target', ?, 'claim', ?, ?, ?)`)
        .run(randomUUID(), targetId, JSON.stringify({ status: row.status }),
          JSON.stringify({ executionId, postVersion: row.post_version }), now);
      claimed.push(loadDelivery(targetId));
    }
    db.exec('COMMIT');
    return claimed;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function beginPublishing(targetId: string, executionId: string): any {
  let committed = false;
  db.exec('BEGIN IMMEDIATE');
  try {
    const row = loadDelivery(targetId);
    if (!row || row.status !== 'Processing' || row.lock_execution_id !== executionId
      || row.lock_stage !== 'claimed') throw new DeliveryConflict('Delivery already started or claim expired');
    if (!approvalIsCurrent(row) || row.claimed_post_version !== row.post_version) {
      transitionTarget(row, 'Failed', 'publisher', 'Approval or account changed before publication', {
        error_code: 'APPROVAL_CHANGED', error_category: 'validation',
        error_message: 'The current version requires approval before publishing.',
        lock_execution_id: null, lock_stage: null, locked_at: null,
      });
      db.prepare(`UPDATE publish_attempts SET result = 'failed', finished_at = ?, error_code = 'APPROVAL_CHANGED'
        WHERE target_id = ? AND execution_id = ? AND result = 'running'`)
        .run(new Date().toISOString(), targetId, executionId);
      db.exec('COMMIT');
      committed = true;
      throw new DeliveryConflict('Approval changed; publication blocked');
    }
    const result = db.prepare(`UPDATE post_targets SET lock_stage = 'publishing',
      version = version + 1, updated_at = ? WHERE target_id = ? AND version = ?
      AND lock_execution_id = ? AND lock_stage = 'claimed'`)
      .run(new Date().toISOString(), targetId, row.version, executionId);
    if (result.changes !== 1) throw new DeliveryConflict('Delivery claim changed');
    db.exec('COMMIT');
    return loadDelivery(targetId);
  } catch (error) {
    // The approval-invalidating path commits its terminal failure deliberately.
    if (!committed) db.exec('ROLLBACK');
    throw error;
  }
}

// An explicit operator retry keeps the approved schedule intact and claims only
// one failed destination. Historical attempts and successful targets are retained.
export function claimFailedTarget(targetId:string,executionId:string,postVersion:number,targetVersion:number,actor:string) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const row=loadDelivery(targetId);
    if(!row||!approvalIsCurrent(row)||row.post_version!==postVersion||row.version!==targetVersion
      ||row.status!=='Failed'||row.platform_post_id||row.post_url||row.posted_at||row.lock_execution_id||row.lock_stage)
      throw Object.assign(new DeliveryConflict('Delivery changed or is no longer safe to retry. Refresh its report.'),{status:409});
    const scheduled=transitionTarget(row,'Scheduled',actor,'Explicit retry of the approved failed destination',{
      max_retries:Math.max(row.max_retries,row.attempt_count+1),next_retry_at:null,
    });
    const now=new Date().toISOString();
    const result=db.prepare(`UPDATE post_targets SET status='Processing',lock_execution_id=?,lock_stage='claimed',locked_at=?,
      claimed_post_version=?,attempt_count=attempt_count+1,version=version+1,updated_at=? WHERE target_id=? AND version=? AND status='Scheduled'`)
      .run(executionId,now,postVersion,now,targetId,scheduled.version);
    if(result.changes!==1)throw Object.assign(new DeliveryConflict('Delivery was already claimed.'),{status:409});
    db.prepare(`INSERT INTO publish_attempts (attempt_id,target_id,execution_id,post_version,started_at,result,created_at) VALUES (?,?,?,?,?,'running',?)`)
      .run(randomUUID(),targetId,executionId,postVersion,now,now);
    db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
}
