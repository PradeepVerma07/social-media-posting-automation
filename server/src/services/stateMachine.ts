import { db } from '../db/sqlite';
import { TargetStatus } from '../schemas';
import { generateAuditId } from '../utils/idGenerator';
import { logger } from '../logging/logger';

export interface TargetEntity {
  target_id: string;
  post_id: string;
  account_id: string;
  platform: string;
  status: TargetStatus;
  attempt_count: number;
  max_retries: number;
  next_retry_at?: string | null;
  lock_execution_id?: string | null;
  lock_stage?: string | null;
  locked_at?: string | null;
  platform_post_id?: string | null;
  post_url?: string | null;
  posted_at?: string | null;
  error_code?: string | null;
  error_category?: string | null;
  error_message?: string | null;
  version: number;
}

const ALLOWED_TRANSITIONS: Record<TargetStatus, TargetStatus[]> = {
  Draft: ['Scheduled'],
  Scheduled: ['Processing', 'Draft', 'Cancelled', 'Missed'],
  Processing: ['Posted', 'Retrying', 'Failed', 'NeedsVerification'],
  Retrying: ['Processing', 'Failed', 'Cancelled'],
  NeedsVerification: ['Posted', 'Retrying', 'Failed'],
  Failed: ['Scheduled'], // Human explicit reschedule
  Missed: ['Scheduled'], // Human explicit reschedule
  Posted: [],            // Terminal
  Cancelled: [],         // Terminal
};

export function canTransition(from: TargetStatus, to: TargetStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function transitionTarget(
  target: TargetEntity,
  toStatus: TargetStatus,
  actor: string,
  reason: string,
  updates: Partial<TargetEntity> = {}
): TargetEntity {
  if (!canTransition(target.status, toStatus)) {
    const errMsg = `Illegal target state transition from "${target.status}" to "${toStatus}" for target ${target.target_id}`;
    logger.warn({ target_id: target.target_id, from: target.status, to: toStatus, actor, reason }, errMsg);
    throw new Error(errMsg);
  }

  const now = new Date().toISOString();
  const nextVersion = target.version + 1;

  // Build updated target object
  const updatedTarget: TargetEntity = {
    ...target,
    ...updates,
    status: toStatus,
    version: nextVersion,
  };

  // Persist to DB
  const stmt = db.prepare(`
    UPDATE post_targets
    SET status = ?,
        attempt_count = ?,
        max_retries = ?,
        next_retry_at = ?,
        lock_execution_id = ?,
        lock_stage = ?,
        locked_at = ?,
        platform_post_id = ?,
        post_url = ?,
        posted_at = ?,
        error_code = ?,
        error_category = ?,
        error_message = ?,
        version = ?,
        updated_at = ?
    WHERE target_id = ?
  `);

  stmt.run(
    updatedTarget.status,
    updatedTarget.attempt_count,
    updatedTarget.max_retries,
    updatedTarget.next_retry_at || null,
    updatedTarget.lock_execution_id || null,
    updatedTarget.lock_stage || null,
    updatedTarget.locked_at || null,
    updatedTarget.platform_post_id || null,
    updatedTarget.post_url || null,
    updatedTarget.posted_at || null,
    updatedTarget.error_code || null,
    updatedTarget.error_category || null,
    updatedTarget.error_message || null,
    nextVersion,
    now,
    target.target_id
  );

  // Write immutable audit log row
  const auditStmt = db.prepare(`
    INSERT INTO audit_log (id, actor, entity, entity_id, action, before_val, after_val, created_at)
    VALUES (?, ?, 'post_target', ?, ?, ?, ?, ?)
  `);

  auditStmt.run(
    generateAuditId(),
    actor,
    target.target_id,
    `transition_${toStatus}`,
    JSON.stringify({ status: target.status, lock_stage: target.lock_stage }),
    JSON.stringify({ status: toStatus, reason, ...updates }),
    now
  );

  logger.info(
    { target_id: target.target_id, from: target.status, to: toStatus, actor, reason },
    `Post target transitioned to ${toStatus}`
  );

  return updatedTarget;
}

export type PostLifecycleStatus =
  | 'DRAFT'
  | 'AI_REVIEW_PENDING'
  | 'AI_REVIEWED'
  | 'SCHEDULED'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'FAILED'
  | 'CANCELLED';

const POST_ALLOWED_TRANSITIONS: Record<PostLifecycleStatus, PostLifecycleStatus[]> = {
  DRAFT: ['AI_REVIEW_PENDING', 'SCHEDULED'],
  AI_REVIEW_PENDING: ['AI_REVIEWED', 'DRAFT', 'FAILED'],
  AI_REVIEWED: ['SCHEDULED', 'DRAFT', 'CANCELLED'],
  SCHEDULED: ['PUBLISHING', 'CANCELLED', 'DRAFT'],
  PUBLISHING: ['PUBLISHED', 'FAILED', 'CANCELLED'],
  PUBLISHED: [],
  FAILED: ['DRAFT', 'SCHEDULED', 'CANCELLED'],
  CANCELLED: ['DRAFT'],
};

export function canTransitionPost(from: PostLifecycleStatus, to: PostLifecycleStatus): boolean {
  return POST_ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function transitionPostStatus(
  postId: string,
  toStatus: PostLifecycleStatus,
  actor: string,
  reason: string,
  metadata: Record<string, any> = {}
) {
  const row = db.prepare('SELECT approval_status, version FROM posts WHERE post_id = ?').get(postId) as { approval_status: string; version: number } | undefined;
  if (!row) {
    throw new Error(`Post ${postId} not found`);
  }

  const currentStatus = (row.approval_status.toUpperCase() as PostLifecycleStatus) || 'DRAFT';
  if (currentStatus !== toStatus && !canTransitionPost(currentStatus, toStatus)) {
    throw new Error(`Illegal post status transition from "${currentStatus}" to "${toStatus}" for post ${postId}`);
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE posts
    SET approval_status = ?, updated_at = ?, version = version + 1
    WHERE post_id = ?
  `).run(toStatus, now, postId);

  try {
    const auditId = 'AUD-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    db.prepare(`
      INSERT INTO audit_events (id, entity_type, entity_id, action, actor_id, details_json, created_at)
      VALUES (?, 'post', ?, ?, ?, ?, ?)
    `).run(
      auditId,
      postId,
      `STATUS_TRANSITION_${toStatus}`,
      actor,
      JSON.stringify({ from: currentStatus, to: toStatus, reason, ...metadata }),
      now
    );
  } catch (err) {
    logger.warn({ err }, 'Failed writing audit event');
  }

  logger.info({ postId, from: currentStatus, to: toStatus, actor, reason }, 'Post status transitioned');
  return { postId, from: currentStatus, to: toStatus, updatedAt: now };
}
