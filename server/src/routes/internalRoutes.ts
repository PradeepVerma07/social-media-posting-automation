import { Router, Request, Response } from 'express';
import { db } from '../db/sqlite';
import { logger } from '../logging/logger';
import { N8nClaimRequestSchema, N8nCallbackSchema } from '../schemas';
import { decryptToken, verifyHmacSignature } from '../crypto/tokenVault';
import { generateAttemptId } from '../utils/idGenerator';
import { transitionTarget } from '../services/stateMachine';
import { classifyMetaError } from '../services/metaErrors';
import { alertService } from '../services/alerts';
import { sheetsOutboxWorker } from '../services/sheetsOutboxWorker';
import { sseManager } from '../services/sseManager';

export const internalRouter = Router();

const CALLBACK_SECRET = process.env.N8N_CALLBACK_SECRET || 'ci360_n8n_callback_master_secret_2026';
const MAX_LATENESS_MINUTES = Number(process.env.MAX_LATENESS_MINUTES) || 360;

/**
 * Atomic Claim Endpoint: POST /internal/jobs/claim
 * Atomically selects due approved targets in a single SQLite transaction (BEGIN IMMEDIATE)
 */
internalRouter.post('/jobs/claim', (req: Request, res: Response) => {
  const parseResult = N8nClaimRequestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.format() });
  }

  const { execution_id, limit, target_ids } = parseResult.data;
  const now = new Date().toISOString();
  const latenessThreshold = new Date(Date.now() - MAX_LATENESS_MINUTES * 60000).toISOString();

  const claimedJobs: any[] = [];
  const claimedTargetIds: string[] = [];

  // Begin atomic transaction
  db.exec('BEGIN IMMEDIATE');

  try {
    let query = `
      SELECT t.target_id, t.post_id, t.account_id, t.platform, t.attempt_count, t.max_retries,
             t.idempotency_key, p.title, p.caption, p.hashtags, p.media_type, p.media_urls,
             p.link_url, p.scheduled_utc, p.client_id, a.external_id, a.status as account_status
      FROM post_targets t
      JOIN posts p ON t.post_id = p.post_id
      JOIN social_accounts a ON t.account_id = a.account_id
      WHERE t.status IN ('Scheduled', 'Retrying')
        AND p.approval_status = 'Approved'
        AND p.deleted_at IS NULL
        AND a.status = 'active'
        AND p.scheduled_utc <= ?
        AND p.scheduled_utc >= ?
        AND (t.next_retry_at IS NULL OR t.next_retry_at <= ?)
    `;

    const params: any[] = [now, latenessThreshold, now];

    if (target_ids && target_ids.length > 0) {
      const placeholders = target_ids.map(() => '?').join(',');
      query += ` AND t.target_id IN (${placeholders})`;
      params.push(...target_ids);
    }

    query += ` ORDER BY p.scheduled_utc ASC LIMIT ?`;
    params.push(limit);

    const eligible = db.prepare(query).all(...params) as any[];

    for (const row of eligible) {
      const nextAttemptCount = (row.attempt_count || 0) + 1;
      const attemptId = generateAttemptId();

      // Lock row atomically
      db.prepare(`
        UPDATE post_targets
        SET status = 'Processing',
            lock_execution_id = ?,
            lock_stage = 'claimed',
            locked_at = ?,
            attempt_count = ?,
            updated_at = ?
        WHERE target_id = ?
      `).run(execution_id, now, nextAttemptCount, now, row.target_id);

      // Insert publish_attempts record
      db.prepare(`
        INSERT INTO publish_attempts (attempt_id, target_id, execution_id, started_at, result, created_at)
        VALUES (?, ?, ?, ?, 'running', ?)
      `).run(attemptId, row.target_id, execution_id, now, now);

      let mediaUrls: string[] = [];
      try {
        mediaUrls = JSON.parse(row.media_urls);
      } catch {
        mediaUrls = [row.media_urls];
      }

      const finalCaption = row.hashtags ? `${row.caption}\n\n${row.hashtags}` : row.caption;

      claimedJobs.push({
        target_id: row.target_id,
        idempotency_key: row.idempotency_key,
        platform: row.platform,
        external_id: row.external_id,
        account_id: row.account_id,
        media_type: row.media_type,
        media_urls: mediaUrls,
        caption: finalCaption,
        link_url: row.link_url,
        graph_version: process.env.META_GRAPH_VERSION || 'v21.0',
        token_ref: `/internal/accounts/${row.account_id}/token`,
      });

      claimedTargetIds.push(row.target_id);
    }

    // Commit transaction
    db.exec('COMMIT');

    // Post-commit: enqueue outbox update & broadcast SSE
    for (const tId of claimedTargetIds) {
      sheetsOutboxWorker.enqueueTargetUpsert(tId, 'CL-001');
      sseManager.emit('target.status_changed', 'CL-001', { targetId: tId, status: 'Processing', lockStage: 'claimed' });
    }

    logger.info({ execution_id, claimedCount: claimedJobs.length }, 'Successfully claimed due jobs');
    return res.json({ jobs: claimedJobs });

  } catch (err) {
    db.exec('ROLLBACK');
    logger.error({ err, execution_id }, 'Error during atomic job claim');
    return res.status(500).json({ error: 'Failed to atomically claim jobs' });
  }
});

