import { randomUUID } from 'node:crypto';
import { db } from '../db/sqlite';
import { logger } from '../logging/logger';
import { publishDelivery } from './reliablePublisher';
import { DeliveryConflict, maxLatenessMinutes } from './deliveryClaims';

export class ScheduledPublisherService {
  private timer: NodeJS.Timeout | null = null;
  private initialTimer: NodeJS.Timeout | null = null;
  private isRunning = false;

  startService(intervalSeconds = 20) {
    this.stopService();
    this.timer = setInterval(() => void this.publishDuePosts(), intervalSeconds * 1000);
    this.initialTimer = setTimeout(() => void this.publishDuePosts(), 2000);
    logger.info({ intervalSeconds }, 'Scheduled publisher started');
  }

  stopService() {
    if (this.timer) clearInterval(this.timer);
    if (this.initialTimer) clearTimeout(this.initialTimer);
    this.timer = null;
    this.initialTimer = null;
  }

  async publishDuePosts() {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      const now = new Date().toISOString();
      const targets = db.prepare(`SELECT t.target_id FROM post_targets t JOIN posts p ON t.post_id = p.post_id
        WHERE t.status IN ('Scheduled', 'Retrying') AND p.approval_status = 'Approved'
        AND p.approved_version = p.version AND p.deleted_at IS NULL
        AND p.scheduled_utc <= ? AND p.scheduled_utc >= ?
        AND (t.next_retry_at IS NULL OR t.next_retry_at <= ?)
        AND t.attempt_count < t.max_retries ORDER BY p.scheduled_utc LIMIT 10`)
        .all(now, new Date(Date.now() - maxLatenessMinutes() * 60000).toISOString(), now) as any[];
      for (const target of targets) {
        try { await publishDelivery(target.target_id, `auto-${randomUUID()}`); }
        catch (error) {
          if (!(error instanceof DeliveryConflict)) logger.error({ targetId: target.target_id }, 'Scheduled delivery requires reconciliation');
        }
      }
    } catch { logger.error('Scheduled publisher cycle failed'); }
    finally { this.isRunning = false; }
  }
}
export const scheduledPublisher = new ScheduledPublisherService();
