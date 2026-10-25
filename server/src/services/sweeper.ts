import { db } from '../db/sqlite';
import { logger } from '../logging/logger';
import { transitionTarget } from './stateMachine';
import { alertService } from './alerts';
import { metaVerifierService } from './verifier';
import { sheetsOutboxWorker } from './sheetsOutboxWorker';
import { sseManager } from './sseManager';

export class BackgroundSweeper {
  private lockTtlMinutes = Number(process.env.LOCK_TTL_MINUTES) || 10;
  private maxLatenessMinutes = Number(process.env.MAX_LATENESS_MINUTES) || 360; // 6 hours

  async runSweepCycle() {
    await this.sweepStaleLocks();
    await this.sweepMissedPosts();
  }

  /**
   * Stale lock sweeper: targets in Processing older than LOCK_TTL_MINUTES
   */
  private async sweepStaleLocks() {
    const threshold = new Date(Date.now() - this.lockTtlMinutes * 60000).toISOString();
    const staleTargets = db.prepare(`
      SELECT t.*, p.client_id
      FROM post_targets t
      JOIN posts p ON t.post_id = p.post_id
      WHERE t.status = 'Processing' AND t.locked_at <= ?
    `).all(threshold) as any[];

    for (const t of staleTargets) {
      if (t.lock_stage === 'claimed') {
        // Meta was never called: move to Retrying
        logger.info({ targetId: t.target_id }, 'Stale lock at claimed stage. Moving to Retrying.');
        transitionTarget(t, 'Retrying', 'sweeper', 'Lock TTL expired at claimed stage (Meta not called)', {
          next_retry_at: new Date().toISOString(),
          lock_stage: null,
          lock_execution_id: null,
        });
        sheetsOutboxWorker.enqueueTargetUpsert(t.target_id, t.client_id);
        sseManager.emit('target.status_changed', t.client_id, { targetId: t.target_id, status: 'Retrying' });
      } else if (t.lock_stage === 'publishing') {
        // Meta may have received the post: move to NeedsVerification
        logger.warn({ targetId: t.target_id }, 'Stale lock at publishing stage. Moving to NeedsVerification.');
        transitionTarget(t, 'NeedsVerification', 'sweeper', 'Lock TTL expired at publishing stage (verification required)');
        sheetsOutboxWorker.enqueueTargetUpsert(t.target_id, t.client_id);
        sseManager.emit('target.status_changed', t.client_id, { targetId: t.target_id, status: 'NeedsVerification' });

        // Trigger verifier check
        metaVerifierService.verifyTarget(t.target_id).catch(err => {
          logger.error({ err, targetId: t.target_id }, 'Error during background verification');
        });
      }
    }
  }

  /**
   * Missed posts sweeper: Scheduled targets older than MAX_LATENESS_MINUTES
   */
  private async sweepMissedPosts() {
    const threshold = new Date(Date.now() - this.maxLatenessMinutes * 60000).toISOString();
    const missedTargets = db.prepare(`
      SELECT t.*, p.client_id, p.scheduled_utc
      FROM post_targets t
      JOIN posts p ON t.post_id = p.post_id
      WHERE t.status = 'Scheduled' AND p.scheduled_utc <= ?
    `).all(threshold) as any[];

    for (const t of missedTargets) {
      logger.warn({ targetId: t.target_id, scheduledUtc: t.scheduled_utc }, 'Target exceeded max lateness window. Moving to Missed.');
      transitionTarget(t, 'Missed', 'sweeper', `Scheduled time is over ${this.maxLatenessMinutes} minutes in the past.`);
      sheetsOutboxWorker.enqueueTargetUpsert(t.target_id, t.client_id);
      sseManager.emit('target.status_changed', t.client_id, { targetId: t.target_id, status: 'Missed' });

      alertService.notify(`missed_${t.target_id}`, 'High', `Post target missed schedule window`, {
        targetId: t.target_id,
        scheduledUtc: t.scheduled_utc,
      });
    }
  }

  startSweeper(intervalSeconds = 60) {
    setInterval(() => {
      this.runSweepCycle().catch(err => logger.error({ err }, 'Sweeper error'));
    }, intervalSeconds * 1000);
  }
}

export const backgroundSweeper = new BackgroundSweeper();
