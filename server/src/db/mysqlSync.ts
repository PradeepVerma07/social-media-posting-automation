import { db } from './sqlite';
import { getMySQLPool, isMySQLConfigured, initMySQLSchema, testMySQLConnection } from './mysql';
import { logger } from '../logging/logger';

class MySQLSyncService {
  private timer: NodeJS.Timeout | null = null;
  private isSyncing = false;

  async start(): Promise<void> {
    if (!isMySQLConfigured()) {
      logger.info('[MySQL Sync] MySQL not configured in environment variables. Running in local SQLite mode.');
      return;
    }

    logger.info('[MySQL Sync] Starting Hostinger MySQL bidirectional synchronization...');
    const test = await testMySQLConnection();
    if (!test.ok) {
      logger.warn(`[MySQL Sync] Unable to connect to MySQL on start: ${test.message}. Retrying in background...`);
    } else {
      logger.info('[MySQL Sync] Connected to Hostinger MySQL! Initializing schema...');
      await initMySQLSchema();
      await this.pushAllToMySQL();
    }

    // Schedule background sync every 30 seconds
    this.timer = setInterval(() => {
      this.sync().catch(err => logger.error({ err }, '[MySQL Sync] Background sync error:'));
    }, 30000);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async sync(): Promise<void> {
    if (!isMySQLConfigured() || this.isSyncing) return;
    this.isSyncing = true;
    try {
      const pool = await getMySQLPool();
      if (!pool) return;

      // 1. Pull any newly updated rows from MySQL that n8n or external scripts updated
      await this.pullFromMySQL(pool);

      // 2. Push any changes from SQLite to MySQL
      await this.pushAllToMySQL();
    } catch (err: any) {
      logger.warn(`[MySQL Sync] Sync cycle warning: ${err.message}`);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Push all current SQLite entities into Hostinger MySQL
   */
  async pushAllToMySQL(): Promise<void> {
    const pool = await getMySQLPool();
    if (!pool) return;

    const tables = [
      'clients',
      'brands',
      'social_accounts',
      'posts',
      'post_targets',
      'publish_attempts',
      'executions_cache',
      'audit_log',
      'users',
      'notifications',
      'post_comments'
    ];

    for (const table of tables) {
      try {
        const rows = db.prepare(`SELECT * FROM ${table}`).all() as any[];
        if (rows.length === 0) continue;

        for (const row of rows) {
          await this.upsertToMySQL(pool, table, row);
        }
      } catch (err: any) {
        // Table might not exist or be empty
      }
    }
  }

  /**
   * Helper to write/update a single record in MySQL
   */
  async upsertToMySQL(pool: any, table: string, row: Record<string, any>): Promise<void> {
    const cols = Object.keys(row);
    if (cols.length === 0) return;

    const colList = cols.map(c => `\`${c}\``).join(', ');
    const placeholders = cols.map(() => '?').join(', ');
    const updateAssignments = cols.map(c => `\`${c}\` = VALUES(\`${c}\`)`).join(', ');

    const sql = `
      INSERT INTO \`${table}\` (${colList})
      VALUES (${placeholders})
      ON DUPLICATE KEY UPDATE ${updateAssignments}
    `;

    const values = cols.map(c => row[c]);
    await pool.query(sql, values);
  }

  /**
   * Pull records from MySQL that were updated by n8n or external processes
   */
  private async pullFromMySQL(pool: any): Promise<void> {
    try {
      // 1. Pull clients & brands if missing
      const localBrandCount = (db.prepare('SELECT count(*) as c FROM brands').get() as any)?.c || 0;
      if (localBrandCount === 0) {
        try {
          const [clients] = (await pool.query('SELECT * FROM clients')) as any[];
          if (Array.isArray(clients)) {
            for (const c of clients) {
              db.prepare('INSERT OR REPLACE INTO clients (client_id, name, status, created_at, updated_at, version) VALUES (?, ?, ?, ?, ?, ?)')
                .run(c.client_id, c.name, c.status, c.created_at, c.updated_at, c.version || 1);
            }
          }
          const [brands] = (await pool.query('SELECT * FROM brands')) as any[];
          if (Array.isArray(brands)) {
            for (const b of brands) {
              db.prepare(`
                INSERT OR REPLACE INTO brands (brand_id, client_id, brand_name, default_timezone, country, primary_color, secondary_color, default_hashtags, default_keywords, tokens_json, created_at, updated_at, version)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).run(b.brand_id, b.client_id, b.brand_name, b.default_timezone || 'Asia/Kolkata', b.country || 'IN', b.primary_color, b.secondary_color, b.default_hashtags, b.default_keywords, b.tokens_json, b.created_at, b.updated_at, b.version || 1);
            }
          }
        } catch {}
      }

      // 2. Pull social_accounts if missing
      const localAccountCount = (db.prepare('SELECT count(*) as c FROM social_accounts').get() as any)?.c || 0;
      if (localAccountCount === 0) {
        try {
          const [accounts] = (await pool.query('SELECT * FROM social_accounts')) as any[];
          if (Array.isArray(accounts)) {
            for (const a of accounts) {
              db.prepare(`
                INSERT OR REPLACE INTO social_accounts (account_id, client_id, brand_id, platform, account_handle, account_name, external_id, token_ciphertext, token_iv, token_tag, token_version, token_expires_at, status, last_checked_at, created_at, updated_at, version)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).run(a.account_id, a.client_id, a.brand_id, a.platform, a.account_handle, a.account_name, a.external_id, a.token_ciphertext, a.token_iv, a.token_tag, a.token_version || 1, a.token_expires_at, a.status, a.last_checked_at, a.created_at, a.updated_at, a.version || 1);
            }
          }
        } catch {}
      }

      // 3. Pull post_targets
      const [targets] = (await pool.query('SELECT * FROM post_targets ORDER BY updated_at DESC LIMIT 100')) as any[];
      if (Array.isArray(targets)) {
        for (const t of targets) {
          try {
            db.prepare(`
              INSERT INTO post_targets (
                target_id, post_id, account_id, platform, status, attempt_count,
                max_retries, next_retry_at, lock_execution_id, lock_stage, locked_at,
                platform_post_id, post_url, posted_at, error_code, error_category,
                error_message, idempotency_key, created_at, updated_at, version
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(target_id) DO UPDATE SET
                status = excluded.status,
                attempt_count = excluded.attempt_count,
                platform_post_id = excluded.platform_post_id,
                post_url = excluded.post_url,
                posted_at = excluded.posted_at,
                error_code = excluded.error_code,
                error_message = excluded.error_message,
                updated_at = excluded.updated_at
            `).run(
              t.target_id, t.post_id, t.account_id, t.platform, t.status, t.attempt_count || 0,
              t.max_retries || 3, t.next_retry_at, t.lock_execution_id, t.lock_stage, t.locked_at,
              t.platform_post_id, t.post_url, t.posted_at, t.error_code, t.error_category,
              t.error_message, t.idempotency_key, t.created_at, t.updated_at, t.version || 1
            );
          } catch {}
        }
      }

      // 4. Pull posts
      const [posts] = (await pool.query('SELECT * FROM posts ORDER BY created_at DESC LIMIT 100')) as any[];
      if (Array.isArray(posts)) {
        for (const p of posts) {
          try {
            db.prepare(`
              INSERT INTO posts (
                post_id, client_id, brand_id, title, caption, hashtags, media_type,
                media_urls, link_url, schedule_local_date, schedule_local_time, timezone,
                scheduled_utc, approval_status, approved_by, approved_at, source,
                deleted_at, placement, created_at, updated_at, version
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(post_id) DO UPDATE SET
                approval_status = excluded.approval_status,
                approved_by = excluded.approved_by,
                approved_at = excluded.approved_at,
                title = excluded.title,
                caption = excluded.caption,
                updated_at = excluded.updated_at
            `).run(
              p.post_id, p.client_id, p.brand_id, p.title, p.caption, p.hashtags, p.media_type,
              p.media_urls, p.link_url, p.schedule_local_date, p.schedule_local_time, p.timezone,
              p.scheduled_utc, p.approval_status, p.approved_by, p.approved_at, p.source,
              p.deleted_at, p.placement, p.created_at, p.updated_at, p.version || 1
            );
          } catch {}
        }
      }
    } catch (err: any) {
      // Ignore transient errors
    }
  }
}

export const mySQLSyncService = new MySQLSyncService();
