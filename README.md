# CI360 Automation Hub — Production Core (v2)

**Multi-Tenant Social Media Scheduling, Approval & Self-Hosted Automation Platform**

CI360 Automation Hub combines a modern React dashboard with a durable Node.js backend, a live bidirectional Google Sheets mirror, a self-hosted n8n automation engine, and direct Meta Graph API publishing to Facebook Pages and Instagram Business accounts.

---

## What Changed in v2 (Production Architecture)

| Area | v1 Limitation | v2 Production Fix |
|---|---|---|
| **Data Persistence** | In-memory DB lost on restart | Durable SQLite in WAL mode (`database/ci360.sqlite`) |
| **Job Locking** | Non-atomic cell writing in Sheets | Single DB transaction (`BEGIN IMMEDIATE`) via `/internal/jobs/claim` |
| **Crash Protection** | Blind retries causing duplicate posts | Stale locks move to `NeedsVerification`; backend verifies Meta before retry |
| **n8n Integration** | Direct file inspection via Python script | n8n Public REST API + signed per-stage callbacks (`/internal/n8n/callback`) |
| **Live Updates** | 10-second polling | Server-Sent Events (SSE) stream (`/api/v1/events`) pushes updates < 2s |
| **Token Security** | Plaintext tokens in Google Sheets | AES-256-GCM encryption at rest; Sheets holds only account ID |
| **Timezone Precision** | Client-dependent Date math | Centralized UTC core with Luxon localization (`Asia/Kolkata` IST default) |
| **Sheets Sync** | Direct blocking API calls | Outbox pattern with batch updates & 60s reconciliation safety net |

---

## Quickstart Setup (< 30 Minutes)

### 1. Prerequisites
- Node.js 20+ (Node 24 recommended with built-in `node:sqlite`)
- n8n instance (local or self-hosted)

### 2. Installation
```bash
git clone <repo-url>
cd n8n-Workflow-Studio-&-Self-Hosting-Hub
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Key configuration items:
- `TOKEN_ENCRYPTION_KEY`: 32-byte secret for encrypting Meta OAuth tokens.
- `GOOGLE_SPREADSHEET_ID`: Your Google Sheet ID.
- `N8N_BASE_URL`: e.g. `http://localhost:5678`.
- `DEFAULT_TIMEZONE`: e.g. `Asia/Kolkata` (UTC+5:30).

### 4. Seed the Database
Initializes the SQLite schema and seeds demo tenant (`CL-001`), brand (`BR-001`), encrypted social account (`ACC-001`), and sample posts:
```bash
npm run seed
```

### 5. Run the Automated Test Suite
Verifies timezone conversion, state machine transitions, Meta error classifications, and AES-256-GCM token encryption:
```bash
npm test
```

### 6. Start the Development Server
Runs both backend API and Vite frontend on port 3000:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## n8n Workflows

Pre-configured workflows are located in the `n8n/workflows/` directory:
- [`master-publisher.json`](n8n/workflows/master-publisher.json): Master publisher workflow (`Utaz0U82aZQZ7uHF`) implementing atomic job claims, Meta Graph API publishing, and signed callbacks.
- [`error-handler.json`](n8n/workflows/error-handler.json): Error trigger workflow catching execution crashes.

Import these workflows directly into your n8n workspace via **Workflows > Import from File**.

---

## Google Sheets Apps Script Integration

For sub-second synchronization of edits made directly in Google Sheets:
1. Open your Google Sheet > **Extensions** > **Apps Script**.
2. Paste [`apps-script/onEdit.gs`](apps-script/onEdit.gs).
3. Set `BACKEND_WEBHOOK_URL` to `https://your-domain.com/api/v1/webhooks/sheets` and `HMAC_SECRET` to match `SHEETS_WEBHOOK_SECRET`.
4. Add an installable **On Edit** trigger.

---

## Architecture & API Overview

