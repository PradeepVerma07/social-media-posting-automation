import fs from 'fs';
import path from 'path';
import { db } from '../server/src/db/sqlite';

function escapeSql(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  const str = String(val).replace(/\\/g, '\\\\').replace(/'/g, "''").replace(/\r/g, '\\r').replace(/\n/g, '\\n');
  return `'${str}'`;
}

function generateMySQLDump() {
  const lines: string[] = [];

  lines.push(`-- CI360 Automation Hub - MySQL 8 Complete Schema & Data Dump`);
  lines.push(`-- Generated: ${new Date().toISOString()}`);
  lines.push(`-- Target: Hostinger MySQL (utf8mb4_unicode_ci)`);
  lines.push(``);
  lines.push(`SET FOREIGN_KEY_CHECKS = 0;`);
  lines.push(`SET NAMES utf8mb4;`);
  lines.push(``);

  // Table definitions matching exact schema
  lines.push(`-- Table: clients`);
  lines.push(`CREATE TABLE IF NOT EXISTS \`clients\` (`);
  lines.push(`  \`client_id\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`name\` VARCHAR(255) NOT NULL,`);
  lines.push(`  \`status\` VARCHAR(32) NOT NULL DEFAULT 'active',`);
  lines.push(`  \`created_at\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`updated_at\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`version\` INT NOT NULL DEFAULT 1,`);
  lines.push(`  PRIMARY KEY (\`client_id\`)`);
  lines.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
  lines.push(``);

  lines.push(`-- Table: brands`);
  lines.push(`CREATE TABLE IF NOT EXISTS \`brands\` (`);
  lines.push(`  \`brand_id\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`client_id\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`brand_name\` VARCHAR(255) NOT NULL,`);
  lines.push(`  \`default_timezone\` VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',`);
  lines.push(`  \`country\` VARCHAR(16) NOT NULL DEFAULT 'IN',`);
  lines.push(`  \`primary_color\` VARCHAR(32) DEFAULT '#1336E8',`);
  lines.push(`  \`secondary_color\` VARCHAR(32) DEFAULT '#08C5E1',`);
  lines.push(`  \`default_hashtags\` TEXT,`);
  lines.push(`  \`default_keywords\` TEXT,`);
  lines.push(`  \`tokens_json\` LONGTEXT,`);
  lines.push(`  \`created_at\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`updated_at\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`version\` INT NOT NULL DEFAULT 1,`);
  lines.push(`  PRIMARY KEY (\`brand_id\`),`);
  lines.push(`  INDEX \`idx_brands_client\` (\`client_id\`)`);
  lines.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
  lines.push(``);

  lines.push(`-- Table: social_accounts`);
  lines.push(`CREATE TABLE IF NOT EXISTS \`social_accounts\` (`);
  lines.push(`  \`account_id\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`client_id\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`brand_id\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`platform\` VARCHAR(32) NOT NULL,`);
  lines.push(`  \`account_handle\` VARCHAR(255),`);
  lines.push(`  \`account_name\` VARCHAR(255),`);
  lines.push(`  \`external_id\` VARCHAR(255) NOT NULL,`);
  lines.push(`  \`token_ciphertext\` TEXT NOT NULL,`);
  lines.push(`  \`token_iv\` VARCHAR(128) NOT NULL,`);
  lines.push(`  \`token_tag\` VARCHAR(128) NOT NULL,`);
  lines.push(`  \`token_version\` INT NOT NULL DEFAULT 1,`);
  lines.push(`  \`token_expires_at\` VARCHAR(64),`);
  lines.push(`  \`status\` VARCHAR(32) NOT NULL DEFAULT 'active',`);
  lines.push(`  \`last_checked_at\` VARCHAR(64),`);
  lines.push(`  \`created_at\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`updated_at\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`version\` INT NOT NULL DEFAULT 1,`);
  lines.push(`  PRIMARY KEY (\`account_id\`),`);
  lines.push(`  INDEX \`idx_accounts_brand\` (\`brand_id\`)`);
  lines.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
  lines.push(``);

  lines.push(`-- Table: posts`);
  lines.push(`CREATE TABLE IF NOT EXISTS \`posts\` (`);
  lines.push(`  \`post_id\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`client_id\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`brand_id\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`title\` VARCHAR(500) NOT NULL,`);
  lines.push(`  \`caption\` LONGTEXT NOT NULL,`);
  lines.push(`  \`hashtags\` TEXT NOT NULL,`);
  lines.push(`  \`media_type\` VARCHAR(32) NOT NULL DEFAULT 'image',`);
  lines.push(`  \`media_urls\` LONGTEXT NOT NULL,`);
  lines.push(`  \`link_url\` TEXT NOT NULL,`);
  lines.push(`  \`schedule_local_date\` VARCHAR(32) NOT NULL,`);
  lines.push(`  \`schedule_local_time\` VARCHAR(32) NOT NULL,`);
  lines.push(`  \`timezone\` VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',`);
  lines.push(`  \`scheduled_utc\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`approval_status\` VARCHAR(64) NOT NULL DEFAULT 'Draft',`);
  lines.push(`  \`approved_by\` VARCHAR(255),`);
  lines.push(`  \`approved_at\` VARCHAR(64),`);
  lines.push(`  \`source\` VARCHAR(64) NOT NULL DEFAULT 'dashboard',`);
  lines.push(`  \`deleted_at\` VARCHAR(64),`);
  lines.push(`  \`placement\` TEXT,`);
  lines.push(`  \`created_at\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`updated_at\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`version\` INT NOT NULL DEFAULT 1,`);
  lines.push(`  PRIMARY KEY (\`post_id\`),`);
  lines.push(`  INDEX \`idx_posts_client\` (\`client_id\`, \`deleted_at\`),`);
  lines.push(`  INDEX \`idx_posts_brand\` (\`brand_id\`)`);
  lines.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
  lines.push(``);

  lines.push(`-- Table: post_targets`);
  lines.push(`CREATE TABLE IF NOT EXISTS \`post_targets\` (`);
  lines.push(`  \`target_id\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`post_id\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`account_id\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`platform\` VARCHAR(32) NOT NULL,`);
  lines.push(`  \`status\` VARCHAR(64) NOT NULL DEFAULT 'Draft',`);
  lines.push(`  \`attempt_count\` INT NOT NULL DEFAULT 0,`);
  lines.push(`  \`max_retries\` INT NOT NULL DEFAULT 3,`);
  lines.push(`  \`next_retry_at\` VARCHAR(64),`);
  lines.push(`  \`lock_execution_id\` VARCHAR(128),`);
  lines.push(`  \`lock_stage\` VARCHAR(64),`);
  lines.push(`  \`locked_at\` VARCHAR(64),`);
  lines.push(`  \`platform_post_id\` VARCHAR(255),`);
  lines.push(`  \`post_url\` TEXT,`);
  lines.push(`  \`posted_at\` VARCHAR(64),`);
  lines.push(`  \`error_code\` VARCHAR(128),`);
  lines.push(`  \`error_category\` VARCHAR(128),`);
  lines.push(`  \`error_message\` TEXT,`);
  lines.push(`  \`idempotency_key\` VARCHAR(255) NOT NULL UNIQUE,`);
  lines.push(`  \`created_at\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`updated_at\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`version\` INT NOT NULL DEFAULT 1,`);
  lines.push(`  PRIMARY KEY (\`target_id\`),`);
  lines.push(`  INDEX \`idx_targets_post\` (\`post_id\`),`);
  lines.push(`  INDEX \`idx_targets_claim\` (\`status\`, \`next_retry_at\`, \`locked_at\`)`);
  lines.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
  lines.push(``);

  lines.push(`-- Table: publish_attempts`);
  lines.push(`CREATE TABLE IF NOT EXISTS \`publish_attempts\` (`);
  lines.push(`  \`attempt_id\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`target_id\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`execution_id\` VARCHAR(128) NOT NULL,`);
  lines.push(`  \`started_at\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`finished_at\` VARCHAR(64),`);
  lines.push(`  \`result\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`error_code\` VARCHAR(128),`);
  lines.push(`  \`raw_response_redacted\` LONGTEXT,`);
  lines.push(`  \`created_at\` VARCHAR(64) NOT NULL,`);
  lines.push(`  PRIMARY KEY (\`attempt_id\`),`);
  lines.push(`  INDEX \`idx_attempts_target\` (\`target_id\`)`);
  lines.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
  lines.push(``);

  lines.push(`-- Table: executions_cache`);
  lines.push(`CREATE TABLE IF NOT EXISTS \`executions_cache\` (`);
  lines.push(`  \`execution_id\` VARCHAR(128) NOT NULL,`);
  lines.push(`  \`workflow_id\` VARCHAR(128) NOT NULL,`);
  lines.push(`  \`status\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`mode\` VARCHAR(64) NOT NULL DEFAULT 'trigger',`);
  lines.push(`  \`started_at\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`stopped_at\` VARCHAR(64),`);
  lines.push(`  \`target_ids\` LONGTEXT NOT NULL,`);
  lines.push(`  \`created_at\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`updated_at\` VARCHAR(64) NOT NULL,`);
  lines.push(`  PRIMARY KEY (\`execution_id\`)`);
  lines.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
  lines.push(``);

  lines.push(`-- Table: outbox`);
  lines.push(`CREATE TABLE IF NOT EXISTS \`outbox\` (`);
  lines.push(`  \`id\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`kind\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`entity_id\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`payload\` LONGTEXT NOT NULL,`);
  lines.push(`  \`attempts\` INT NOT NULL DEFAULT 0,`);
  lines.push(`  \`next_run_at\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`last_error\` TEXT,`);
  lines.push(`  \`status\` VARCHAR(64) NOT NULL DEFAULT 'pending',`);
  lines.push(`  \`created_at\` VARCHAR(64) NOT NULL,`);
  lines.push(`  PRIMARY KEY (\`id\`),`);
  lines.push(`  INDEX \`idx_outbox_pending\` (\`status\`, \`next_run_at\`)`);
  lines.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
  lines.push(``);

  lines.push(`-- Table: sheet_sync_state`);
  lines.push(`CREATE TABLE IF NOT EXISTS \`sheet_sync_state\` (`);
  lines.push(`  \`entity_id\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`row_number\` INT,`);
  lines.push(`  \`last_synced_hash\` VARCHAR(128) NOT NULL,`);
  lines.push(`  \`last_synced_version\` INT NOT NULL,`);
  lines.push(`  \`last_synced_at\` VARCHAR(64) NOT NULL,`);
  lines.push(`  PRIMARY KEY (\`entity_id\`)`);
  lines.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
  lines.push(``);

  lines.push(`-- Table: webhook_events`);
  lines.push(`CREATE TABLE IF NOT EXISTS \`webhook_events\` (`);
  lines.push(`  \`event_id\` VARCHAR(128) NOT NULL,`);
  lines.push(`  \`received_at\` VARCHAR(64) NOT NULL,`);
  lines.push(`  PRIMARY KEY (\`event_id\`)`);
  lines.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
  lines.push(``);

  lines.push(`-- Table: audit_log`);
  lines.push(`CREATE TABLE IF NOT EXISTS \`audit_log\` (`);
  lines.push(`  \`id\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`actor\` VARCHAR(255) NOT NULL,`);
  lines.push(`  \`entity\` VARCHAR(128) NOT NULL,`);
  lines.push(`  \`entity_id\` VARCHAR(128) NOT NULL,`);
  lines.push(`  \`action\` VARCHAR(128) NOT NULL,`);
  lines.push(`  \`before_val\` LONGTEXT,`);
  lines.push(`  \`after_val\` LONGTEXT,`);
  lines.push(`  \`created_at\` VARCHAR(64) NOT NULL,`);
  lines.push(`  PRIMARY KEY (\`id\`),`);
  lines.push(`  INDEX \`idx_audit_entity\` (\`entity\`, \`entity_id\`)`);
  lines.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
  lines.push(``);

  lines.push(`-- Table: users`);
  lines.push(`CREATE TABLE IF NOT EXISTS \`users\` (`);
  lines.push(`  \`user_id\` INT AUTO_INCREMENT PRIMARY KEY,`);
  lines.push(`  \`email\` VARCHAR(255) NOT NULL UNIQUE,`);
  lines.push(`  \`password\` VARCHAR(255) DEFAULT 'Admin@123',`);
  lines.push(`  \`full_name\` VARCHAR(255) NOT NULL,`);
  lines.push(`  \`avatar_url\` TEXT,`);
  lines.push(`  \`phone\` VARCHAR(64),`);
  lines.push(`  \`role\` VARCHAR(64) NOT NULL DEFAULT 'Super Admin',`);
  lines.push(`  \`tenant_scope\` VARCHAR(255) DEFAULT 'Global (All Brands)',`);
  lines.push(`  \`is_active\` TINYINT NOT NULL DEFAULT 1,`);
  lines.push(`  \`two_factor_enabled\` TINYINT NOT NULL DEFAULT 0,`);
  lines.push(`  \`created_at\` VARCHAR(64) NOT NULL`);
  lines.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
  lines.push(``);

  lines.push(`-- Table: notifications`);
  lines.push(`CREATE TABLE IF NOT EXISTS \`notifications\` (`);
  lines.push(`  \`id\` INT AUTO_INCREMENT PRIMARY KEY,`);
  lines.push(`  \`user_id\` INT NOT NULL DEFAULT 1,`);
  lines.push(`  \`event_type\` VARCHAR(64) NOT NULL DEFAULT 'system',`);
  lines.push(`  \`title\` VARCHAR(255) NOT NULL,`);
  lines.push(`  \`message\` TEXT NOT NULL,`);
  lines.push(`  \`link_url\` TEXT,`);
  lines.push(`  \`is_read\` TINYINT NOT NULL DEFAULT 0,`);
  lines.push(`  \`created_at\` VARCHAR(64) NOT NULL`);
  lines.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
  lines.push(``);

  lines.push(`-- Table: post_comments`);
  lines.push(`CREATE TABLE IF NOT EXISTS \`post_comments\` (`);
  lines.push(`  \`id\` INT AUTO_INCREMENT PRIMARY KEY,`);
  lines.push(`  \`post_id\` VARCHAR(64) NOT NULL,`);
  lines.push(`  \`user_id\` INT NOT NULL DEFAULT 1,`);
  lines.push(`  \`user_full_name\` VARCHAR(255) NOT NULL DEFAULT 'David Vance',`);
  lines.push(`  \`user_avatar_url\` TEXT,`);
  lines.push(`  \`user_role\` VARCHAR(64) NOT NULL DEFAULT 'Super Admin',`);
  lines.push(`  \`comment_text\` TEXT NOT NULL,`);
  lines.push(`  \`is_system_message\` TINYINT NOT NULL DEFAULT 0,`);
  lines.push(`  \`attachment_url\` TEXT,`);
  lines.push(`  \`created_at\` VARCHAR(64) NOT NULL,`);
  lines.push(`  INDEX \`idx_post_comments_post\` (\`post_id\`)`);
  lines.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
  lines.push(``);

  // Now dump all data from existing tables
  const tables = [
    'clients',
    'brands',
    'social_accounts',
    'posts',
    'post_targets',
    'publish_attempts',
    'executions_cache',
    'outbox',
    'sheet_sync_state',
    'webhook_events',
    'audit_log',
    'users',
    'notifications',
    'post_comments'
  ];

  for (const table of tables) {
    try {
      const query = table === 'outbox' 
        ? `SELECT * FROM outbox WHERE status = 'pending' LIMIT 500` 
        : `SELECT * FROM ${table}`;
      const rows = db.prepare(query).all() as any[];
      if (rows.length === 0) continue;

      lines.push(`-- Data for table: ${table} (${rows.length} rows)`);
      const cols = Object.keys(rows[0]);
      const colList = cols.map(c => `\`${c}\``).join(', ');

      for (const row of rows) {
        const valList = cols.map(c => escapeSql(row[c])).join(', ');
        lines.push(`REPLACE INTO \`${table}\` (${colList}) VALUES (${valList});`);
      }
      lines.push(``);
    } catch (err: any) {
      console.warn(`Could not dump table ${table}:`, err.message);
    }
  }

  lines.push(`SET FOREIGN_KEY_CHECKS = 1;`);
  lines.push(``);

  const outPath = path.resolve(process.cwd(), 'database', 'schema.mysql.sql');
  fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
  console.log(`Successfully generated MySQL dump: ${outPath} (${lines.length} lines)`);
}

generateMySQLDump();
