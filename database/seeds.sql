-- CI360 AUTOMATION HUB - Production & Development Seed Records
USE `ci360_automation`;

-- 1. Insert Standard Roles
INSERT INTO `roles` (`id`, `name`, `description`) VALUES
(1, 'Super Admin', 'Full system access, tenant settings, integration keys, and audit logs'),
(2, 'Admin', 'Manage brands, team members, post scheduling, and retry failed automations'),
(3, 'Content Manager', 'Create posts, upload media, submit content for approval, manage assigned brands'),
(4, 'Approver', 'Review pending posts, approve, reject with reason, or request revisions'),
(5, 'Analyst', 'Read-only access to analytics, performance reports, and execution logs'),
(6, 'Client', 'Brand-scoped access to review, discuss, and approve assigned client content')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

-- 2. Insert Standard Permissions
INSERT INTO `permissions` (`code`, `description`, `category`) VALUES
('posts.create', 'Create and edit draft posts', 'Content'),
('posts.submit', 'Submit posts for review', 'Content'),
('posts.approve', 'Approve or reject posts', 'Approval'),
('posts.schedule', 'Schedule approved posts', 'Content'),
('posts.publish_now', 'Trigger immediate publishing', 'Content'),
('brands.manage', 'Create and update brands', 'Brands'),
('accounts.manage', 'Manage connected social channels', 'Accounts'),
('workflows.execute', 'Execute allowed n8n automations', 'Automation'),
('analytics.view', 'View performance metrics and export reports', 'Analytics'),
('system.settings', 'Manage n8n secrets, SMTP, and security settings', 'System')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

