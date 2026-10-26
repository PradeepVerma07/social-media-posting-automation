import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { encryptToken } from '../crypto/tokenVault';

const dbDir = path.resolve(process.cwd(), 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = process.env.DATABASE_URL?.replace('sqlite://', '') || path.join(dbDir, 'ci360.sqlite');
export const db = new DatabaseSync(dbPath);

// Enable WAL mode, Foreign Keys and busy timeout for high-concurrency production reliability
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;
  PRAGMA synchronous = NORMAL;
`);

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      client_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS brands (
      brand_id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      brand_name TEXT NOT NULL,
      default_timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
      country TEXT NOT NULL DEFAULT 'IN',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS social_accounts (
      account_id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      brand_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      account_handle TEXT,
      account_name TEXT,
      external_id TEXT NOT NULL,
      token_ciphertext TEXT NOT NULL,
      token_iv TEXT NOT NULL,
      token_tag TEXT NOT NULL,
      token_version INTEGER NOT NULL DEFAULT 1,
      token_expires_at TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      last_checked_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE,
      FOREIGN KEY (brand_id) REFERENCES brands(brand_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS posts (
      post_id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      brand_id TEXT NOT NULL,
      title TEXT NOT NULL,
      caption TEXT NOT NULL,
      hashtags TEXT NOT NULL DEFAULT '',
      media_type TEXT NOT NULL DEFAULT 'image',
      media_urls TEXT NOT NULL DEFAULT '[]', -- JSON array of strings
      link_url TEXT NOT NULL DEFAULT '',
      schedule_local_date TEXT NOT NULL,
      schedule_local_time TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
      scheduled_utc TEXT NOT NULL,
      approval_status TEXT NOT NULL DEFAULT 'Draft',
      approved_by TEXT,
      approved_at TEXT,
      source TEXT NOT NULL DEFAULT 'dashboard',
      deleted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE,
      FOREIGN KEY (brand_id) REFERENCES brands(brand_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS post_targets (
      target_id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      account_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Draft',
      attempt_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 3,
      next_retry_at TEXT,
      lock_execution_id TEXT,
      lock_stage TEXT,
      locked_at TEXT,
      platform_post_id TEXT,
      post_url TEXT,
      posted_at TEXT,
      error_code TEXT,
      error_category TEXT,
      error_message TEXT,
      idempotency_key TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (post_id) REFERENCES posts(post_id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES social_accounts(account_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS publish_attempts (
      attempt_id TEXT PRIMARY KEY,
      target_id TEXT NOT NULL,
      execution_id TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      result TEXT NOT NULL,
      error_code TEXT,
      raw_response_redacted TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (target_id) REFERENCES post_targets(target_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS executions_cache (
      execution_id TEXT PRIMARY KEY,
      workflow_id TEXT NOT NULL,
      status TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'trigger',
      started_at TEXT NOT NULL,
      stopped_at TEXT,
      target_ids TEXT NOT NULL DEFAULT '[]', -- JSON array of string target_ids
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS outbox (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL, -- 'sheet_upsert' | 'sheet_delete'
      entity_id TEXT NOT NULL,
      payload TEXT NOT NULL, -- JSON string
      attempts INTEGER NOT NULL DEFAULT 0,
      next_run_at TEXT NOT NULL,
      last_error TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sheet_sync_state (
      entity_id TEXT PRIMARY KEY,
      row_number INTEGER,
      last_synced_hash TEXT NOT NULL,
      last_synced_version INTEGER NOT NULL,
      last_synced_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS webhook_events (
      event_id TEXT PRIMARY KEY,
      received_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      actor TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      action TEXT NOT NULL,
      before_val TEXT,
      after_val TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      avatar_url TEXT,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'Super Admin',
      tenant_scope TEXT DEFAULT 'Global (All Brands)',
      is_active INTEGER NOT NULL DEFAULT 1,
      two_factor_enabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL DEFAULT 1,
      event_type TEXT NOT NULL DEFAULT 'system',
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link_url TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS post_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id TEXT NOT NULL,
      user_id INTEGER NOT NULL DEFAULT 1,
      user_full_name TEXT NOT NULL DEFAULT 'David Vance',
      user_avatar_url TEXT,
      user_role TEXT NOT NULL DEFAULT 'Super Admin',
      comment_text TEXT NOT NULL,
      is_system_message INTEGER NOT NULL DEFAULT 0,
      attachment_url TEXT,
      created_at TEXT NOT NULL
    );

    -- Indexes for high performance querying and atomic claims
    CREATE INDEX IF NOT EXISTS idx_posts_client ON posts(client_id, deleted_at);
    CREATE INDEX IF NOT EXISTS idx_targets_claim ON post_targets(status, next_retry_at, locked_at);
    CREATE INDEX IF NOT EXISTS idx_targets_post ON post_targets(post_id);
    CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox(status, next_run_at);
    CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity, entity_id);
    CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id);
  `);

  // Migrate columns if needed
  try {
    db.prepare(`ALTER TABLE posts ADD COLUMN placement TEXT DEFAULT '["feed"]'`).run();
  } catch {}
  try {
    db.prepare(`ALTER TABLE brands ADD COLUMN primary_color TEXT DEFAULT '#1336E8'`).run();
  } catch {}
  try {
    db.prepare(`ALTER TABLE brands ADD COLUMN secondary_color TEXT DEFAULT '#08C5E1'`).run();
  } catch {}
  try {
    db.prepare(`ALTER TABLE brands ADD COLUMN default_hashtags TEXT DEFAULT '#flowerplant #nature #blooms'`).run();
  } catch {}
  try {
    db.prepare(`ALTER TABLE brands ADD COLUMN default_keywords TEXT DEFAULT 'plants, gardening, flowers'`).run();
  } catch {}
  try {
    db.prepare(`ALTER TABLE brands ADD COLUMN tokens_json TEXT DEFAULT '{}'`).run();
  } catch {}
  try {
    db.prepare(`ALTER TABLE users ADD COLUMN password TEXT DEFAULT 'Admin@123'`).run();
  } catch {}

  // Seed default clients if empty
  const clientCount = db.prepare('SELECT count(*) as c FROM clients').get() as { c: number };
  if (clientCount.c === 0) {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR REPLACE INTO clients (client_id, name, status, created_at, updated_at, version)
      VALUES ('CL-001', 'Flower Plant Corp', 'active', ?, ?, 1)
    `).run(now, now);
  }

  // Seed default brands if empty
  const brandCount = db.prepare('SELECT count(*) as c FROM brands').get() as { c: number };
  if (brandCount.c === 0) {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR REPLACE INTO brands (
        brand_id, client_id, brand_name, default_timezone, country,
        primary_color, secondary_color, default_hashtags, default_keywords,
        created_at, updated_at, version
      ) VALUES (
        'BR-001', 'CL-001', 'Flower Plant', 'Asia/Kolkata', 'IN',
        '#1336E8', '#08C5E1', '#flowerplant #nature #blooms', 'plants, gardening, flowers',
        ?, ?, 1
      )
    `).run(now, now);
  }

  // Seed default social accounts if empty
  const accountCount = db.prepare('SELECT count(*) as c FROM social_accounts').get() as { c: number };
  if (accountCount.c === 0) {
    const now = new Date().toISOString();
    const liveToken = process.env.META_ACCESS_TOKEN || process.env.META_PAGE_ACCESS_TOKEN || 'EAGVJejn6LZAgBSxZAyX1example';
    const encrypted = encryptToken(liveToken);

    const accountsToSeed = [
      { id: 'ACC-001', platform: 'facebook', handle: '@flowerplant', name: 'Flower Plant Official', externalId: '1454740611044963' },
      { id: 'ACC-002', platform: 'instagram', handle: '@ciflow904', name: 'Flower Plant Instagram', externalId: '17841439037630316' },
      { id: 'ACC-003', platform: 'youtube', handle: '@flowerplant_yt', name: 'Flower Plant YouTube & Shorts', externalId: 'UC_flowerplant_yt' },
      { id: 'ACC-004', platform: 'whatsapp', handle: '+919876543210', name: 'Flower Plant WhatsApp Status & Channel', externalId: 'WA_flowerplant_91' },
      { id: 'ACC-005', platform: 'linkedin', handle: 'flower-plant-official', name: 'Flower Plant AgriTech LinkedIn', externalId: 'urn:li:organization:123456' },
      { id: 'ACC-006', platform: 'x', handle: '@flowerplant_in', name: 'Flower Plant X Channel', externalId: '1454740611044963_x' },
    ];

    for (const acc of accountsToSeed) {
      db.prepare(`
        INSERT OR REPLACE INTO social_accounts (
          account_id, client_id, brand_id, platform, account_handle, account_name,
          external_id, token_ciphertext, token_iv, token_tag, token_version, status,
          last_checked_at, created_at, updated_at, version
        ) VALUES (
          ?, 'CL-001', 'BR-001', ?, ?, ?,
          ?, ?, ?, ?, ?, 'active', ?, ?, ?, 1
        )
      `).run(
        acc.id, acc.platform, acc.handle, acc.name, acc.externalId,
        encrypted.ciphertext, encrypted.iv, encrypted.tag, encrypted.version,
        now, now, now
      );
    }
  }

  // Seed default users if empty
  const userCount = db.prepare('SELECT count(*) as c FROM users').get() as { c: number };
  if (userCount.c === 0) {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO users (email, full_name, avatar_url, phone, role, tenant_scope, is_active, two_factor_enabled, created_at)
      VALUES 
        ('admin@ci360.agency', 'David Vance', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', '+91 98765 43210', 'Super Admin', 'Global (All Brands)', 1, 1, ?),
        ('sarah@ci360.agency', 'Sarah Chen', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', '+91 98765 43211', 'Content Manager', 'Global (All Brands)', 1, 0, ?),
        ('marcus@ci360.agency', 'Marcus Approver', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', '+91 98765 43212', 'Approver', 'Global (All Brands)', 1, 1, ?)
    `).run(now, now, now);
  }

  // Seed notifications if empty
  const notifCount = db.prepare('SELECT count(*) as c FROM notifications').get() as { c: number };
  if (notifCount.c === 0) {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO notifications (user_id, event_type, title, message, link_url, is_read, created_at)
      VALUES
        (1, 'system', 'n8n Orchestrator Active', 'Scheduled polling and webhook triggers operating normally at Asia/Kolkata.', '/automations', 0, ?),
        (1, 'sync', 'Google Sheets Outbox Synchronized', 'Connected live to Google Sheets with 2-way sync.', '/sheets', 0, ?),
        (1, 'brand', 'Brand Setup Active', 'Flower Plant connected with Facebook & Instagram.', '/brands', 1, ?)
    `).run(now, now, now);
  }
}

// Automatically initialize schema upon load
initDatabase();
