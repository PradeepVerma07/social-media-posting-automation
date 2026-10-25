# Google Sheets Sync Setup Guide

CI360 supports bi-directional synchronization with Google Sheets for teams using spreadsheets for collaborative post drafting and marketing calendars.

---

## 1. Sheet Column Architecture

Your connected Google Sheet must contain the following header row in Row 1:

1. `external_id` (Unique row identifier)
2. `post_url` (Live published URL)
3. `media_url` (Public asset link)
4. `brand` (Slug matching brand in CI360)
5. `campaign` (Campaign tag)
6. `platform` (Target social platform)
7. `country` (2-letter country code)
8. `timezone` (IANA timezone)
9. `schedule_time` (ISO 8601 date)
10. `caption` (Master caption text)
11. `hashtags` (Comma/space separated tags)
12. `keywords` (Search keywords)
13. `approval_status` (`draft` / `in_review` / `approved` / `rejected`)
14. `rejection_reason` (Text note)
15. `publishing_status` (`scheduled` / `published` / `failed`)
16. `published_url` (Final post link)
17. `execution_id` (n8n execution reference)
18. `error_message` (Failure log)
19. `updated_at` (Timestamp)

---

## 2. n8n Synchronization Workflow

1. In n8n, create a workflow listening on `/webhook/ci360/sync-sheets`.
2. Connect the **Google Sheets Node** using your Google Service Account or OAuth credentials.
3. Configure the trigger to sync rows modified within the last 24 hours.
4. On changes, call `POST /api/v1/integrations/google-sheets/sync` with authenticated HMAC signature.
