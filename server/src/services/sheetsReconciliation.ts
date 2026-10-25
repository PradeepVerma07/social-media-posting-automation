import fs from 'fs';
import path from 'path';
import https from 'https';
import crypto from 'crypto';
import { db } from '../db/sqlite';
import { logger } from '../logging/logger';
import { generatePostId, generateTargetId, computeIdempotencyKey } from '../utils/idGenerator';
import { fromZone } from '../utils/time';
import { sheetsOutboxWorker } from './sheetsOutboxWorker';
import { sseManager } from './sseManager';
import { getFreshGoogleAccessToken } from './googleAuth';

export class SheetsReconciliationService {
  private spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || '1t4TsrPeKjI5FKM5u1oByldtfhpzDN_iRm1mD7zOr31A';
  private isReconciling = false;

  private async getAccessToken(): Promise<string | null> {
    return getFreshGoogleAccessToken();
  }

  async reconcile(): Promise<void> {
    if (this.isReconciling) return;
    this.isReconciling = true;

    try {
      const token = await this.getAccessToken();
      if (!token) {
        this.isReconciling = false;
        return;
      }

      // Read entire Posts sheet
      const rows = await this.readAllSheetRows(token);
      if (rows.length < 2) {
        this.isReconciling = false;
        return;
      }

      // Skip header row
      const dataRows = rows.slice(1);
      const now = new Date().toISOString();

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNumber = i + 2; // 1-indexed, +1 for header
        const postId = row[0] ? String(row[0]).trim() : '';
        const targetId = row[1] ? String(row[1]).trim() : '';

        // Case 1: Row without target_id typed directly into sheet
        if (!targetId && row[7]) { // has title
          await this.handleNewSheetTypedRow(row, rowNumber);
          continue;
        }

        if (!targetId) continue;

        // Compute row hash
        const rowHash = crypto.createHash('sha256').update(JSON.stringify(row)).digest('hex');
        const syncState = db.prepare(`SELECT * FROM sheet_sync_state WHERE entity_id = ?`).get(targetId) as any;

        // If hash matches last synced hash, no human change occurred
        if (syncState && syncState.last_synced_hash === rowHash) {
          continue;
        }

        // Changed by human operator in Google Sheets!
        await this.applyHumanSheetEdit(targetId, row, rowNumber);
      }

    } catch (err) {
      logger.error({ err }, 'Error during Sheets reconciliation safety pass');
    } finally {
      this.isReconciling = false;
    }
  }

  private async handleNewSheetTypedRow(row: any[], rowNumber: number) {
    try {
      const newPostId = generatePostId();
      const newTargetId = generateTargetId();

      const clientId = row[2] ? String(row[2]).trim() : 'CL-001';
      const brandId = row[3] ? String(row[3]).trim() : 'BR-001';
      const platform = (row[5] ? String(row[5]).trim().toLowerCase() : 'facebook') as any;
      const title = row[7] ? String(row[7]).trim() : 'Untitled Post';
      const caption = row[8] ? String(row[8]).trim() : '';
      const hashtags = row[9] ? String(row[9]).trim() : '';
      const mediaType = row[10] ? String(row[10]).trim().toLowerCase() : 'image';
      const mediaUrlsStr = row[11] ? String(row[11]).trim() : '';
      const mediaUrls = mediaUrlsStr.split('|').map(u => u.trim()).filter(Boolean);
      const scheduleDate = row[13] ? String(row[13]).trim() : '2026-10-28';
      const scheduleTime = row[14] ? String(row[14]).trim() : '14:00:00';
      const timezone = row[15] ? String(row[15]).trim() : 'Asia/Kolkata';

      const { scheduledUtc, normalizedTime } = fromZone(scheduleDate, scheduleTime, timezone);
      const idempotencyKey = computeIdempotencyKey(newTargetId, scheduledUtc, 1);
      const now = new Date().toISOString();

      // Find social account
      const account = db.prepare(`
        SELECT account_id FROM social_accounts WHERE brand_id = ? AND platform = ? LIMIT 1
      `).get(brandId, platform) as any;

      const accountId = account ? account.account_id : 'ACC-001';

      // Insert post
      db.prepare(`
        INSERT INTO posts (
          post_id, client_id, brand_id, title, caption, hashtags, media_type, media_urls,
          link_url, schedule_local_date, schedule_local_time, timezone, scheduled_utc,
          approval_status, source, created_at, updated_at, version
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, 'PendingApproval', 'sheet', ?, ?, 1)
      `).run(
        newPostId, clientId, brandId, title, caption, hashtags, mediaType, JSON.stringify(mediaUrls),
        scheduleDate, normalizedTime, timezone, scheduledUtc, now, now
      );

      // Insert target
      db.prepare(`
        INSERT INTO post_targets (
          target_id, post_id, account_id, platform, status, attempt_count, max_retries,
          idempotency_key, created_at, updated_at, version
        ) VALUES (?, ?, ?, ?, 'Draft', 0, 3, ?, ?, ?, 1)
      `).run(newTargetId, newPostId, accountId, platform, idempotencyKey, now, now);

      // Enqueue outbox update to write IDs back to the sheet row
      sheetsOutboxWorker.enqueueTargetUpsert(newTargetId, clientId);
      sseManager.emit('post.created', clientId, { postId: newPostId, targetId: newTargetId, title });

      logger.info({ newPostId, newTargetId, rowNumber }, 'Created new post from Sheet typed row');
    } catch (err) {
      logger.error({ err, rowNumber }, 'Failed creating post from Sheet row');
    }
  }

  private async applyHumanSheetEdit(targetId: string, row: any[], rowNumber: number) {
    try {
      const target = db.prepare(`SELECT * FROM post_targets WHERE target_id = ?`).get(targetId) as any;
      if (!target) return;

      const editableStatuses = ['Draft', 'Scheduled', 'Retrying', 'Failed', 'Missed'];
      if (!editableStatuses.includes(target.status)) {
        // Not editable (Processing or Posted) -> revert row with sync_note
        sheetsOutboxWorker.enqueueTargetUpsert(targetId, 'CL-001');
        return;
      }

      const post = db.prepare(`SELECT * FROM posts WHERE post_id = ?`).get(target.post_id) as any;
      if (!post) return;

      const title = row[7] ? String(row[7]).trim() : post.title;
      const caption = row[8] ? String(row[8]).trim() : post.caption;
      const hashtags = row[9] ? String(row[9]).trim() : post.hashtags;
      const scheduleDate = row[13] ? String(row[13]).trim() : post.schedule_local_date;
      const scheduleTime = row[14] ? String(row[14]).trim() : post.schedule_local_time;
      const timezone = row[15] ? String(row[15]).trim() : post.timezone;

      const { scheduledUtc, normalizedTime } = fromZone(scheduleDate, scheduleTime, timezone);
      const nextVersion = post.version + 1;
      const now = new Date().toISOString();

      db.prepare(`
        UPDATE posts
        SET title = ?, caption = ?, hashtags = ?, schedule_local_date = ?,
            schedule_local_time = ?, timezone = ?, scheduled_utc = ?,
            version = ?, updated_at = ?
        WHERE post_id = ?
      `).run(title, caption, hashtags, scheduleDate, normalizedTime, timezone, scheduledUtc, nextVersion, now, post.post_id);

      // Update target idempotency key with new schedule and version
      const newKey = computeIdempotencyKey(targetId, scheduledUtc, nextVersion);
      db.prepare(`UPDATE post_targets SET idempotency_key = ?, updated_at = ? WHERE target_id = ?`).run(
        newKey, now, targetId
      );

      // Update sync state
      const rowHash = crypto.createHash('sha256').update(JSON.stringify(row)).digest('hex');
      db.prepare(`
        INSERT OR REPLACE INTO sheet_sync_state (entity_id, row_number, last_synced_hash, last_synced_version, last_synced_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(targetId, rowNumber, rowHash, nextVersion, now);

      sseManager.emit('post.updated', post.client_id, { postId: post.post_id, targetId });
      logger.info({ targetId, rowNumber }, 'Applied human edit from Google Sheets');
    } catch (err) {
      logger.error({ err, targetId }, 'Failed applying human edit from Google Sheets');
    }
  }

  private readAllSheetRows(token: string): Promise<string[][]> {
    return new Promise((resolve) => {
      const options = {
        hostname: 'sheets.googleapis.com',
        path: `/v4/spreadsheets/${this.spreadsheetId}/values/Posts!A1:AE500?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`,
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            resolve(data.values || []);
          } catch {
            resolve([]);
          }
        });
      });
      req.on('error', () => resolve([]));
      req.end();
    });
  }

  startReconciliation(intervalSeconds = 60) {
    setInterval(() => {
      this.reconcile().catch(err => logger.error({ err }, 'Reconciliation cycle error'));
    }, intervalSeconds * 1000);
  }
}

export const sheetsReconciliationService = new SheetsReconciliationService();
