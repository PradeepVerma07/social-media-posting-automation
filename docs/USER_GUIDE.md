# CI360 Automation Hub User Guide

A practical guide for marketing managers, content creators, reviewers, and agency teams.

---

## 1. Creating a Post

1. Click **+ Create Post** from the top bar or sidebar.
2. **Step 1 (Brand & Campaign)**: Select your target brand, post title, campaign, and timezone.
3. **Step 2 (Platforms)**: Select distribution channels (LinkedIn, X, Facebook, Instagram).
4. **Step 3 (Media)**: Enter image URL or import Google Drive public link. Review aspect ratio.
5. **Step 4 (Captions)**: Write your master caption. Add platform-specific overrides (e.g. 280-char X summary). Inspect the live card preview.
6. **Step 5 (Schedule)**: Choose *Publish Immediately* or pick release date and time.
7. **Step 6 (Approval)**: Select assigned reviewer and click **Submit for Approval**.

---

## 2. Reviewing & Approving Content

1. Navigate to **Approval Queue**.
2. Select any item from the *Pending Review* list.
3. Inspect post media, master caption, and channel overrides.
4. Use the **Internal Review Discussion** chat panel to ask questions or mention team members.
5. Actions:
   - **Approve Content**: Locks the post and prepares it for automated publishing.
   - **Request Revision**: Opens comments modal to specify necessary changes.
   - **Reject Post**: Requires an explicit compliance or business reason.

---

## 3. Monitoring n8n Executions

1. Navigate to **Workflow Executions**.
2. Review real-time status badges (`success`, `running`, `failed`).
3. Click **Inspect** on any run to view duration, per-platform URLs, and sanitized execution logs.
4. If an execution failed on a network timeout, click **Retry via n8n** to trigger a safe retry.
