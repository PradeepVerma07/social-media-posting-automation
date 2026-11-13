import { hashSync } from 'bcryptjs';
import type { DatabaseSync } from 'node:sqlite';

export function migrateEnterprise(db: DatabaseSync) {
  const add = (table: string, name: string, definition: string) => {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
    if (columns.some(c => c.name === name)) return false;
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
    return true;
  };
  db.exec('BEGIN IMMEDIATE');
  try {
    add('users', 'client_id', 'TEXT');
    add('posts', 'created_by_user_id', 'INTEGER');
    add('posts', 'revision_data', "TEXT NOT NULL DEFAULT '{}'");
    const firstApprovalMigration = add('posts', 'approved_version', 'INTEGER');
    add('post_targets', 'claimed_post_version', 'INTEGER');
    add('publish_attempts', 'post_version', 'INTEGER');
    if (firstApprovalMigration) db.exec("UPDATE posts SET approved_version = version WHERE approval_status = 'Approved'");
    db.exec(`CREATE TABLE IF NOT EXISTS auth_sessions (
      token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      created_at TEXT NOT NULL, expires_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);
      CREATE TABLE IF NOT EXISTS post_revision_snapshots (
      post_id TEXT NOT NULL REFERENCES posts(post_id), version INTEGER NOT NULL,
      snapshot TEXT NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL,
      PRIMARY KEY (post_id, version));`);
    db.exec(`CREATE TABLE IF NOT EXISTS studio_generations (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL REFERENCES clients(client_id),
      brand_id TEXT NOT NULL REFERENCES brands(brand_id), user_id INTEGER NOT NULL REFERENCES users(user_id),
      task TEXT NOT NULL, model TEXT NOT NULL, status TEXT NOT NULL,
      result_json TEXT, image_filename TEXT, image_mime TEXT, error_code TEXT,
      input_tokens INTEGER, output_tokens INTEGER, created_at TEXT NOT NULL, completed_at TEXT);
      CREATE INDEX IF NOT EXISTS idx_studio_workspace_time ON studio_generations(client_id,created_at);
      CREATE INDEX IF NOT EXISTS idx_studio_user_time ON studio_generations(user_id,created_at);`);
    db.exec(`CREATE TABLE IF NOT EXISTS antigravity_video_jobs (
      id TEXT PRIMARY KEY, request_id TEXT UNIQUE NOT NULL, input_json TEXT NOT NULL,
      client_id TEXT NOT NULL REFERENCES clients(client_id), brand_id TEXT NOT NULL REFERENCES brands(brand_id),
      user_id INTEGER NOT NULL REFERENCES users(user_id), status TEXT NOT NULL DEFAULT 'QUEUED',
      dispatched INTEGER NOT NULL DEFAULT 0, lease_token TEXT, lease_until TEXT,
      file_url TEXT, file_sha256 TEXT, ready_at TEXT, publish_at TEXT,
      post_id TEXT UNIQUE REFERENCES posts(post_id), error TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS idx_antigravity_jobs_state ON antigravity_video_jobs(status,dispatched,created_at);
      CREATE TABLE IF NOT EXISTS antigravity_video_settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS antigravity_video_reviews (
        job_id TEXT PRIMARY KEY REFERENCES antigravity_video_jobs(id), action TEXT NOT NULL,
        notes TEXT NOT NULL, reviewer_id INTEGER NOT NULL REFERENCES users(user_id),
        reviewer_name TEXT NOT NULL, created_at TEXT NOT NULL,
        replacement_job_id TEXT REFERENCES antigravity_video_jobs(id));`);
    add('antigravity_video_jobs', 'deleted_at', 'TEXT');
    add('antigravity_video_jobs', 'progress_json', "TEXT NOT NULL DEFAULT '{}'");
    add('antigravity_video_jobs', 'retry_job_id', 'TEXT');
    // Resolve only unambiguous existing memberships. Never infer access from a partial name.
    db.exec(`UPDATE users SET client_id = (
      SELECT MIN(client_id) FROM brands WHERE brand_name = users.tenant_scope
      HAVING COUNT(DISTINCT client_id) = 1
    ) WHERE client_id IS NULL AND role != 'Super Admin'`);
    const users = db.prepare('SELECT user_id, password FROM users').all() as any[];
    for (const user of users) {
      if (user.password && !/^\$2[aby]\$/.test(user.password)) {
        db.prepare('UPDATE users SET password = ? WHERE user_id = ?').run(hashSync(String(user.password), 12), user.user_id);
      }
    }
    db.prepare('DELETE FROM auth_sessions WHERE expires_at <= ?').run(new Date().toISOString());
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

export function provisionAdministrator(db: DatabaseSync) {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!email || !password) return;
  // Environment bootstrap is only for the first creation. A restart never resets a password or revoked access.
  if (db.prepare('SELECT 1 FROM users WHERE LOWER(email) = ?').get(email)) return;
  if (password.length < 12 || /^(your_secure_password|change_me|admin@123)$/i.test(password)) throw new Error('Set a strong SUPER_ADMIN_PASSWORD before first startup.');
  const now = new Date().toISOString();
  db.prepare("INSERT OR IGNORE INTO clients (client_id, name, status, created_at, updated_at) VALUES ('CL-001', 'Webtrionix workspace', 'active', ?, ?)").run(now, now);
  db.prepare(`INSERT INTO users (email, full_name, role, tenant_scope, client_id, password, created_at)
    VALUES (?, ?, 'Super Admin', 'Global (All Brands)', 'CL-001', ?, ?)`)
    .run(email, process.env.SUPER_ADMIN_NAME || 'Workspace owner', hashSync(password, 12), now);
}
