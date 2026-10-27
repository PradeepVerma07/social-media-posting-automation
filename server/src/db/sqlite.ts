import fs from 'fs';
import path from 'path';

try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    process.loadEnvFile(envPath);
  }
} catch {}

import { DatabaseSync } from 'node:sqlite';
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
      tagged_users TEXT NOT NULL DEFAULT '[]',
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

    -- CI360 AI Neural Studio & Predictive Feed Intelligence Tables
    CREATE TABLE IF NOT EXISTS feed_audits (
      audit_id TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      external_post_id TEXT,
      title TEXT,
      caption TEXT,
      media_url TEXT,
      media_type TEXT DEFAULT 'image',
      hook_score INTEGER DEFAULT 80,
      visual_score INTEGER DEFAULT 85,
      engagement_velocity REAL DEFAULT 1.2,
      sentiment TEXT DEFAULT 'positive',
      virality_grade TEXT DEFAULT 'A',
      raw_metrics_json TEXT DEFAULT '{}',
      recommendations_json TEXT DEFAULT '[]',
      published_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_intercepted_posts (
      intercept_id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      brand_id TEXT NOT NULL,
      original_caption TEXT,
      original_hashtags TEXT,
      original_media_url TEXT,
      original_scheduled_at TEXT,
      suggested_caption TEXT,
      suggested_hashtags TEXT,
      suggested_timing TEXT,
      virality_score INTEGER DEFAULT 85,
      algorithm_index INTEGER DEFAULT 88,
      hook_analysis TEXT,
      cta_quality TEXT,
      improvement_reasons_json TEXT DEFAULT '[]',
      status TEXT DEFAULT 'pending',
      mode TEXT DEFAULT 'copilot',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_creative_variants (
      variant_id TEXT PRIMARY KEY,
      post_id TEXT,
      variant_type TEXT NOT NULL,
      original_url TEXT NOT NULL,
      transformed_url TEXT NOT NULL,
      prompt_used TEXT,
      aspect_ratio TEXT DEFAULT '1:1',
      metadata_json TEXT DEFAULT '{}',
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
    db.prepare(`ALTER TABLE posts ADD COLUMN tagged_users TEXT DEFAULT '[]'`).run();
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

  // Secure Super Admin Provisioning: Exclusively configured via environment variables
  const envAdminEmail = (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
  const envAdminPassword = (process.env.SUPER_ADMIN_PASSWORD || '').trim();
  const envAdminName = (process.env.SUPER_ADMIN_NAME || 'Super Admin').trim();

  if (envAdminEmail && envAdminPassword) {
    const nowAdminTime = new Date().toISOString();
    const existing: any = db.prepare('SELECT user_id FROM users WHERE LOWER(email) = LOWER(?)').get(envAdminEmail);
    if (!existing) {
      db.prepare(`
        INSERT INTO users (email, full_name, role, tenant_scope, is_active, two_factor_enabled, password, created_at)
        VALUES (?, ?, 'Super Admin', 'Global (All Brands)', 1, 0, ?, ?)
      `).run(envAdminEmail, envAdminName, envAdminPassword, nowAdminTime);
    } else {
      db.prepare(`UPDATE users SET is_active = 1, password = ?, role = 'Super Admin', full_name = ? WHERE user_id = ?`)
        .run(envAdminPassword, envAdminName, existing.user_id);
    }
  }

  // Clean up any legacy dummy demo accounts for security
  try {
    db.prepare(`
      DELETE FROM users 
      WHERE email IN ('admin@ci360.agency', 'sarah@ci360.agency', 'marcus@ci360.agency')
        AND LOWER(email) != LOWER(?)
    `).run(envAdminEmail || '');
  } catch {}

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

  // Seed sample feed audits for AI Neural Studio if empty
  const auditCount = db.prepare('SELECT count(*) as c FROM feed_audits').get() as { c: number };
  if (auditCount.c === 0) {
    const now = new Date().toISOString();
    const sampleAudits = [
      {
        id: 'FA-001',
        platform: 'instagram',
        title: 'Monstera Routine & Botanical Light Hack',
        caption: 'Did you know 80% of indoor plants suffer from over-watering rather than under-lighting? Here is the exact moisture meter routine our greenhouse uses daily. 🌿💧 Save this post for your weekend routine!',
        mediaUrl: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=1200&q=80',
        hookScore: 92,
        visualScore: 89,
        velocity: 2.4,
        sentiment: 'positive',
        grade: 'A+',
        metrics: JSON.stringify({ impressions: 18400, likes: 1420, comments: 84, saves: 490, shares: 210, reachRate: '14.2%' }),
        recs: JSON.stringify([
          'Hook strength is in the top 5% of botanical content.',
          'CTA to save for weekend drove 490 saves (+85% algorithm boost).',
          'Next variant: Test video reel format with dynamic watering close-up.'
        ]),
      },
      {
        id: 'FA-002',
        platform: 'linkedin',
        title: 'Scaling AgriTech & Sustainable Urban Greenery',
        caption: 'Why modern commercial offices with curated plant life see a 15% increase in employee cognitive retention. Sustainable workspaces are no longer a perk; they are a productivity asset. Read our full case study below.',
        mediaUrl: 'https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&w=1200&q=80',
        hookScore: 88,
        visualScore: 94,
        velocity: 1.9,
        sentiment: 'positive',
        grade: 'A',
        metrics: JSON.stringify({ impressions: 9600, likes: 620, comments: 52, saves: 180, shares: 95, reachRate: '11.8%' }),
        recs: JSON.stringify([
          'B2B thought leadership tone is well-calibrated.',
          'Opening stat on 15% cognitive retention stopped feed scroll.',
          'Suggestion: Add a bullet-point executive summary for higher mobile skim speed.'
        ]),
      },
      {
        id: 'FA-003',
        platform: 'facebook',
        title: 'Weekend Succulent Care Workshop',
        caption: 'Live Q&A this Saturday with our master botanist! Learn repotting, root trimming, and winter soil nutrition. Drop your plant questions in the comments and we will answer live!',
        mediaUrl: 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?auto=format&fit=crop&w=1200&q=80',
        hookScore: 81,
        visualScore: 85,
        velocity: 1.6,
        sentiment: 'positive',
        grade: 'B+',
        metrics: JSON.stringify({ impressions: 7200, likes: 410, comments: 76, saves: 98, shares: 44, reachRate: '9.4%' }),
        recs: JSON.stringify([
          'Community participation is high (+76 questions).',
          'Suggestion: Pin top answer comment to keep thread active for 48h algorithm replay.',
          'Enhance title contrast with Gemini overlay text.'
        ]),
      },
      {
        id: 'FA-004',
        platform: 'whatsapp',
        title: 'Exclusive VIP Green Subscribers Alert',
        caption: 'VIP Members Alert: Our organic plant nutrition booster is back in stock with 20% off exclusively for WhatsApp subscribers! Click below to claim your bottle before public release.',
        mediaUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&q=80',
        hookScore: 86,
        visualScore: 90,
        velocity: 2.8,
        sentiment: 'positive',
        grade: 'A',
        metrics: JSON.stringify({ impressions: 3200, likes: 380, comments: 45, saves: 110, shares: 140, reachRate: '34.5%' }),
        recs: JSON.stringify([
          'WhatsApp status CTR is exceptionally high (34.5% reach rate).',
          'Urgency element drove high immediate click-through.',
          'Re-broadcast as a follow-up story 12h before offer expiration.'
        ]),
      },
    ];

    for (const a of sampleAudits) {
      db.prepare(`
        INSERT INTO feed_audits (
          audit_id, brand_id, platform, external_post_id, title, caption,
          media_url, media_type, hook_score, visual_score, engagement_velocity,
          sentiment, virality_grade, raw_metrics_json, recommendations_json,
          published_at, created_at
        ) VALUES (
          ?, 'BR-001', ?, ?, ?, ?,
          ?, 'image', ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?
        )
      `).run(
        a.id, a.platform, `ext_${a.id}`, a.title, a.caption,
        a.mediaUrl, a.hookScore, a.visualScore, a.velocity,
        a.sentiment, a.grade, a.metrics, a.recs,
        now, now
      );
    }
  }
}

// Automatically initialize schema upon load
initDatabase();