### Internal Endpoints (Private Network / HMAC-Signed)
- `POST /internal/jobs/claim`: Atomic claim of due scheduled jobs.
- `GET /internal/accounts/:id/token`: Retrieves decrypted token in memory for executor.
- `POST /internal/n8n/callback`: Reports stages (`publishing`, `succeeded`, `failed`, `execution_crashed`).

### Public REST Endpoints (`/api/v1`)
- `GET /api/v1/posts`: Fetches all posts with target statuses and IST display dates.
- `POST /api/v1/posts`: Creates post and targets; enqueues Sheets outbox entry.
- `PATCH /api/v1/posts/:id`: Updates post with `If-Match` version locking.
- `POST /api/v1/posts/:id/publish-now`: Instant publish override triggering n8n webhook.
- `GET /api/v1/events`: Server-Sent Events stream for live UI updates.
- `GET /api/v1/healthz`: Liveness check.
- `GET /api/v1/readyz`: Readiness check with database verification.

---

## n8n Dashboard Embedding & Tunnel Configuration

### Required Environment Variables

When embedding self-hosted n8n inside the React dashboard or triggering workflows from the backend, configure these variables in `.env`:

```env
# Public HTTPS URL of the n8n instance (used by both n8n and the backend proxy)
N8N_PUBLIC_URL=https://home-taking-refers-rating.trycloudflare.com

# Frontend public URL for the embedded iframe and navigation links
VITE_N8N_URL=https://home-taking-refers-rating.trycloudflare.com

# n8n Public REST API key for server-side workflow executions (/api/v1/...)
# Kept strictly server-side — NEVER exposed in frontend code or VITE_ variables
N8N_API_KEY=n8n_api_live_9a7f3c21b4e6d8a0c2e4f6b8d0a2c4e6

# Required n8n cross-origin cookie & proxy settings (docker-compose.yml / startup script)
N8N_SAMESITE_COOKIE=none
N8N_SECURE_COOKIE=true
N8N_PROXY_HOPS=1
N8N_EDITOR_BASE_URL=${N8N_PUBLIC_URL}
WEBHOOK_URL=${N8N_PUBLIC_URL}/
```

### Temporary vs Named Cloudflare Tunnels

- **Quick Tunnels (`trycloudflare.com`)**: Ephemeral testing URLs generated by `npx cloudflared tunnel --url http://localhost:5678`. A new random URL is generated every time the tunnel restarts. Whenever restarted, update `N8N_PUBLIC_URL` and `VITE_N8N_URL` in your `.env`.
- **Named Cloudflare Tunnel (Recommended for Production)**: For permanent zero-maintenance setups, create a free named tunnel routed to a dedicated custom subdomain (e.g., `n8n.webtrionix.com`):
  ```bash
  cloudflared tunnel create n8n-prod
  cloudflared tunnel route dns n8n-prod n8n.webtrionix.com
  cloudflared tunnel run --url http://localhost:5678 n8n-prod
  ```

### Third-Party Cookie Restrictions & Long-Term Production Fix

- **Cross-Origin Iframe Limitation**: Even with `N8N_SAMESITE_COOKIE=none` and `N8N_SECURE_COOKIE=true`, privacy-preserving browsers (Apple Safari, Brave, Firefox Total Cookie Protection, and Google Chrome Incognito mode) block third-party cookies across differing domains (`webtrionix.com` embedding `trycloudflare.com`).
- **In-App Fallback**: If an iframe session cannot authenticate or stays blank after 10 seconds, the dashboard displays an inline **"Log in to n8n first"** fallback banner with a one-click button opening n8n in a new tab, followed by **"Reload iframe"**.
- **Server-to-Server Execution**: "Run Live Workflow" and automation buttons execute through the Express backend proxy using `X-N8N-API-KEY`, ensuring 100% operational reliability independent of browser cookie states.
- **Recommended Architecture**: In production, host n8n on the exact same registered domain as the dashboard (e.g., dashboard on `app.mydomain.com` and n8n on `n8n.mydomain.com` or reverse-proxied under `/n8n/`). Because both share the same base domain, cookies are treated as first-party and iframes remain 100% functional in all browsers.

---

## License
Apache-2.0
