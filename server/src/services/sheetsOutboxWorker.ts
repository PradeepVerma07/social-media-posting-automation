import fs from 'fs';
import path from 'path';
import https from 'https';
import crypto from 'crypto';
import { db } from '../db/sqlite';
import { logger } from '../logging/logger';
import { sseManager } from './sseManager';
import { getFreshGoogleAccessToken } from './googleAuth';

export class SheetsOutboxWorker {
  private spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || '1t4TsrPeKjI5FKM5u1oByldtfhpzDN_iRm1mD7zOr31A';
  private isDraining = false;

  private async getAccessToken(): Promise<string | null> {
    return getFreshGoogleAccessToken();
  }

  public enqueueTargetUpsert(targetId: string, clientId: string) {
    const target = db.prepare(`
      SELECT t.*, p.client_id, p.brand_id, p.title, p.caption, p.hashtags, p.media_type, p.media_urls,
             p.link_url, p.schedule_local_date, p.schedule_local_time, p.timezone, p.scheduled_utc,
             p.approval_status, b.brand_name, a.external_id as social_media_id
      FROM post_targets t
      JOIN posts p ON t.post_id = p.post_id
      JOIN brands b ON p.brand_id = b.brand_id
      JOIN social_accounts a ON t.account_id = a.account_id
      WHERE t.target_id = ?
    `).get(targetId) as any;

    if (!target) return;

    // media_urls joined with pipe |
    let mediaUrlsStr = '';
    try {
      const arr = JSON.parse(target.media_urls || '[]');
      if (Array.isArray(arr)) {
        mediaUrlsStr = arr
          .map((u: string) => (String(u).startsWith('/uploads/') ? `http://localhost:3000${u}` : String(u)))
          .join(' | ');
      } else {
        mediaUrlsStr = String(arr);
      }
    } catch {
      mediaUrlsStr = target.media_urls || '';
    }
    // Ensure relative upload paths become full accessible links in Google Sheets
    if (mediaUrlsStr.startsWith('/uploads/')) {
      mediaUrlsStr = `http://localhost:3000${mediaUrlsStr}`;
    }

    const rowArray = [
      target.post_id,
      target.target_id,
      target.client_id,
      target.brand_id,
      target.brand_name,
      target.platform,
      target.social_media_id,
      target.title,
      target.caption,
      target.hashtags || '',
      target.media_type,
      mediaUrlsStr,
      target.link_url || '',
      target.schedule_local_date,
      target.schedule_local_time,
      target.timezone,
      target.scheduled_utc,
      target.approval_status,
      target.status,
      String(target.attempt_count || 0),
      target.last_attempt_at || '',
      target.next_retry_at || '',
      target.posted_at || '',
      target.platform_post_id || '',
      target.post_url || '',
      target.error_code || '',
      target.error_message || '',
      target.lock_execution_id || '',
      String(target.version),
      new Date().toISOString(),
      '', // sync_note
    ];

    const outboxId = `OUT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    db.prepare(`
      INSERT INTO outbox (id, kind, entity_id, payload, attempts, next_run_at, status, created_at)
      VALUES (?, 'sheet_upsert', ?, ?, 0, ?, 'pending', ?)
    `).run(
      outboxId,
      targetId,
      JSON.stringify({ targetId, clientId, row: rowArray }),
      new Date().toISOString(),
      new Date().toISOString()
    );
  }

  async drainOutbox(): Promise<void> {
    if (this.isDraining) return;
    this.isDraining = true;

    try {
      const token = await this.getAccessToken();
      if (!token) {
        this.isDraining = false;
        return;
      }

      const pending = db.prepare(`
        SELECT * FROM outbox
        WHERE status = 'pending' AND next_run_at <= ?
        ORDER BY created_at ASC
        LIMIT 100
      `).all(new Date().toISOString()) as any[];

      if (pending.length === 0) {
        this.isDraining = false;
        return;
      }

      // 1. Fetch current Posts sheet to map target_id -> row_number
      const sheetData = await this.readPostsSheet(token);
      const rows = sheetData.rows || [];
      const targetIdToRowIndex = new Map<string, number>();

      rows.forEach((r, idx) => {
        const targetId = r[1]; // target_id is column 1 (0-indexed)
        if (targetId) {
          targetIdToRowIndex.set(targetId.trim(), idx + 1); // 1-indexed for Sheets
        }
      });

      const valueRanges: any[] = [];
      const appendRows: any[] = [];
      const successfulIds: string[] = [];

      for (const item of pending) {
        try {
          const payload = JSON.parse(item.payload);
          const targetId = payload.targetId;
          const rowData = payload.row;
          const existingRow = targetIdToRowIndex.get(targetId);

          if (existingRow && existingRow > 1) {
            valueRanges.push({
              range: `Posts!A${existingRow}:AE${existingRow}`,
              values: [rowData],
            });
          } else {
            appendRows.push(rowData);
          }

          successfulIds.push(item.id);

          // Update sheet_sync_state
          const hash = crypto.createHash('sha256').update(JSON.stringify(rowData)).digest('hex');
          db.prepare(`
            INSERT OR REPLACE INTO sheet_sync_state (entity_id, row_number, last_synced_hash, last_synced_version, last_synced_at)
            VALUES (?, ?, ?, ?, ?)
          `).run(targetId, existingRow || rows.length + 1, hash, 1, new Date().toISOString());

        } catch (parseErr) {
          db.prepare(`UPDATE outbox SET status = 'failed', last_error = ? WHERE id = ?`).run(
            String(parseErr),
            item.id
          );
        }
      }

      // Batch update existing rows
      if (valueRanges.length > 0) {
        await this.batchUpdateRows(token, valueRanges);
      }

      // Append new rows
      if (appendRows.length > 0) {
        await this.appendRowsToSheet(token, appendRows);
      }

      // Mark outbox entries as processed
      for (const id of successfulIds) {
        db.prepare(`UPDATE outbox SET status = 'completed' WHERE id = ?`).run(id);
      }

      sseManager.emit('sheet.sync_completed', 'CL-ALL', {
        syncedCount: successfulIds.length,
        timestamp: new Date().toISOString(),
      });

    } catch (err) {
      logger.error({ err }, 'Error during outbox drain');
    } finally {
      this.isDraining = false;
    }
  }

  private readPostsSheet(token: string): Promise<{ rows: string[][] }> {
    return new Promise((resolve) => {
      const options = {
        hostname: 'sheets.googleapis.com',
        path: `/v4/spreadsheets/${this.spreadsheetId}/values/Posts!A1:AE500?valueRenderOption=UNFORMATTED_VALUE`,
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            resolve({ rows: data.values || [] });
          } catch {
            resolve({ rows: [] });
          }
        });
      });
      req.on('error', () => resolve({ rows: [] }));
      req.end();
    });
  }

  private batchUpdateRows(token: string, valueRanges: any[]): Promise<boolean> {
    return new Promise((resolve) => {
      const postData = JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: valueRanges,
      });

      const options = {
        hostname: 'sheets.googleapis.com',
        path: `/v4/spreadsheets/${this.spreadsheetId}/values:batchUpdate`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = https.request(options, (res) => {
        res.on('data', () => {});
        res.on('end', () => resolve(res.statusCode === 200));
      });
      req.on('error', () => resolve(false));
      req.write(postData);
      req.end();
    });
  }

  private appendRowsToSheet(token: string, rows: any[][]): Promise<boolean> {
    return new Promise((resolve) => {
      const postData = JSON.stringify({ values: rows });
      const options = {
        hostname: 'sheets.googleapis.com',
        path: `/v4/spreadsheets/${this.spreadsheetId}/values/Posts!A:AE:append?valueInputOption=USER_ENTERED`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = https.request(options, (res) => {
        res.on('data', () => {});
        res.on('end', () => resolve(res.statusCode === 200));
      });
      req.on('error', () => resolve(false));
      req.write(postData);
      req.end();
    });
  }

  startWorker(intervalMs = 2000) {
    setInterval(() => {
      this.drainOutbox().catch(err => logger.error({ err }, 'Outbox loop error'));
    }, intervalMs);
  }
}

export const sheetsOutboxWorker = new SheetsOutboxWorker();
