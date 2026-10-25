# Test Plan & Verification Matrix: Social Media Automation Hub

## 1. Overview
This test plan provides comprehensive test suites for verifying the multi-client, multi-brand social media scheduling and auto-posting system built with n8n and Google Sheets. It details inputs, expected state changes, Sheet column assertions, and log telemetry.

---

## 2. Test Execution Matrix

| Test ID | Scenario | Input Conditions | Expected Workflow Behavior | Google Sheet Assertions |
|---|---|---|---|---|
| **TC-01** | **Happy Path: Facebook Page Post** | `platform = facebook`, `media_type = image`, `media_url = valid_url`, valid schedule time | Successfully posts via Graph API `/{page-id}/photos` | `status = Posted`<br>`posted_at = timestamp`<br>`platform_post_id` populated<br>`post_url = https://facebook.com/...`<br>`locked_by_execution = empty` |
| **TC-02** | **Happy Path: Instagram Business 2-Step** | `platform = instagram`, `media_type = image`, valid image URL | 1. Creates container (`/{ig-id}/media`)<br>2. Waits 5s<br>3. Publishes container (`/{ig-id}/media_publish`) | `status = Posted`<br>`platform_post_id` matches Meta creation ID<br>`post_url = https://instagram.com/p/...` |
| **TC-03** | **Happy Path: Meta Threads Post** | `platform = threads`, `caption = "Hello Threads"`, `link_url = valid_url` | 1. Creates thread container (`/{th-id}/threads`)<br>2. Publishes (`/{th-id}/threads_publish`) | `status = Posted`<br>`platform_post_id` populated<br>`post_url` populated |
| **TC-04** | **Happy Path: LinkedIn Organization Post** | `platform = linkedin`, `caption = "Company update"`, `social_media_id = urn:li:organization:12345` | Submits `POST /rest/posts` with commentary and public visibility | `status = Posted`<br>`platform_post_id = urn:li:share:...` |
| **TC-05** | **Happy Path: X (Twitter) Tweet** | `platform = x`, `caption = "Under 280 chars tweet"` | Submits `POST /2/tweets` | `status = Posted`<br>`platform_post_id` populated<br>`post_url = https://x.com/i/web/status/...` |
| **TC-06** | **Timezone Conversion & DST** | `schedule_date = 2026-11-05`, `schedule_time = 09:00`, `timezone = America/New_York` (EST/EDT shift) | Luxon parses zone correctly and generates accurate UTC timestamp | `scheduled_utc` matches exact UTC equivalent; executes when UTC arrives |
| **TC-07** | **Invalid Timezone String** | `timezone = "Mars/Olympus_Mons"` | Fails timezone validation (`IANAZone.isValidZone`) | `status = Failed`<br>`error_code = INVALID_TIMEZONE`<br>`error_message = Invalid IANA timezone` |
| **TC-08** | **Missed Window (> 24h past due)** | `schedule_date` is 48 hours in the past | Filter marks row as expired rather than spamming platforms | `status = Skipped`<br>`error_code = MISSED_WINDOW`<br>`error_message = Scheduled time is older than 24h window` |
| **TC-09** | **Future Post Ignored** | `schedule_date` is tomorrow | Node filters out row during due-date check | `status` remains `"Scheduled"`<br>`attempt_count` unchanged |
| **TC-10** | **Concurrency & Collision Prevention** | Row has `status = "Scheduled"`; two executions trigger simultaneously | 1st execution writes `status = Processing`, `locked_by_execution = <id>`. 2nd execution skips locked row | Post is published exactly once; no duplicate social media posts |
| **TC-11** | **Client Paused Guard** | Client has `status = "Paused"` in `Clients` tab | Pre-flight validation stops execution before platform API calls | `status = Failed`<br>`error_code = CLIENT_PAUSED` |
| **TC-12** | **Brand Paused Guard** | Brand has `status = "Paused"` in `Brands` tab | Pre-flight validation stops execution | `status = Failed`<br>`error_code = BRAND_PAUSED` |
| **TC-13** | **Unconnected / Expired Account** | `Social_Accounts.connection_status = "Disconnected"` | Node detects invalid connection status | `status = Failed`<br>`error_code = ACCOUNT_NOT_CONNECTED` |
| **TC-14** | **Platform Validation: X 280 Chars** | `platform = x`, `caption` is 320 characters | Fails character length check | `status = Failed`<br>`error_code = VALIDATION_ERROR`<br>`error_message = X caption exceeds 280 characters` |
| **TC-15** | **Platform Validation: Instagram Media Required** | `platform = instagram`, `media_url = ""` | Fails media requirement check | `status = Failed`<br>`error_code = VALIDATION_ERROR`<br>`error_message = Instagram posts require an image or video URL` |
| **TC-16** | **Platform Validation: YouTube Video Required** | `platform = youtube`, `media_type = image` | Fails media type check | `status = Failed`<br>`error_code = VALIDATION_ERROR`<br>`error_message = YouTube requires media_type to be video` |
| **TC-17** | **Auth Error (HTTP 401 / 190)** | Platform API returns `401 Unauthorized` or Meta subcode `190` | 1. Classifies as `AUTH_ERROR`<br>2. Marks `Social_Accounts.connection_status = "Expired"`<br>3. Triggers immediate alert | `Posts.status = Failed`<br>`Posts.error_code = AUTH_ERROR`<br>`Social_Accounts.connection_status = Expired` |
| **TC-18** | **Rate Limit Retry (HTTP 429)** | Platform API returns `429 Too Many Requests`, `attempt_count = 1`, `max_retries = 3` | Marks row for automatic retry in next cycle | `status = Retrying`<br>`attempt_count = 2`<br>`error_code = RATE_LIMIT`<br>`locked_by_execution = empty` |
| **TC-19** | **Max Retries Exceeded** | `attempt_count = 3`, `max_retries = 3`, HTTP 500 error | No further retries allowed | `status = Failed`<br>`error_code = MAX_RETRIES_EXCEEDED`<br>Alert sent in batch summary |
| **TC-20** | **Crash Recovery (`error_handler.json`)** | Workflow encounters unexpected crash while row is `status = "Processing"` | Error Workflow detects `locked_by_execution`, resets row | `status = Retrying`<br>`locked_by_execution = empty`<br>Crash event logged to `Logs` tab |
| **TC-21** | **Manual Retry (`retry_failed.json`)** | Trigger retry workflow with `post_id = POST-004` | Resets error fields and readies post for next scheduled run | `status = Scheduled`<br>`error_code = empty`<br>`error_message = empty` |

