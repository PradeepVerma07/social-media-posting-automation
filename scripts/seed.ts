import { db, initDatabase } from '../server/src/db/sqlite';
import { encryptToken } from '../server/src/crypto/tokenVault';
import { generatePostId, generateTargetId, computeIdempotencyKey } from '../server/src/utils/idGenerator';
import { fromZone } from '../server/src/utils/time';

console.log('Seeding CI360 Automation Hub v2 database...');
initDatabase();

const now = new Date().toISOString();

// 1. Seed Client
db.prepare(`
  INSERT OR REPLACE INTO clients (client_id, name, status, created_at, updated_at, version)
  VALUES ('CL-001', 'Flower Plant Corp', 'active', ?, ?, 1)
`).run(now, now);

// 2. Seed Brand
db.prepare(`
  INSERT OR REPLACE INTO brands (brand_id, client_id, brand_name, default_timezone, country, created_at, updated_at, version)
  VALUES ('BR-001', 'CL-001', 'Flower Plant', 'Asia/Kolkata', 'IN', ?, ?, 1)
`).run(now, now);

// 3. Seed Social Accounts with Encrypted Tokens
const liveToken = process.env.META_PAGE_ACCESS_TOKEN || 'EAGVJejn6LZAgBSxZAyX1example';
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
    acc.id,
    acc.platform,
    acc.handle,
    acc.name,
    acc.externalId,
    encrypted.ciphertext,
    encrypted.iv,
    encrypted.tag,
    encrypted.version,
    now,
    now,
    now
  );
}

// 4. Seed Demo Posts & Targets
const demoPostId = 'POST-001';
const demoTargetId = 'TGT-001';
const { scheduledUtc, normalizedTime } = fromZone('2026-10-25', '11:30:00', 'Asia/Kolkata');
const idempotencyKey = computeIdempotencyKey(demoTargetId, scheduledUtc, 1);

db.prepare(`
  INSERT OR REPLACE INTO posts (
    post_id, client_id, brand_id, title, caption, hashtags, media_type, media_urls,
    link_url, schedule_local_date, schedule_local_time, timezone, scheduled_utc,
    approval_status, approved_by, approved_at, source, created_at, updated_at, version
  ) VALUES (
    ?, 'CL-001', 'BR-001', 'Spring Awakening - Premium Floral Collection',
    'Transform your living spaces with our fresh, handpicked organic blooms. Vibrant, sustainable, and delivered fresh to your doorstep!',
    '#gardening #flowerplant #nature #blooms', 'image',
    '["https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&w=1200&q=80"]',
    'https://flowerplant.store', '2026-10-25', ?, 'Asia/Kolkata', ?, 'Approved',
    'Marcus Approver', ?, 'dashboard', ?, ?, 1
  )
`).run(demoPostId, normalizedTime, scheduledUtc, now, now, now);

db.prepare(`
  INSERT OR REPLACE INTO post_targets (
    target_id, post_id, account_id, platform, status, attempt_count, max_retries,
    idempotency_key, created_at, updated_at, version
  ) VALUES (
    ?, ?, 'ACC-001', 'facebook', 'Scheduled', 0, 3, ?, ?, ?, 1
  )
`).run(demoTargetId, demoPostId, idempotencyKey, now, now);

console.log('Seeding completed successfully! Created CL-001, BR-001, ACC-001, POST-001, and TGT-001.');
