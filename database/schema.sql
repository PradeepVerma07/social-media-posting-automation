-- CI360 AUTOMATION HUB - Production MySQL 8 Schema
-- Charset: utf8mb4, Collation: utf8mb4_unicode_ci

CREATE DATABASE IF NOT EXISTS `ci360_automation` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `ci360_automation`;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `avatar_url` VARCHAR(500) NULL,
  `phone` VARCHAR(50) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `failed_login_attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `locked_until` DATETIME NULL,
  `two_factor_secret` VARCHAR(255) NULL,
  `is_two_factor_enabled` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Roles Table
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `description` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Permissions Table
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(100) NOT NULL UNIQUE,
  `description` VARCHAR(255) NULL,
  `category` VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. User Roles Join Table
CREATE TABLE IF NOT EXISTS `user_roles` (
  `user_id` INT UNSIGNED NOT NULL,
  `role_id` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`user_id`, `role_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Role Permissions Join Table
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `role_id` INT UNSIGNED NOT NULL,
  `permission_id` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`role_id`, `permission_id`),
  FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Refresh Tokens Table (Rotation & Device Tracking)
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `token_hash` VARCHAR(255) NOT NULL,
  `device_info` VARCHAR(255) NULL,
  `ip_address` VARCHAR(45) NULL,
  `expires_at` DATETIME NOT NULL,
  `revoked_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_refresh_tokens_user` (`user_id`),
  INDEX `idx_refresh_tokens_hash` (`token_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Password Reset Tokens
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `token_hash` VARCHAR(255) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `used_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_pw_tokens_hash` (`token_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Brands Table
CREATE TABLE IF NOT EXISTS `brands` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `slug` VARCHAR(150) NOT NULL UNIQUE,
  `logo_url` VARCHAR(500) NULL,
  `primary_color` VARCHAR(20) NOT NULL DEFAULT '#1336E8',
  `secondary_color` VARCHAR(20) NOT NULL DEFAULT '#08C5E1',
  `timezone` VARCHAR(50) NOT NULL DEFAULT 'UTC',
  `country` VARCHAR(10) NOT NULL DEFAULT 'US',
  `default_approver_id` INT UNSIGNED NULL,
  `default_hashtags` TEXT NULL,
  `default_keywords` TEXT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`default_approver_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_brands_slug` (`slug`),
  INDEX `idx_brands_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Brand Users Join Table (Tenant isolation)
CREATE TABLE IF NOT EXISTS `brand_users` (
  `brand_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`brand_id`, `user_id`),
  FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Social Accounts Table