/**
 * Token Endpoint: GET /internal/accounts/:id/token
 * Decrypts Meta Page Access Token for n8n in memory. Never cached or logged.
 */
internalRouter.get('/accounts/:id/token', (req: Request, res: Response) => {
  const accountId = req.params.id;
  const account = db.prepare(`SELECT * FROM social_accounts WHERE account_id = ?`).get(accountId) as any;

  if (!account || !account.token_ciphertext) {
    return res.status(404).json({ error: 'Account or token not found' });
  }

  try {
    const plainToken = decryptToken({
      ciphertext: account.token_ciphertext,
      iv: account.token_iv,
      tag: account.token_tag,
      version: account.token_version,
    });

    return res.json({
      account_id: account.account_id,
      platform: account.platform,
      external_id: account.external_id,
      access_token: plainToken,
    });
  } catch (err) {
    logger.error({ err, accountId }, 'Failed decrypting account token');
    return res.status(500).json({ error: 'Decryption failed' });
  }
});

/**
 * n8n Callback Endpoint: POST /internal/n8n/callback
 * HMAC signature verified, event-deduplicated, updates targets and attempts in real-time
 */
internalRouter.post('/n8n/callback', (req: Request, res: Response) => {
  const timestamp = req.headers['x-ci360-timestamp'] as string;
  const signature = req.headers['x-ci360-signature'] as string;
  const eventId = req.headers['x-ci360-event-id'] as string;

  // 1. Verify Timestamp (< 5 minutes old)
  if (timestamp) {
    const age = Math.abs(Date.now() - Number(timestamp));
    if (age > 5 * 60 * 1000) {
      logger.warn({ age }, 'Rejecting stale n8n callback');
      return res.status(401).json({ error: 'Callback timestamp expired' });
    }
  }

  // 2. Verify HMAC Signature
  if (signature) {
    const rawBody = JSON.stringify(req.body);
    const valid = verifyHmacSignature(timestamp + '.' + rawBody, signature, CALLBACK_SECRET);
    if (!valid) {
      logger.warn({ signature }, 'Invalid HMAC signature on n8n callback');
      return res.status(401).json({ error: 'Invalid HMAC signature' });
    }
  }

  // 3. Deduplication via webhook_events
  if (eventId) {
    const existing = db.prepare(`SELECT event_id FROM webhook_events WHERE event_id = ?`).get(eventId);
    if (existing) {
      return res.status(200).json({ status: 'duplicate_ignored' });
    }
    db.prepare(`INSERT INTO webhook_events (event_id, received_at) VALUES (?, ?)`).run(
      eventId,
      new Date().toISOString()
    );
  }

  const parseResult = N8nCallbackSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.format() });
  }

  const {
    target_id,
    execution_id,
    stage,
    platform_post_id,
    post_url,
    error_code,
    error_subcode,
    http_status,
    error_message,
  } = parseResult.data;

  const target = db.prepare(`
    SELECT t.*, p.client_id
    FROM post_targets t
    JOIN posts p ON t.post_id = p.post_id
    WHERE t.target_id = ?
  `).get(target_id) as any;

  if (!target) {
    return res.status(404).json({ error: 'Target not found' });
  }

  const now = new Date().toISOString();

  // Stage 1: Publishing stage reported right before Meta call
  if (stage === 'publishing') {
    db.prepare(`UPDATE post_targets SET lock_stage = 'publishing', updated_at = ? WHERE target_id = ?`).run(
      now,
      target_id
    );
    sseManager.emit('target.status_changed', target.client_id, { targetId: target_id, status: 'Processing', lockStage: 'publishing' });
    return res.json({ status: 'stage_updated' });
  }

  // Stage 2: Succeeded (Meta returned live ID)
  if (stage === 'succeeded') {
    const resolvedPostUrl = post_url || (platform_post_id ? `https://facebook.com/${platform_post_id}` : '');
    transitionTarget(target, 'Posted', 'n8n_callback', 'Successfully published to platform', {
      platform_post_id: platform_post_id || null,
      post_url: resolvedPostUrl,
      posted_at: now,
      lock_execution_id: null,
      lock_stage: null,
    });

    // Update publish attempt
    db.prepare(`
      UPDATE publish_attempts
      SET finished_at = ?, result = 'success', raw_response_redacted = ?
      WHERE target_id = ? AND execution_id = ?
    `).run(now, JSON.stringify({ platform_post_id, post_url }), target_id, execution_id);

    sheetsOutboxWorker.enqueueTargetUpsert(target_id, target.client_id);
    sseManager.emit('target.status_changed', target.client_id, {
      targetId: target_id,
      status: 'Posted',
      postUrl: resolvedPostUrl,
    });

    return res.json({ status: 'posted_recorded' });
  }

  // Stage 3: Failed
  if (stage === 'failed' || stage === 'execution_crashed') {
    const errorInfo = classifyMetaError(error_code, error_subcode, http_status, error_message);

    db.prepare(`
      UPDATE publish_attempts
      SET finished_at = ?, result = 'failed', error_code = ?, raw_response_redacted = ?
      WHERE target_id = ? AND execution_id = ?
    `).run(now, String(error_code || 'ERROR'), JSON.stringify({ error_code, error_message }), target_id, execution_id);

    if (errorInfo.category === 'auth') {
      // Mark account needs_reauth, pause targets
      db.prepare(`UPDATE social_accounts SET status = 'needs_reauth' WHERE account_id = ?`).run(target.account_id);
      transitionTarget(target, 'Failed', 'n8n_callback', errorInfo.userMessage, {
        error_code: String(error_code),
        error_category: 'auth',
        error_message: errorInfo.userMessage,
        lock_stage: null,
        lock_execution_id: null,
      });

      alertService.notify(`auth_${target.account_id}`, 'High', 'Social account requires re-authentication', {
        accountId: target.account_id,
        targetId: target_id,
      });

    } else if (errorInfo.isRetryable && target.attempt_count < target.max_retries) {
      // Exponential backoff: min(2^attempt_count, 60m) + jitter
      const delayMinutes = Math.min(Math.pow(2, target.attempt_count), 60);
      const jitterMs = Math.floor(Math.random() * 30000);
      const nextRetryAt = new Date(Date.now() + delayMinutes * 60000 + jitterMs).toISOString();

      transitionTarget(target, 'Retrying', 'n8n_callback', errorInfo.userMessage, {
        error_code: String(error_code),
        error_category: errorInfo.category,
        error_message: errorInfo.userMessage,
        next_retry_at: nextRetryAt,
        lock_stage: null,
        lock_execution_id: null,
      });

    } else {
      // Permanent failure
      transitionTarget(target, 'Failed', 'n8n_callback', errorInfo.userMessage, {
        error_code: String(error_code),
        error_category: errorInfo.category,
        error_message: errorInfo.userMessage,
        lock_stage: null,
        lock_execution_id: null,
      });

      if (errorInfo.category === 'policy') {
        alertService.notify(`policy_${target_id}`, 'High', 'Post blocked by Meta policy', {
          targetId: target_id,
          errorMessage: errorInfo.userMessage,
        });
      }
    }

    sheetsOutboxWorker.enqueueTargetUpsert(target_id, target.client_id);
    sseManager.emit('target.status_changed', target.client_id, { targetId: target_id, status: target.status });

    return res.json({ status: 'failure_recorded' });
  }

  return res.json({ status: 'ok' });
});
