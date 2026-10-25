# CI360 Automation Hub v2 — Architectural & Engineering Decisions

This document records architectural, data integrity, and concurrency decisions made during the v2 production refactor per Section 1 (Rule 1: Never publish twice, Rule 2: Never lose data).

---

## 1. Durable Storage Engine: Native `node:sqlite` in WAL Mode
- **Decision**: Used Node 24's native `DatabaseSync` (`node:sqlite`) with `PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;`.
- **Rationale**: Eliminates fragile C++ binary compilation or external native dependency failures on Windows/Linux containers while providing durable ACID transactions with `BEGIN IMMEDIATE` for zero-contention atomic job claiming.

## 2. Atomic Job Claiming vs Distributed Race Conditions
- **Decision**: In `POST /internal/jobs/claim`, claiming rows executes strictly within a single `BEGIN IMMEDIATE` transaction. Targets move from `Scheduled` / `Retrying` to `Processing` with `lock_stage = 'claimed'` and incremented `attempt_count`.
- **Rationale**: Fully prevents race conditions between the 1-minute cron trigger and simultaneous "Publish Now" webhook dispatches. A second simultaneous claim request returns zero overlapping jobs.

## 3. Two-Phase Stale Lock Resolution & Anti-Duplicate Verifier
- **Decision**:
  - If a job has been locked > 10 minutes at `lock_stage = 'claimed'`, Meta was never reached $\rightarrow$ safe to transition directly to `Retrying`.
  - If locked at `lock_stage = 'publishing'`, Meta may have accepted the post prior to a network partition $\rightarrow$ moves to `NeedsVerification`.
  - `MetaVerifierService` queries Meta Graph API (`/{page_id}/published_posts` / `/{ig_user_id}/media`) for matching captions before any retry is permitted.
- **Rationale**: Guarantees Rule 1 (Never publish the same post twice) even in catastrophic container crashes or network dropouts after Meta returns HTTP 200.

## 4. Token Vault & AES-256-GCM Encryption at Rest
- **Decision**: Tokens are encrypted using AES-256-GCM with a random 12-byte IV and 16-byte authentication tag per token. The plain text token is decrypted strictly in memory upon internal request by n8n and is excluded from all public API outputs, logs, and Google Sheets.
- **Rationale**: Adheres to Rule 8. Google Sheets holds only `account_id` references; plain text tokens are completely eliminated from spreadsheets and Git repositories.

## 5. UTC Internals & Edge Localization (Luxon)
- **Decision**: The backend database stores only standard UTC ISO strings (`scheduled_utc`, `created_at`, `updated_at`). Luxon converts local human date/time and timezone (`Asia/Kolkata`) on input. All API responses include `scheduledAtDisplay` pre-formatted in the target brand's timezone (e.g. `Oct 25, 02:15:40`).
- **Rationale**: Solves JavaScript client timezone discrepancies across operating systems while providing exact visual parity with n8n UI timestamps.

## 6. Reliable Outbox Pattern for Google Sheets Sync
- **Decision**: Every mutation that affects mirrored spreadsheet fields inserts an entry into the `outbox` table within the same transaction. A dedicated worker drains the outbox every 2 seconds via Google Sheets `batchUpdate`.
- **Rationale**: Guarantees Rule 2 (Never lose data). If Google Sheets API returns rate limits (HTTP 429) or transient errors, the local database remains accurate and the outbox retries with exponential backoff.

## 7. Public n8n REST API Poller Replacing Direct SQLite File Inspection
- **Decision**: Replaced custom Python scripts reading `~/.n8n/database.sqlite` with the official n8n Public REST API (`/api/v1/executions`) cached into `executions_cache`.
- **Rationale**: Eliminates cross-process file-locking issues on SQLite and ensures forward compatibility with PostgreSQL-backed n8n instances and schema upgrades.

## 8. Server-Sent Events (SSE) Push Over Polling
- **Decision**: Integrated an SSE manager (`/api/v1/events`) broadcasting granular entity transitions (`target.status_changed`, `post.created`, `post.updated`, `execution.finished`).
- **Rationale**: Replaces 10-second polling loops with sub-second live updates on the React dashboard while preserving UI/UX components.
