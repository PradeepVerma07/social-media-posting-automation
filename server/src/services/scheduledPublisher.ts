import { db } from '../db/sqlite';
import { logger } from '../logging/logger';
import { publishTargetDirectly } from '../routes/publicRoutes';
import { sseManager } from './sseManager';

export class ScheduledPublisherService {
  private timer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  startService(intervalSeconds = 20) {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.publishDuePosts(), intervalSeconds * 1000);
    logger.info({ intervalSeconds }, 'ScheduledPublisher background service started');
    setTimeout(() => this.publishDuePosts(), 2000);
  }

  stopService() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async publishDuePosts() {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      const now = new Date().toISOString();
      const query = `
        SELECT t.*, p.title, p.caption, p.hashtags, p.media_urls, p.media_type, p.placement,
               p.scheduled_utc, p.client_id, p.tagged_users
        FROM post_targets t
        JOIN posts p ON t.post_id = p.post_id
        WHERE t.status = 'Scheduled'
          AND p.approval_status = 'Approved'
          AND p.deleted_at IS NULL
          AND p.scheduled_utc <= ?
        ORDER BY p.scheduled_utc ASC
        LIMIT 10
      `;
      const dueTargets = db.prepare(query).all(now) as any[];

      for (const target of dueTargets) {
        try {
          logger.info({ targetId: target.target_id, platform: target.platform, title: target.title }, 'Auto-publishing scheduled post target');
          const execId = `EXEC-AUTO-${Date.now().toString(36).toUpperCase()}`;
          const post = {
            post_id: target.post_id,
            client_id: target.client_id,
            caption: target.caption,
            hashtags: target.hashtags,
            media_urls: target.media_urls,
            media_type: target.media_type,
            placement: target.placement,
            tagged_users: target.tagged_users,
          };
          const pubResult = await publishTargetDirectly(target, post, execId);
          if (pubResult.result === 'succeeded' || pubResult.result === 'partial') {
            const finalStatus = pubResult.targetStatus || (pubResult.result === 'succeeded' ? 'Posted' : 'NeedsVerification');
            sseManager.emit('target.status_changed', target.client_id, { targetId: target.target_id, status: finalStatus });
            sseManager.emit('post.updated', target.client_id, { postId: target.post_id });
          } else {
            sseManager.emit('target.status_changed', target.client_id, { targetId: target.target_id, status: 'Failed' });
          }
        } catch (targetErr: any) {
          logger.error({ targetId: target.target_id, platform: target.platform, err: targetErr.message }, 'ScheduledPublisher target auto-publishing error');
        }
      }
    } catch (err: any) {
      logger.error({ err: err.message }, 'ScheduledPublisher error');
    } finally {
      this.isRunning = false;
    }
  }
}

export const scheduledPublisher = new ScheduledPublisherService();