-- 3. Default Users (argon2id/bcrypt hashed password placeholder)
-- Password for all seed users in dev: Admin@CI360#2026
INSERT INTO `users` (`id`, `email`, `password_hash`, `full_name`, `avatar_url`, `is_active`) VALUES
(1, 'admin@ci360.internal', '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$e6N1Lw8zG7N8r9Qp4t2Yx7zK9bC2a1', 'David Vance (Super Admin)', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80', TRUE),
(2, 'editor@ci360.internal', '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$e6N1Lw8zG7N8r9Qp4t2Yx7zK9bC2a1', 'Elena Rostova (Content Lead)', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=120&h=120&q=80', TRUE),
(3, 'approver@ci360.internal', '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$e6N1Lw8zG7N8r9Qp4t2Yx7zK9bC2a1', 'Marcus Sterling (Senior VP Approver)', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80', TRUE),
(4, 'client@nexusglobal.com', '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$e6N1Lw8zG7N8r9Qp4t2Yx7zK9bC2a1', 'Sophia Al-Mansoor (Brand Director)', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&h=120&q=80', TRUE)
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`);

-- Assign User Roles
INSERT INTO `user_roles` (`user_id`, `role_id`) VALUES
(1, 1), -- David -> Super Admin
(2, 3), -- Elena -> Content Manager
(3, 4), -- Marcus -> Approver
(4, 6)  -- Sophia -> Client
ON DUPLICATE KEY UPDATE `role_id` = VALUES(`role_id`);

-- 4. Insert Default Brands
INSERT INTO `brands` (`id`, `name`, `slug`, `logo_url`, `primary_color`, `secondary_color`, `timezone`, `country`, `default_approver_id`, `default_hashtags`, `default_keywords`, `is_active`) VALUES
(1, 'Nexus Enterprise Cloud', 'nexus-cloud', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&h=120&q=80', '#1336E8', '#08C5E1', 'America/New_York', 'US', 3, '#CloudNative #DevOps #EnterpriseAI', 'kubernetes, multi-cloud, serverless, devops', TRUE),
(2, 'Starlight Consumer Tech', 'starlight-tech', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&h=120&q=80', '#E11D48', '#FB7185', 'America/Los_Angeles', 'US', 3, '#SmartLiving #AudioGear #TechTrends', 'headphones, wearables, smart home', TRUE),
(3, 'Apex AI Research Labs', 'apex-ai', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&h=120&q=80', '#059669', '#10B981', 'Europe/London', 'GB', 3, '#GenerativeAI #MachineLearning #DeepTech', 'neural networks, foundation models, agents', TRUE)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Brand User Access
INSERT INTO `brand_users` (`brand_id`, `user_id`) VALUES
(1, 1), (1, 2), (1, 3), (1, 4),
(2, 1), (2, 2), (2, 3),
(3, 1), (3, 2), (3, 3)
ON DUPLICATE KEY UPDATE `user_id` = VALUES(`user_id`);

-- 5. Insert Connected Social Accounts
INSERT INTO `social_accounts` (`id`, `brand_id`, `platform`, `account_name`, `account_handle`, `profile_image_url`, `connection_status`, `token_expires_at`, `last_successful_publish_at`) VALUES
(1, 1, 'linkedin', 'Nexus Cloud Solutions', 'nexus-cloud-hq', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=64&h=64&q=80', 'connected', DATE_ADD(NOW(), INTERVAL 45 DAY), NOW()),
(2, 1, 'x', 'NexusCloud', '@NexusCloudTech', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=64&h=64&q=80', 'connected', DATE_ADD(NOW(), INTERVAL 60 DAY), NOW()),
(3, 1, 'facebook', 'Nexus Enterprise Platform', 'nexuscloudcorp', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=64&h=64&q=80', 'connected', DATE_ADD(NOW(), INTERVAL 30 DAY), NOW()),
(4, 1, 'instagram', 'Nexus Tech Life', '@nexus.cloud', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=64&h=64&q=80', 'connected', DATE_ADD(NOW(), INTERVAL 15 DAY), NOW())
ON DUPLICATE KEY UPDATE `account_name` = VALUES(`account_name`);

-- 6. Insert Allowed n8n Workflows
INSERT INTO `workflow_mappings` (`id`, `workflow_name`, `n8n_workflow_id`, `webhook_path`, `description`, `is_active`, `average_duration_ms`, `success_count`, `failure_count`, `last_executed_at`, `last_result_status`) VALUES
(1, 'Social Multi-Platform Publisher', 'wf_ci360_multi_publisher', '/webhook/ci360/publish-now', 'Orchestrates multi-channel publishing to LinkedIn, Facebook, Instagram & X with rollback safety', TRUE, 3420, 142, 3, NOW(), 'success'),
(2, 'Schedule & Queue Dispatcher', 'wf_ci360_scheduler', '/webhook/ci360/schedule-post', 'Evaluates scheduled posts, verifies locking status, and queues timed executions', TRUE, 890, 89, 0, NOW(), 'success'),
(3, 'Google Sheets Content Sync', 'wf_ci360_sheets_sync', '/webhook/ci360/sync-sheets', 'Bi-directional synchronization between Google Sheets content planner and MySQL database', TRUE, 4120, 56, 1, NOW(), 'success'),
(4, 'Executive Approval Notifier', 'wf_ci360_approval_alert', '/webhook/ci360/request-approval', 'Sends signed, expiring approval tokens to client and executive reviewers via email & Slack', TRUE, 640, 210, 0, NOW(), 'success')
ON DUPLICATE KEY UPDATE `workflow_name` = VALUES(`workflow_name`);

-- 7. App Settings
INSERT INTO `app_settings` (`setting_key`, `setting_value`, `description`) VALUES
('N8N_BASE_URL', 'https://n8n.internal.agency', 'Base URL of the self-hosted n8n instance'),
('N8N_WEBHOOK_BASE_URL', 'https://n8n.internal.agency/webhook/ci360', 'Production webhook base URL for CI360 actions'),
('N8N_TIMEOUT_MS', '15000', 'HTTP request timeout in milliseconds for n8n API'),
('GOOGLE_SHEETS_SYNC_INTERVAL_HOURS', '4', 'Background maintenance sync frequency for Google Sheets'),
('REQUIRE_TWO_FACTOR_FOR_ADMINS', 'false', 'Security policy toggle for mandatory 2FA on elevated roles')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);