CREATE TABLE IF NOT EXISTS `social_accounts` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `brand_id` INT UNSIGNED NOT NULL,
  `platform` ENUM('linkedin', 'facebook', 'instagram', 'x', 'youtube') NOT NULL,
  `account_name` VARCHAR(150) NOT NULL,
  `account_handle` VARCHAR(150) NULL,
  `profile_image_url` VARCHAR(500) NULL,
  `platform_account_id` VARCHAR(150) NULL,
  `connection_status` ENUM('connected', 'expired', 'disconnected', 'error') NOT NULL DEFAULT 'connected',
  `token_expires_at` DATETIME NULL,
  `last_successful_publish_at` DATETIME NULL,
  `last_error_message` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  INDEX `idx_social_brand_platform` (`brand_id`, `platform`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Campaigns Table
CREATE TABLE IF NOT EXISTS `campaigns` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `brand_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT NULL,
  `start_date` DATE NULL,
  `end_date` DATE NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Posts Table (Core Content Entity)
CREATE TABLE IF NOT EXISTS `posts` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `brand_id` INT UNSIGNED NOT NULL,
  `campaign_id` INT UNSIGNED NULL,
  `created_by_user_id` INT UNSIGNED NOT NULL,
  `assigned_approver_id` INT UNSIGNED NULL,
  `title` VARCHAR(255) NOT NULL,
  `master_caption` TEXT NOT NULL,
  `first_comment` TEXT NULL,
  `hashtags` TEXT NULL,
  `keywords` TEXT NULL,
  `target_url` VARCHAR(1000) NULL,
  `internal_tags` VARCHAR(255) NULL,
  `country` VARCHAR(10) NOT NULL DEFAULT 'US',
  `timezone` VARCHAR(50) NOT NULL DEFAULT 'UTC',
  `scheduled_at` DATETIME NULL,
  `published_at` DATETIME NULL,
  `approval_status` ENUM('draft', 'in_review', 'revision_requested', 'approved', 'rejected', 'overdue') NOT NULL DEFAULT 'draft',
  `publishing_status` ENUM('idle', 'scheduled', 'processing', 'published', 'partially_published', 'failed', 'cancelled') NOT NULL DEFAULT 'idle',
  `rejection_reason` TEXT NULL,
  `version_number` INT UNSIGNED NOT NULL DEFAULT 1,
  `is_locked` BOOLEAN NOT NULL DEFAULT FALSE,
  `external_sheet_id` VARCHAR(100) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`campaign_id`) REFERENCES `campaigns` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`assigned_approver_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_posts_brand` (`brand_id`),
  INDEX `idx_posts_approval_status` (`approval_status`),
  INDEX `idx_posts_publishing_status` (`publishing_status`),
  INDEX `idx_posts_scheduled_at` (`scheduled_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Post Target Platforms (with platform-specific overrides)
CREATE TABLE IF NOT EXISTS `post_platforms` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `post_id` INT UNSIGNED NOT NULL,
  `platform` ENUM('linkedin', 'facebook', 'instagram', 'x', 'youtube') NOT NULL,
  `caption_override` TEXT NULL,
  `custom_media_id` INT UNSIGNED NULL,
  `publishing_status` ENUM('pending', 'publishing', 'success', 'failed') NOT NULL DEFAULT 'pending',
  `platform_post_id` VARCHAR(255) NULL,
  `platform_post_url` VARCHAR(1000) NULL,
  `error_message` TEXT NULL,
  `published_at` DATETIME NULL,
  FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  INDEX `idx_post_platforms` (`post_id`, `platform`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Post Media Items
CREATE TABLE IF NOT EXISTS `post_media` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `post_id` INT UNSIGNED NOT NULL,
  `media_type` ENUM('image', 'video', 'document') NOT NULL,
  `file_url` VARCHAR(1000) NOT NULL,
  `original_file_name` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(100) NOT NULL,
  `file_size_bytes` BIGINT UNSIGNED NOT NULL,
  `width` INT UNSIGNED NULL,
  `height` INT UNSIGNED NULL,
  `duration_seconds` DECIMAL(8, 2) NULL,
  `alt_text` VARCHAR(500) NULL,
  `sort_order` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Post Versions (Audit history of revisions)
CREATE TABLE IF NOT EXISTS `post_versions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `post_id` INT UNSIGNED NOT NULL,
  `version_number` INT UNSIGNED NOT NULL,
  `changed_by_user_id` INT UNSIGNED NOT NULL,
  `master_caption` TEXT NOT NULL,
  `media_snapshot_json` JSON NULL,
  `platform_overrides_json` JSON NULL,
  `scheduled_at_snapshot` DATETIME NULL,
  `change_summary` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`changed_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  INDEX `idx_post_versions` (`post_id`, `version_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Post Comments (WhatsApp/Instagram-style internal discussion)
CREATE TABLE IF NOT EXISTS `post_comments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `post_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `comment_text` TEXT NOT NULL,
  `is_system_message` BOOLEAN NOT NULL DEFAULT FALSE,
  `attachment_url` VARCHAR(1000) NULL,
  `reply_to_comment_id` INT UNSIGNED NULL,
  `is_edited` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`reply_to_comment_id`) REFERENCES `post_comments` (`id`) ON DELETE SET NULL,
  INDEX `idx_comments_post` (`post_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Post Approvals Activity History
CREATE TABLE IF NOT EXISTS `post_approvals` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `post_id` INT UNSIGNED NOT NULL,
  `action` ENUM('submitted', 'approved', 'rejected', 'revision_requested', 'superadmin_overridden') NOT NULL,
  `action_by_user_id` INT UNSIGNED NOT NULL,
  `comments` TEXT NULL,
  `previous_status` VARCHAR(50) NOT NULL,
  `new_status` VARCHAR(50) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`action_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. n8n Workflow Mappings (Allowlist of dashboard-accessible workflows)
CREATE TABLE IF NOT EXISTS `workflow_mappings` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `workflow_name` VARCHAR(150) NOT NULL,
  `n8n_workflow_id` VARCHAR(100) NOT NULL UNIQUE,
  `webhook_path` VARCHAR(255) NOT NULL,
  `description` VARCHAR(255) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `average_duration_ms` INT UNSIGNED NOT NULL DEFAULT 0,
  `success_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `failure_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `last_executed_at` DATETIME NULL,
  `last_result_status` VARCHAR(50) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_wf_n8n_id` (`n8n_workflow_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. Workflow Executions (Monitoring & Real-time Tracking)
CREATE TABLE IF NOT EXISTS `workflow_executions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `execution_id` VARCHAR(100) NOT NULL UNIQUE,
  `n8n_workflow_id` VARCHAR(100) NOT NULL,
  `post_id` INT UNSIGNED NULL,
  `brand_id` INT UNSIGNED NULL,
  `initiated_by_user_id` INT UNSIGNED NOT NULL,
  `trigger_type` ENUM('manual', 'schedule', 'webhook_callback', 'retry') NOT NULL DEFAULT 'manual',
  `status` ENUM('queued', 'running', 'success', 'partial_success', 'failed', 'cancelled') NOT NULL DEFAULT 'queued',
  `duration_ms` INT UNSIGNED NULL,
  `started_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `finished_at` DATETIME NULL,
  `sanitized_input_json` JSON NULL,
  `per_platform_results_json` JSON NULL,
  `error_summary` TEXT NULL,
  FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`initiated_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  INDEX `idx_wf_exec_status` (`status`),
  INDEX `idx_wf_exec_post` (`post_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. Analytics Snapshots
CREATE TABLE IF NOT EXISTS `analytics_snapshots` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `brand_id` INT UNSIGNED NOT NULL,
  `platform` ENUM('linkedin', 'facebook', 'instagram', 'x', 'all') NOT NULL,
  `snapshot_date` DATE NOT NULL,
  `impressions` INT UNSIGNED NOT NULL DEFAULT 0,
  `reach` INT UNSIGNED NOT NULL DEFAULT 0,
  `engagements` INT UNSIGNED NOT NULL DEFAULT 0,
  `likes` INT UNSIGNED NOT NULL DEFAULT 0,
  `comments` INT UNSIGNED NOT NULL DEFAULT 0,
  `shares` INT UNSIGNED NOT NULL DEFAULT 0,
  `clicks` INT UNSIGNED NOT NULL DEFAULT 0,
  `video_views` INT UNSIGNED NOT NULL DEFAULT 0,
  `followers_net_change` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_brand_platform_date` (`brand_id`, `platform`, `snapshot_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. In-App Notifications
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `event_type` VARCHAR(100) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `link_url` VARCHAR(500) NULL,
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_notif_user_unread` (`user_id`, `is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. Idempotency Keys (Replay & Double-Publish Prevention)
CREATE TABLE IF NOT EXISTS `idempotency_keys` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `idempotency_key` VARCHAR(100) NOT NULL UNIQUE,
  `request_id` VARCHAR(100) NOT NULL,
  `action_name` VARCHAR(100) NOT NULL,
  `payload_hash` VARCHAR(64) NOT NULL,
  `response_status_code` SMALLINT UNSIGNED NULL,
  `response_body` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_idempotency_lookup` (`idempotency_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. Security & Operational Audit Logs
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NULL,
  `user_email` VARCHAR(255) NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` INT UNSIGNED NULL,
  `details_json` JSON NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(255) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_audit_entity` (`entity_type`, `entity_id`),
  INDEX `idx_audit_action` (`action`),
  INDEX `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24. System Settings
CREATE TABLE IF NOT EXISTS `app_settings` (
  `setting_key` VARCHAR(100) PRIMARY KEY,
  `setting_value` TEXT NOT NULL,
  `is_encrypted` BOOLEAN NOT NULL DEFAULT FALSE,
  `description` VARCHAR(255) NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
