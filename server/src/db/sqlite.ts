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

    -- Brand Brain & Intelligence Profile
    CREATE TABLE IF NOT EXISTS brand_intelligence_profiles (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL DEFAULT 'ORG-001',
      brand_id TEXT NOT NULL UNIQUE,
      brand_name TEXT NOT NULL,
      industry TEXT NOT NULL,
      sub_industry TEXT,
      primary_market TEXT DEFAULT 'Global',
      target_audience TEXT,
      brand_voice TEXT DEFAULT 'Professional & Authoritative',
      brand_personality TEXT DEFAULT 'Innovative, Reliable, Thought Leader',
      preferred_words_json TEXT DEFAULT '[]',
      forbidden_words_json TEXT DEFAULT '[]',
      approved_ctas_json TEXT DEFAULT '[]',
      brand_colors_json TEXT DEFAULT '[]',
      fonts_json TEXT DEFAULT '[]',
      visual_style TEXT DEFAULT 'Modern, Clean, High Contrast',
      competitors_json TEXT DEFAULT '[]',
      business_objectives TEXT,
      primary_products_json TEXT DEFAULT '[]',
      services_json TEXT DEFAULT '[]',
      website TEXT,
      instagram_handle TEXT,
      facebook_page TEXT,
      linkedin_page TEXT,
      youtube_channel TEXT,
      content_pillars_json TEXT DEFAULT '[]',
      regulatory_constraints_json TEXT DEFAULT '[]',
      default_language TEXT DEFAULT 'en',
      secondary_languages_json TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Brand Learned Preferences (from user approvals, edits, rejections)
    CREATE TABLE IF NOT EXISTS brand_learned_preferences (
      id TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL,
      category TEXT NOT NULL,
      key_name TEXT NOT NULL,
      learned_value TEXT NOT NULL,
      confidence REAL DEFAULT 0.85,
      source_sample_count INTEGER DEFAULT 1,
      last_inferred_at TEXT NOT NULL,
      is_reviewed_by_admin INTEGER DEFAULT 0,
      admin_override_value TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Public Profiles Discovery (Mode A - Public Data Only)
    CREATE TABLE IF NOT EXISTS public_profiles (
      id TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      identifier TEXT NOT NULL,
      profile_url TEXT,
      display_name TEXT,
      bio TEXT,
      followers_count INTEGER DEFAULT 0,
      following_count INTEGER DEFAULT 0,
      posts_count INTEGER DEFAULT 0,
      data_provenance TEXT DEFAULT 'PUBLIC',
      public_quality_score INTEGER DEFAULT 75,
      visual_consistency_score INTEGER DEFAULT 80,
      brand_positioning_score INTEGER DEFAULT 78,
      posting_frequency TEXT DEFAULT '4-5 posts / week',
      visible_engagement_benchmark REAL DEFAULT 2.1,
      public_metrics_json TEXT DEFAULT '{}',
      topics_json TEXT DEFAULT '[]',
      raw_visible_posts_json TEXT DEFAULT '[]',
      last_scanned_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Competitor Intelligence
    CREATE TABLE IF NOT EXISTS competitors (
      id TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL,
      name TEXT NOT NULL,
      platform TEXT NOT NULL,
      identifier TEXT NOT NULL,
      profile_url TEXT,
      public_score INTEGER DEFAULT 76,
      content_themes_json TEXT DEFAULT '[]',
      posting_frequency TEXT DEFAULT 'Daily',
      visible_engagement_rate REAL DEFAULT 1.8,
      content_opportunity_json TEXT DEFAULT '{}',
      last_analyzed_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    -- Post Revisions (Non-destructive AI recommendations & version history)
    CREATE TABLE IF NOT EXISTS post_revisions (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      revision_number INTEGER NOT NULL,
      revision_type TEXT NOT NULL,
      caption TEXT,
      hashtags TEXT,
      media_url TEXT,
      media_type TEXT DEFAULT 'image',
      scheduled_at TEXT,
      applied_recommendation_id TEXT,
      changes_summary TEXT,
      created_by TEXT DEFAULT 'user',
      created_at TEXT NOT NULL
    );

    -- AI Deep Analysis Runs
    CREATE TABLE IF NOT EXISTS ai_analysis_runs (
      id TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL,
      post_id TEXT,
      analysis_type TEXT NOT NULL,
      overall_score INTEGER DEFAULT 80,
      hook_score INTEGER DEFAULT 80,
      caption_score INTEGER DEFAULT 80,
      visual_score INTEGER DEFAULT 80,
      cta_score INTEGER DEFAULT 80,
      brand_fit_score INTEGER DEFAULT 80,
      discoverability_score INTEGER DEFAULT 80,
      engagement_score INTEGER DEFAULT 80,
      platform_fit_score INTEGER DEFAULT 80,
      timing_score INTEGER DEFAULT 80,
      strengths_json TEXT DEFAULT '[]',
      weaknesses_json TEXT DEFAULT '[]',
      recommendations_json TEXT DEFAULT '[]',
      confidence REAL DEFAULT 0.85,
      created_at TEXT NOT NULL
    );

    -- AI Granular Recommendations
    CREATE TABLE IF NOT EXISTS ai_recommendations (
      id TEXT PRIMARY KEY,
      analysis_run_id TEXT,
      brand_id TEXT NOT NULL,
      post_id TEXT,
      field TEXT NOT NULL,
      original_content TEXT,
      suggested_content TEXT,
      reason TEXT,
      expected_impact TEXT,
      confidence REAL DEFAULT 0.85,
      risk_level TEXT DEFAULT 'LOW',
      category TEXT DEFAULT 'safe',
      status TEXT DEFAULT 'pending',
      applied_revision_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Recommendation Actions (User acceptance / rejection memory)
    CREATE TABLE IF NOT EXISTS recommendation_actions (
      id TEXT PRIMARY KEY,
      recommendation_id TEXT NOT NULL,
      brand_id TEXT NOT NULL,
      post_id TEXT,
      action_type TEXT NOT NULL,
      user_id TEXT,
      user_comment TEXT,
      created_at TEXT NOT NULL
    );

    -- Predictive ML Performance Runs
    CREATE TABLE IF NOT EXISTS prediction_runs (
      id TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL,
      post_id TEXT,
      platform TEXT NOT NULL,
      model_name TEXT DEFAULT 'LightGBM-PostRank-v2.1',
      model_version TEXT DEFAULT '2.1.0',
      performance_score INTEGER DEFAULT 82,
      predicted_engagement_min REAL DEFAULT 1.8,
      predicted_engagement_max REAL DEFAULT 3.6,
      confidence_level TEXT DEFAULT 'HIGH',
      is_cold_start INTEGER DEFAULT 0,
      top_positive_factors_json TEXT DEFAULT '[]',
      top_negative_factors_json TEXT DEFAULT '[]',
      benchmark_percentile INTEGER DEFAULT 88,
      created_at TEXT NOT NULL
    );

    -- Content Topics & Gap Engine
    CREATE TABLE IF NOT EXISTS content_topics (
      id TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL,
      topic_name TEXT NOT NULL,
      relevance_score INTEGER DEFAULT 85,
      historical_performance REAL DEFAULT 2.4,
      brand_alignment INTEGER DEFAULT 90,
      audience_interest INTEGER DEFAULT 88,
      competition_level TEXT DEFAULT 'Medium',
      recommended_format TEXT DEFAULT 'Carousel & Infographic',
      status TEXT DEFAULT 'opportunity',
      created_at TEXT NOT NULL
    );

    -- Live Comment Intelligence & Lead Detection
    CREATE TABLE IF NOT EXISTS detected_leads (
      id TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL,
      post_id TEXT,
      platform TEXT NOT NULL,
      commenter_handle TEXT,
      comment_text TEXT NOT NULL,
      lead_intent_score INTEGER DEFAULT 85,
      intent_category TEXT DEFAULT 'purchase_intent',
      status TEXT DEFAULT 'new',
      detected_at TEXT NOT NULL
    );

    -- Experiments & Creative Variants
    CREATE TABLE IF NOT EXISTS experiments (
      id TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL,
      title TEXT NOT NULL,
      hypothesis TEXT,
      controlled_variable TEXT DEFAULT 'creative_visual_style',
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS experiment_variants (
      id TEXT PRIMARY KEY,
      experiment_id TEXT NOT NULL,
      variant_label TEXT NOT NULL,
      post_id TEXT,
      creative_url TEXT,
      prompt_used TEXT,
      copy_caption TEXT,
      approval_status TEXT DEFAULT 'approved',
      publishing_result_json TEXT DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    -- AI Usage & Token Cost Tracking
    CREATE TABLE IF NOT EXISTS ai_usage (
      id TEXT PRIMARY KEY,
      organization_id TEXT DEFAULT 'ORG-001',
      brand_id TEXT NOT NULL,
      user_id TEXT,
      request_type TEXT NOT NULL,
      provider TEXT DEFAULT 'google_gemini',
      model TEXT DEFAULT 'gemini-2.5-flash',
      prompt_version TEXT DEFAULT 'POST_ANALYSIS_V3',
      input_tokens INTEGER DEFAULT 450,
      output_tokens INTEGER DEFAULT 280,
      latency_ms INTEGER DEFAULT 420,
      estimated_cost_usd REAL DEFAULT 0.00045,
      status TEXT DEFAULT 'success',
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

  // Seed Multi-Brand Profiles & Enterprise Brand Brains
  const brainCount = db.prepare('SELECT count(*) as c FROM brand_intelligence_profiles').get() as { c: number };
  if (brainCount.c === 0) {
    const now = new Date().toISOString();

    const enterpriseBrands = [
      {
        id: 'BIP-001',
        brandId: 'BR-001',
        name: 'Flower Plant Corp',
        industry: 'Botanical & Agriculture',
        subIndustry: 'Indoor Horticulture & Direct-to-Consumer',
        primaryMarket: 'India & Southeast Asia',
        targetAudience: 'Urban homeowners, plant enthusiasts, eco-conscious interior decorators',
        voice: 'Vibrant, Warm, Botanical, Educational & Approachable',
        personality: 'Friendly Gardening Specialist, Sustainable Lifestyle Guide',
        preferredWords: ['botanical hydration', 'root aeration', 'sustainable urban greenery', 'foliage health', 'organic nutrition'],
        forbiddenWords: ['cheap dirt', 'chemical pesticide', 'fake plants'],
        approvedCtas: ['Save this routine for your weekend repotting!', 'Click link in bio to explore our greenhouse collection', 'Drop your plant question in the comments'],
        colors: ['#1336E8', '#08C5E1', '#10B981'],
        fonts: ['Inter', 'Outfit', 'Plus Jakarta Sans'],
        visualStyle: 'Lush natural sunlight, high contrast green textures, crisp macro leaf details',
        competitors: ['@nurserylive', '@ugaoo', '@floweraura'],
        businessObjectives: 'Drive weekly direct-to-consumer plant sales and grow organic saves on educational reels',
        primaryProducts: ['Monstera Deliciosa', 'Organic Plant Booster Nutrients', 'Self-Watering Ceramic Pots', 'Fiddle Leaf Fig'],
        services: ['Corporate Greenery Installation', 'Virtual Plant Doctor Consultations'],
        website: 'https://flowerplant.in',
        instagramHandle: '@ciflow904',
        facebookPage: 'Flower Plant Official',
        linkedinPage: 'flower-plant-official',
        youtubeChannel: '@flowerplant_yt',
        pillars: ['Weekly Care Routines', 'Urban Decor Inspiration', 'Plant Nutrition Science', 'Community Q&A'],
        constraints: ['Never promote synthetic agrochemicals', 'Maintain certified organic messaging'],
      },
      {
        id: 'BIP-002',
        brandId: 'BR-002',
        name: 'Station Satcom',
        industry: 'Maritime & Satellite Telecommunications',
        subIndustry: 'Offshore Connectivity & Edge Maritime IoT',
        primaryMarket: 'Global Maritime (Middle East, Europe, Asia Pacific)',
        targetAudience: 'Shipowners, Fleet Managers, Technical Superintendents, Maritime IT Directors',
        voice: 'Authoritative, Mission-Critical, Engineering-Precision, Concise',
        personality: 'Trusted Offshore Technology Partner, Global Satellite Innovator',
        preferredWords: ['multi-orbit connectivity', 'LEO/GEO hybrid resilience', 'crew welfare bandwidth', 'operational vessel uptime', 'cybersecurity compliance', 'VSAT network'],
        forbiddenWords: ['cheap data', 'basic internet', 'unlimited hotspot', 'quick hack'],
        approvedCtas: ['Schedule a confidential fleet connectivity audit with our technical team', 'Read the full maritime resilience whitepaper', 'Contact our offshore operations desk'],
        colors: ['#0A2540', '#00D4FF', '#1E3A8A'],
        fonts: ['Inter', 'Space Grotesk', 'Roboto Mono'],
        visualStyle: 'Sleek dark ocean cybernetic, satellite orbits, high-tech bridge telemetry, offshore vessel imagery',
        competitors: ['@marlink', '@inmarsat', '@speedcast', '@kvh_industries'],
        businessObjectives: 'Accelerate fleet VSAT and Starlink/OneWeb multi-orbit adoption among commercial shipping fleets',
        primaryProducts: ['Station Multi-Orbit Maritime Router', 'Vessel CyberShield 2.0', 'Crew Connect Prepaid Portal'],
        services: ['24/7 Global NOC Support', 'Vessel Antenna Turnkey Commissioning', 'Maritime Regulatory IMO Cybersecurity Audits'],
        website: 'https://www.stationsatcom.com',
        instagramHandle: '@stationsatcom',
        facebookPage: 'Station Satcom Global',
        linkedinPage: 'station-satcom',
        youtubeChannel: '@stationsatcom_maritime',
        pillars: ['Multi-Orbit Connectivity', 'IMO Cybersecurity & Compliance', 'Crew Retention & Welfare', 'Autonomous Vessel Fleet Telemetry'],
        constraints: ['Strict adherence to maritime safety standards', 'Do not disclose specific naval or client vessel coordinates'],
      },
      {
        id: 'BIP-003',
        brandId: 'BR-003',
        name: 'VARDĀN',
        industry: 'Healthcare & Functional Medicine',
        subIndustry: 'Integrative Wellness & Restorative Physical Therapy',
        primaryMarket: 'India & Middle East',
        targetAudience: 'Executives, chronic pain sufferers, longevity seekers, post-surgery rehabilitation patients',
        voice: 'Empathetic, Science-Backed, Holistic, Reassuring & Refined',
        personality: 'World-Class Clinical Healer, Pioneer in Functional Movement Therapy',
        preferredWords: ['functional movement therapy', 'chronic pain resolution', 'neuromuscular rehabilitation', 'holistic longevity', 'biomechanical alignment'],
        forbiddenWords: ['magic cure', 'instant pain relief miracle', 'quick fix'],
        approvedCtas: ['Book a comprehensive biomechanical evaluation', 'Consult our senior functional medicine clinicians', 'Learn more about our therapeutic methodologies'],
        colors: ['#1C3D32', '#C6A87C', '#F7F4EE'],
        fonts: ['Cormorant Garamond', 'Plus Jakarta Sans'],
        visualStyle: 'Minimalist clinical luxury, gentle natural lighting, anatomical biomechanical diagrams, serene recovery spaces',
        competitors: ['@qi_spine', '@physio_active'],
        businessObjectives: 'Establish leadership in non-invasive chronic pain resolution and clinical functional wellness',
        primaryProducts: ['Functional Diagnostic Protocol', 'Postural Restoration Therapy', 'Executive Stress & Ergonomics Program'],
        services: ['1-on-1 Clinical Rehabilitation', 'In-Home Physical Therapy', 'Corporate Ergonomics Audits'],
        website: 'https://vardan.in',
        instagramHandle: '@vardan_wellness',
        facebookPage: 'Vardan Healthcare',
        linkedinPage: 'vardan-wellness',
        youtubeChannel: '@vardan_health',
        pillars: ['Spine & Joint Health', 'Functional Movement Science', 'Patient Recovery Stories', 'Ergonomics at Work'],
        constraints: ['Strict adherence to medical advertising ethics', 'No medical guarantees or unverified claims'],
      },
      {
        id: 'BIP-004',
        brandId: 'BR-004',
        name: 'Ayaan by PIV',
        industry: 'Luxury Fashion & Apparel',
        subIndustry: 'Contemporary Indian Haute Couture & Artisanal Pret',
        primaryMarket: 'India, UAE, UK, North America',
        targetAudience: 'Discerning brides, luxury connoisseurs, contemporary cultural trendsetters',
        voice: 'Opulent, Poetic, Artisanal, Editorial & Sensual',
        personality: 'Master Couturier, Custodian of Heritage Weaves with Modern Drapes',
        preferredWords: ['handcrafted zardozi', 'heritage weave revival', 'contemporary silhouette', 'artisanal drape', 'timeless luxury'],
        forbiddenWords: ['discount sale', 'cheap replica', 'budget bridal'],
        approvedCtas: ['Experience the collection at our flagship atelier', 'Schedule a private bridal consultation', 'Discover the craft behind the weave'],
        colors: ['#4A0E17', '#D4AF37', '#1A1A1A'],
        fonts: ['Playfair Display', 'Cinzel', 'Montserrat'],
        visualStyle: 'High-fashion editorial lighting, rich velvet and metallic accents, cinematic moodboards',
        competitors: ['@sabyasachiofficial', '@taruntahiliani', '@raw_mango'],
        businessObjectives: 'Grow international couture client inquiries and showcase craftsmanship heritage',
        primaryProducts: ['Bridal Lehengas', 'Handcrafted Sherwanis', 'Artisanal Pret Sarees', 'Embroidered Capes'],
        services: ['Bespoke Bridal Styling', 'Virtual Global Wardrobe Consultations'],
        website: 'https://ayaanpiv.com',
        instagramHandle: '@ayaan_by_piv',
        facebookPage: 'Ayaan by PIV Couture',
        linkedinPage: 'ayaan-couture',
        youtubeChannel: '@ayaan_couture',
        pillars: ['Artisanal Craftsmanship', 'Bridal Heritage', 'Runway Spotlights', 'Client Spotlights'],
        constraints: ['Never use flash sale or clearance terminology', 'Preserve premium brand equity at all times'],
      },
      {
        id: 'BIP-005',
        brandId: 'BR-005',
        name: 'Shatayu',
        industry: 'Ayurveda & Preventive Health',
        subIndustry: 'Herbal Formulations & Longevity Science',
        primaryMarket: 'India, US, Europe',
        targetAudience: 'Holistic wellness practitioners, busy professionals seeking natural vitality, seniors focusing on longevity',
        voice: 'Grounded, Reverent, Scientific Ayurveda, Pure & Transparent',
        personality: 'Ancient Ayurvedic Scholar paired with Modern Pharmacognosy Researcher',
        preferredWords: ['standardized botanical extract', 'ojas enhancement', 'dosha balance', 'cellular vitality', 'vedic longevity'],
        forbiddenWords: ['cure-all', 'instant chemical detox', 'miracle pill'],
        approvedCtas: ['Take our personalized Dosha assessment', 'Explore our pure herbal formulations', 'Download our Seasonal Dinacharya Guide'],
        colors: ['#2E473B', '#D97706', '#FFFBEB'],
        fonts: ['Lora', 'Inter'],
        visualStyle: 'Warm earthen tones, botanical illustrations, raw herbal roots, golden sunrise warmth',
        competitors: ['@kottakkal_ayurveda', '@banyanbotanicals', '@kamaayurveda'],
        businessObjectives: 'Educate consumers on clinical botanical authenticity and drive herbal subscription orders',
        primaryProducts: ['Chyawanprash Awaleha', 'Organic Ashwagandha KSM-66', 'Triphala Bio-Cleanse', 'Kshirabala Taila'],
        services: ['Ayurvedic Doctor Tele-Consultations', 'Panchakarma Retreat Planning'],
        website: 'https://shatayu.org',
        instagramHandle: '@shatayu_ayurveda',
        facebookPage: 'Shatayu Ayurveda',
        linkedinPage: 'shatayu-health',
        youtubeChannel: '@shatayu_longevity',
        pillars: ['Ayurvedic Daily Routine (Dinacharya)', 'Herb Pharmacology', 'Seasonal Wellness', 'Dosha Balance'],
        constraints: ['Comply with AYUSH regulatory norms', 'State dietary supplement disclaimers clearly'],
      },
      {
        id: 'BIP-006',
        brandId: 'BR-006',
        name: 'Chaitanya School',
        industry: 'Education & Academics',
        subIndustry: 'K-12 Progressive STEM & Character Education',
        primaryMarket: 'India',
        targetAudience: 'Parents seeking holistic child development, modern educators, prospective students',
        voice: 'Inspiring, Nurturing, Forward-Looking, Trustworthy & Energetic',
        personality: 'Visionary Educator, Mentor in Innovation and Human Values',
        preferredWords: ['experiential inquiry', 'collaborative STEM', 'holistic character building', 'future-ready skills', 'empathy & leadership'],
        forbiddenWords: ['rote memorization', 'strict cramming', 'ranking pressure'],
        approvedCtas: ['Book a guided campus tour for the upcoming academic session', 'Explore our student innovation projects', 'Apply online for admissions'],
        colors: ['#1E3A8A', '#F59E0B', '#10B981'],
        fonts: ['Poppins', 'Inter'],
        visualStyle: 'Bright, colorful, candid smiling students in maker labs, sports fields, collaborative classrooms',
        competitors: ['@heritage_schools', '@oakridge_international', '@dps_society'],
        businessObjectives: 'Drive prospective parent campus tour registrations and showcase student STEM achievements',
        primaryProducts: ['Early Years Foundation', 'Middle School Inquiry Program', 'Senior Secondary STEM & Humanities'],
        services: ['Robotics & AI Lab', 'Athletic Academy', 'Global Exchange Programs'],
        website: 'https://chaitanyaschool.edu.in',
        instagramHandle: '@chaitanya_school_official',
        facebookPage: 'Chaitanya School Official',
        linkedinPage: 'chaitanya-school',
        youtubeChannel: '@chaitanya_school',
        pillars: ['Student Innovation & STEM', 'Campus Life & Sports', 'Character & Arts', 'Parent Testimonials'],
        constraints: ['Strict student privacy guidelines', 'Admissions compliance according to education board rules'],
      },
      {
        id: 'BIP-007',
        brandId: 'BR-007',
        name: 'Bottle Shop',
        industry: 'Retail & Beverage',
        subIndustry: 'Craft Beverages, Artisanal Spirits & Lifestyle Experiences',
        primaryMarket: 'Metro Cities',
        targetAudience: 'Cocktail enthusiasts, craft beverage connoisseurs, weekend entertainers, corporate gifting buyers',
        voice: 'Vibrant, Connoisseur, Witty, Sophisticated & Social',
        personality: 'Master Sommelier & Mixology Curator with a Modern Street Twist',
        preferredWords: ['artisanal botanical notes', 'curated vintage cellar', 'small-batch distillation', 'tasting notes', 'craft pairing'],
        forbiddenWords: ['binge drink', 'get wasted', 'cheap booze'],
        approvedCtas: ['Browse our sommelier-curated weekend cellar', 'Join our upcoming masterclass tasting session', 'Explore craft cocktail recipes'],
        colors: ['#291528', '#D4AF37', '#9E2A2B'],
        fonts: ['Syne', 'Inter'],
        visualStyle: 'Mood-lit cellar amber reflections, crystal glassware, craft cocktail garnish closeups, speakeasy vibes',
        competitors: ['@toniq_retail', '@living_liquidz', '@nature_basket'],
        businessObjectives: 'Promote responsible craft connoisseurship and drive weekend retail store footfall',
        primaryProducts: ['Artisanal Single Malts', 'Small-Batch Craft Gin', 'Bio-Dynamic Natural Wines', 'Artisan Mixers'],
        services: ['Private Sommelier Tasting Events', 'Curated Corporate Beverage Gifting'],
        website: 'https://bottleshop.store',
        instagramHandle: '@bottleshop_curated',
        facebookPage: 'Bottle Shop India',
        linkedinPage: 'bottle-shop-retail',
        youtubeChannel: '@bottleshop_tastings',
        pillars: ['Craft Mixology Guides', 'Sommelier Tasting Notes', 'Pairing Food & Wine', 'Distillery Stories'],
        constraints: ['Strict compliance with legal drinking age verification (21+ / 25+ depending on state)', 'Responsible drinking disclaimers mandatory'],
      },
    ];

    for (const b of enterpriseBrands) {
      // Upsert into brands table so brand switcher has them
      db.prepare(`
        INSERT OR REPLACE INTO brands (
          brand_id, client_id, brand_name, default_timezone, country,
          primary_color, secondary_color, default_hashtags, default_keywords,
          created_at, updated_at, version
        ) VALUES (
          ?, 'CL-001', ?, 'Asia/Kolkata', 'IN',
          ?, ?, ?, ?,
          ?, ?, 1
        )
      `).run(
        b.brandId,
        b.name,
        b.colors[0],
        b.colors[1] || '#08C5E1',
        b.preferredWords.map(w => '#' + w.replace(/\s+/g, '')).slice(0, 3).join(' '),
        b.preferredWords.slice(0, 4).join(', '),
        now, now
      );

      // Insert into brand_intelligence_profiles (Brand Brain)
      db.prepare(`
        INSERT OR REPLACE INTO brand_intelligence_profiles (
          id, organization_id, brand_id, brand_name, industry, sub_industry,
          primary_market, target_audience, brand_voice, brand_personality,
          preferred_words_json, forbidden_words_json, approved_ctas_json,
          brand_colors_json, fonts_json, visual_style, competitors_json,
          business_objectives, primary_products_json, services_json, website,
          instagram_handle, facebook_page, linkedin_page, youtube_channel,
          content_pillars_json, regulatory_constraints_json, default_language,
          secondary_languages_json, created_at, updated_at
        ) VALUES (
          ?, 'ORG-001', ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, 'en',
          '["hi", "es"]', ?, ?
        )
      `).run(
        b.id,
        b.brandId,
        b.name,
        b.industry,
        b.subIndustry,
        b.primaryMarket,
        b.targetAudience,
        b.voice,
        b.personality,
        JSON.stringify(b.preferredWords),
        JSON.stringify(b.forbiddenWords),
        JSON.stringify(b.approvedCtas),
        JSON.stringify(b.colors),
        JSON.stringify(b.fonts),
        b.visualStyle,
        JSON.stringify(b.competitors),
        b.businessObjectives,
        JSON.stringify(b.primaryProducts),
        JSON.stringify(b.services),
        b.website,
        b.instagramHandle,
        b.facebookPage,
        b.linkedinPage,
        b.youtubeChannel,
        JSON.stringify(b.pillars),
        JSON.stringify(b.constraints),
        now,
        now
      );
    }

    // Seed sample learned preferences for Station Satcom & Flower Plant
    const samplePreferences = [
      { id: 'BLP-001', brandId: 'BR-002', cat: 'tone', key: 'emoji_density', val: 'Low/Minimalist (max 1 technical emoji per post)', conf: 0.94, samples: 18 },
      { id: 'BLP-002', brandId: 'BR-002', cat: 'hook', key: 'preferred_hook_type', val: 'Stat-Driven Technical Challenge (e.g., "Why 92% of vessel downtime...")', conf: 0.89, samples: 14 },
      { id: 'BLP-003', brandId: 'BR-002', cat: 'cta', key: 'cta_style', val: 'Direct Technical Consultation (avoid generic "Click here")', conf: 0.92, samples: 21 },
      { id: 'BLP-004', brandId: 'BR-001', cat: 'tone', key: 'emoji_density', val: 'Moderate (2-3 botanical emojis: 🌿💧🌱)', conf: 0.88, samples: 26 },
      { id: 'BLP-005', brandId: 'BR-001', cat: 'hook', key: 'preferred_hook_type', val: 'Surprising Plant Health Myth Buster', conf: 0.91, samples: 19 },
    ];

    for (const p of samplePreferences) {
      db.prepare(`
        INSERT OR REPLACE INTO brand_learned_preferences (
          id, brand_id, category, key_name, learned_value, confidence,
          source_sample_count, last_inferred_at, is_reviewed_by_admin, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(p.id, p.brandId, p.cat, p.key, p.val, p.conf, p.samples, now, now, now);
    }

    // Seed sample Public Profiles (Mode A - Public Discovery)
    const samplePublicProfiles = [
      {
        id: 'PUB-001',
        brandId: 'BR-002',
        platform: 'instagram',
        identifier: '@stationsatcom',
        profileUrl: 'https://instagram.com/stationsatcom',
        displayName: 'Station Satcom',
        bio: 'Empowering global maritime operations with hybrid LEO/GEO satellite connectivity, Vessel CyberShield & Edge IoT. ⚓📡',
        followers: 14800,
        following: 340,
        posts: 412,
        qualityScore: 88,
        visualScore: 92,
        brandScore: 95,
        freq: '3-4 technical posts / week',
        engagementBench: 3.4,
        metrics: JSON.stringify({ publicReactionsAvg: 480, commentsAvg: 38, engagementRate: '3.4%' }),
        topics: JSON.stringify(['Maritime Satellite', 'Crew Connectivity', 'Vessel Cybersecurity', 'Autonomous Shipping']),
      },
      {
        id: 'PUB-002',
        brandId: 'BR-002',
        platform: 'linkedin',
        identifier: 'station-satcom',
        profileUrl: 'https://linkedin.com/company/station-satcom',
        displayName: 'Station Satcom Global',
        bio: 'Global Maritime Satellite Telecommunications & Digital Vessel Solutions Provider.',
        followers: 28400,
        following: 85,
        posts: 680,
        qualityScore: 94,
        visualScore: 90,
        brandScore: 96,
        freq: '4-5 thought leadership posts / week',
        engagementBench: 4.8,
        metrics: JSON.stringify({ publicReactionsAvg: 820, commentsAvg: 64, engagementRate: '4.8%' }),
        topics: JSON.stringify(['IMO Compliance', 'LEO Mega-Constellations', 'Smart Maritime Fleet', 'Offshore VSAT']),
      },
    ];

    for (const pub of samplePublicProfiles) {
      db.prepare(`
        INSERT OR REPLACE INTO public_profiles (
          id, brand_id, platform, identifier, profile_url, display_name, bio,
          followers_count, following_count, posts_count, data_provenance,
          public_quality_score, visual_consistency_score, brand_positioning_score,
          posting_frequency, visible_engagement_benchmark, public_metrics_json,
          topics_json, raw_visible_posts_json, last_scanned_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PUBLIC', ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?)
      `).run(
        pub.id, pub.brandId, pub.platform, pub.identifier, pub.profileUrl, pub.displayName, pub.bio,
        pub.followers, pub.following, pub.posts, pub.qualityScore, pub.visualScore, pub.brandScore,
        pub.freq, pub.engagementBench, pub.metrics, pub.topics, now, now
      );
    }

    // Seed sample Competitors
    const sampleCompetitors = [
      {
        id: 'COMP-001',
        brandId: 'BR-002',
        name: 'Marlink Marine',
        platform: 'linkedin',
        identifier: 'marlink',
        profileUrl: 'https://linkedin.com/company/marlink',
        publicScore: 84,
        themes: JSON.stringify(['Smart Hybrid Network', 'Decarbonization', 'Cyber Defense']),
        freq: 'Daily (5-7 posts / week)',
        rate: 2.1,
        opportunity: JSON.stringify({
          frequentlyDiscussed: ['Satellite connectivity', 'Commercial shipping broadband'],
          rarelyDiscussed: ['GNSS integrity & spoofing protection', 'Crew mental health bandwidth'],
          recommendedAction: 'Publish executive series on GNSS spoofing counter-measures in contested waterways.',
        }),
      },
      {
        id: 'COMP-002',
        brandId: 'BR-002',
        name: 'Inmarsat Maritime',
        platform: 'linkedin',
        identifier: 'inmarsat-maritime',
        profileUrl: 'https://linkedin.com/company/inmarsat-maritime',
        publicScore: 89,
        themes: JSON.stringify(['Fleet Xpress', 'Global Safety GMDSS', 'IoT Sensor Data']),
        freq: '6 posts / week',
        rate: 2.8,
        opportunity: JSON.stringify({
          frequentlyDiscussed: ['Fleet Xpress upgrades', 'Offshore Energy'],
          rarelyDiscussed: ['Rapid port turnkey installations', 'Transparent crew data billing'],
          recommendedAction: 'Highlight Station Satcom zero-delay port installation guarantee.',
        }),
      },
    ];

    for (const c of sampleCompetitors) {
      db.prepare(`
        INSERT OR REPLACE INTO competitors (
          id, brand_id, name, platform, identifier, profile_url, public_score,
          content_themes_json, posting_frequency, visible_engagement_rate,
          content_opportunity_json, last_analyzed_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        c.id, c.brandId, c.name, c.platform, c.identifier, c.profileUrl, c.publicScore,
        c.themes, c.freq, c.rate, c.opportunity, now, now
      );
    }

    // Seed sample Content Topics & Gaps
    const sampleTopics = [
      { id: 'TOP-001', brandId: 'BR-002', name: 'LEO vs GEO Latency in Vessel Operations', rel: 96, perf: 3.8, align: 98, aud: 94, comp: 'High', fmt: 'Infographic Carousel', status: 'opportunity' },
      { id: 'TOP-002', brandId: 'BR-002', name: 'IMO 2026 Maritime Cyber Risk Compliance Blueprint', rel: 94, perf: 4.1, align: 96, aud: 95, comp: 'Low', fmt: 'Whitepaper Summary & Carousel', status: 'opportunity' },
      { id: 'TOP-003', brandId: 'BR-002', name: 'Crew Welfare & Modern High-Speed Connectivity', rel: 88, perf: 3.2, align: 90, aud: 91, comp: 'Medium', fmt: 'Video Reel & Case Study', status: 'opportunity' },
      { id: 'TOP-004', brandId: 'BR-002', name: 'Generic Antenna Hardware Specs', rel: 52, perf: 1.1, align: 70, aud: 48, comp: 'High', fmt: 'Static Image', status: 'overused' },
    ];

    for (const t of sampleTopics) {
      db.prepare(`
        INSERT OR REPLACE INTO content_topics (
          id, brand_id, topic_name, relevance_score, historical_performance,
          brand_alignment, audience_interest, competition_level, recommended_format,
          status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(t.id, t.brandId, t.name, t.rel, t.perf, t.align, t.aud, t.comp, t.fmt, t.status, now);
    }

    // Seed sample Detected Leads
    const sampleLeads = [
      { id: 'LEAD-001', brandId: 'BR-002', platform: 'linkedin', handle: 'Capt. Henrik Lindqvist', text: 'Does Station Satcom support dual Starlink + Ka-band failover for chemical tankers in North Sea? Need a quote for 8 vessels.', intentScore: 98, cat: 'purchase_intent', status: 'new' },
      { id: 'LEAD-002', brandId: 'BR-002', platform: 'linkedin', handle: 'M. Al-Mansoor', text: 'Where can we get the technical brochure for Vessel CyberShield 2.0? Please DM.', intentScore: 92, cat: 'dm_request', status: 'new' },
      { id: 'LEAD-003', brandId: 'BR-001', platform: 'instagram', handle: '@interior_nook', text: 'Are the self-watering ceramic pots available in bulk for commercial cafe projects? How much for 30 units?', intentScore: 95, cat: 'price_inquiry', status: 'new' },
    ];

    for (const l of sampleLeads) {
      db.prepare(`
        INSERT OR REPLACE INTO detected_leads (
          id, brand_id, post_id, platform, commenter_handle, comment_text,
          lead_intent_score, intent_category, status, detected_at
        ) VALUES (?, ?, 'POST-001', ?, ?, ?, ?, ?, ?, ?)
      `).run(l.id, l.brandId, l.platform, l.handle, l.text, l.intentScore, l.cat, l.status, now);
    }
  }
}

// Automatically initialize schema upon load
initDatabase();
