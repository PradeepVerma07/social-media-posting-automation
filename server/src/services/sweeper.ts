import { db } from '../db/sqlite';
import { logger } from '../logging/logger';
import { transitionTarget } from './stateMachine';
import { metaVerifierService } from './verifier';
import { sheetsOutboxWorker } from './sheetsOutboxWorker';
import { sseManager } from './sseManager';
import { maxLatenessMinutes } from './deliveryClaims';

export class BackgroundSweeper {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  async runSweepCycle() {
    if (this.running) return;
    this.running = true;
    try {
      this.sweepStaleLocks();
      this.sweepMissedPosts();
      const pending = db.prepare(`SELECT target_id FROM post_targets WHERE status = 'NeedsVerification'
        AND platform_post_id IS NOT NULL ORDER BY updated_at LIMIT 10`).all() as any[];
      for (const target of pending) await metaVerifierService.verifyTarget(target.target_id);
    } finally { this.running = false; }
  }

  private sweepStaleLocks() {
    const ttl = Math.max(5, Number(process.env.LOCK_TTL_MINUTES) || 10);
    const threshold = new Date(Date.now() - ttl * 60000).toISOString();
    const rows = db.prepare(`SELECT t.*, p.client_id FROM post_targets t JOIN posts p ON t.post_id = p.post_id
      WHERE t.status = 'Processing' AND (t.locked_at IS NULL OR t.locked_at <= ?)`)
      .all(threshold) as any[];
    for (const target of rows) {
      const safeToRetry = target.lock_stage === 'claimed';
      const status = safeToRetry ? target.attempt_count < target.max_retries ? 'Retrying' : 'Failed' : 'NeedsVerification';
      db.exec('BEGIN IMMEDIATE');
      try {
        transitionTarget(target, status, 'sweeper', safeToRetry ? 'Claim expired before provider submission' : 'Provider outcome is unknown after execution expired', {
          next_retry_at: status === 'Retrying' ? new Date().toISOString() : null,
          lock_stage: safeToRetry ? null : target.lock_stage,
          lock_execution_id: safeToRetry ? null : target.lock_execution_id,
          locked_at: safeToRetry ? null : target.locked_at,
          error_code: safeToRetry ? 'CLAIM_EXPIRED' : 'UNKNOWN_OUTCOME',
          error_category: safeToRetry ? 'retryable' : 'unknown',
          error_message: safeToRetry ? 'The worker stopped before publishing.' : 'Check the provider account before any retry.',
        });
        db.prepare(`UPDATE publish_attempts SET result = ?, finished_at = ?, error_code = ?
          WHERE target_id = ? AND execution_id = ? AND result = 'running'`)
          .run(safeToRetry ? 'failed' : 'unknown', new Date().toISOString(), safeToRetry ? 'CLAIM_EXPIRED' : 'UNKNOWN_OUTCOME', target.target_id, target.lock_execution_id);
        db.exec('COMMIT');
      } catch { db.exec('ROLLBACK'); continue; }
      this.notify(target, status);
    }
  }

  private sweepMissedPosts() {
    const threshold = new Date(Date.now() - maxLatenessMinutes() * 60000).toISOString();
    const rows = db.prepare(`SELECT t.*, p.client_id FROM post_targets t JOIN posts p ON t.post_id = p.post_id
      WHERE t.status IN ('Scheduled', 'Retrying') AND p.scheduled_utc < ? AND p.deleted_at IS NULL`)
      .all(threshold) as any[];
    for (const target of rows) {
      try {
        transitionTarget(target, 'Missed', 'sweeper', 'Delivery exceeded the configured lateness window', {
          next_retry_at: null, error_code: 'MISSED_SCHEDULE', error_message: 'Choose a new time and approve this post before publishing.',
        });
        this.notify(target, 'Missed');
      } catch { /* Another worker changed the target after selection. */ }
    }
  }

  private notify(target: any, status: string) {
    sheetsOutboxWorker.enqueueTargetUpsert(target.target_id, target.client_id);
    sseManager.emit('target.status_changed', target.client_id, { targetId: target.target_id, status });
  }

  startSweeper(intervalSeconds = 60) {
    this.stopSweeper();
    this.timer = setInterval(() => {
      void this.runSweepCycle().catch(() => logger.error('Sweeper cycle failed'));
    }, intervalSeconds * 1000);
  }
  stopSweeper() { if (this.timer) clearInterval(this.timer); this.timer = null; }
}
export const backgroundSweeper = new BackgroundSweeper();