---

## 3. Step-by-Step Test Execution Guide

### Step 1: Pre-Test Setup
1. Create a copy of the Google Sheets template using the 6 CSV files in `sheet_template/`.
2. Populate your test Google Sheet ID in `Settings.csv` and configure the Google Sheets credential in n8n.
3. Import `workflows/main_scheduler.json`, `workflows/error_handler.json`, and `workflows/retry_failed.json` into your n8n workspace.

### Step 2: Running Unit Test Cases
1. Set row `POST-001` in the `Posts` tab:
   - `schedule_date`: Current date (YYYY-MM-DD)
   - `schedule_time`: 2 minutes in the past (HH:mm)
   - `timezone`: Your local IANA timezone (e.g. `Asia/Kolkata`, `America/New_York`)
   - `status`: `Scheduled`
2. Manually click **"Execute Workflow"** in `main_scheduler.json` within the n8n canvas.
3. Verify:
   - Node `Filter Due Posts` passes the item.
   - Node `Lock Post Row` writes `Processing` and your execution ID.
   - Platform branch executes.
   - Node `Update Post Success` sets `status = Posted` and populates `platform_post_id`.
   - Node `Append Log Entry` records the execution details in the `Logs` sheet tab.

### Step 3: Verifying Edge Cases & Safety Guards
1. **Invalid Timezone**: Set `timezone = Invalid/Zone` -> Execute -> Verify `status = Failed`, `error_code = INVALID_TIMEZONE`.
2. **Expired Post**: Set `schedule_date` to 7 days ago -> Execute -> Verify `status = Skipped`, `error_code = MISSED_WINDOW`.
3. **Simulated Rate Limit**: Modify HTTP node to return status code 429 -> Execute -> Verify `status = Retrying`, `attempt_count` increments by 1.
