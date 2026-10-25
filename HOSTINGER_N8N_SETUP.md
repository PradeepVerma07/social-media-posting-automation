# CI360 Hostinger & Local n8n Architecture & Deployment Guide

This guide details how your CI360 Automation Hub is configured to run:
1. **Frontend & Express Backend** hosted on **Hostinger** (Node.js 22 + React).
2. **Database (MySQL)** hosted on **Hostinger** (`u245050038_ci_db` or `u245050038_ci360`).
3. **n8n Orchestrator** running on **Localhost** (`http://localhost:5678`).

---

## 1. Architecture Overview

```
                      ┌───────────────────────────────────────────────┐
                      │             HOSTINGER CLOUD / WEB             │
                      │                                               │
                      │  https://ci-dashboard.webtrionix.com          │
                      │  ┌───────────────────┐ ┌───────────────────┐  │
                      │  │ React Frontend    │ │ Express API       │  │
                      │  │ (Vite SPA / dist) │ │ (server.js / ts)  │  │
                      │  └─────────┬─────────┘ └─────────┬─────────┘  │
                      │            │                     │            │
                      │            └────── /api/v1 ──────┘            │
                      │                          │                    │
                      │                          ▼                    │
                      │                  Hostinger MySQL              │
                      │                  (127.0.0.1:3306)             │
                      │            [u245050038_ci_db / ci360]         │
                      └──────────────────────────▲────────────────────┘
                                                 │
                                Outbound HTTPS   │ Remote MySQL (Port 3306)
                                 Polling / Claim │ (srv1398.hstgr.io)
                                                 │
                      ┌──────────────────────────┴────────────────────┐
                      │              LOCAL MACHINE (PC)               │
                      │                                               │
                      │  n8n Orchestrator (http://localhost:5678)     │
                      │  - master-publisher.json                      │
                      │  - error-handler.json                         │
                      │  - Social Platform Publisher nodes            │
                      └───────────────────────────────────────────────┘
```

---

## 2. Hostinger MySQL Setup

### A. Database Details
* **Database Name**: `u245050038_ci_db` (or `u245050038_ci360`)
* **Database User**: `u245050038_ci_db` (or `u245050038_ci360degrees`)
* **Internal Host (from Hostinger Node.js app)**: `127.0.0.1` (Port `3306`)
* **External Remote Host (from Local PC / n8n)**: `srv1398.hstgr.io` (Port `3306`)
* **Remote Access**: **Already Enabled** (`%` wildcard enabled).

### B. Import MySQL Schema
A complete MySQL 8 schema script has been generated at:
`database/schema.mysql.sql`

To import it into Hostinger:
1. Log in to [Hostinger hPanel](https://hpanel.hostinger.com).
2. Go to **Databases** -> Click **phpMyAdmin** next to `u245050038_ci_db`.
3. In phpMyAdmin, click the **Import** tab at the top.
4. Click **Choose File**, select `database/schema.mysql.sql` from your project folder.
5. Click **Go** at the bottom.
6. All 14 tables (`posts`, `social_accounts`, `brands`, `users`, `post_targets`, `notifications`, etc.) along with all initial data will be loaded instantly!

---

## 3. Hostinger Node.js Environment Variables

In Hostinger hPanel -> **Websites** -> **Manage** (`ci-dashboard.webtrionix.com`) -> **Node.js**:

Set the following Environment Variables:

| Variable | Recommended Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Enables optimized production mode |
| `PORT` | `3000` | Server listening port |
| `DB_HOST` | `127.0.0.1` | Hostinger local MySQL address |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `u245050038_ci_db` | Your Hostinger MySQL username |
| `DB_NAME` | `u245050038_ci_db` | Your Hostinger MySQL database |
| `DB_PASSWORD` | `<your-db-password>` | Your Hostinger MySQL password |
| `INTERNAL_API_SECRET` | `ci360_secure_token_vault_2026` | Secret key for internal/n8n communication |

---

## 4. How Local n8n Connects to Hostinger

You can connect local n8n to Hostinger using either method below:

### Method A: Outbound REST Polling (Zero Network Config Required)
* This is the easiest and most reliable method. n8n runs on your local machine and polls Hostinger via HTTPS.
* In your local n8n, open or import `n8n/workflows/master-publisher.json`.
* In n8n Environment Variables (or workflow parameters), set:
  ```env
  BACKEND_INTERNAL_URL=https://ci-dashboard.webtrionix.com
  INTERNAL_API_SECRET=ci360_secure_token_vault_2026
  ```
* Every 1 minute, n8n calls `https://ci-dashboard.webtrionix.com/internal/jobs/claim`, executes the publishing tasks to Facebook, Instagram, LinkedIn, etc., and posts the results back to `https://ci-dashboard.webtrionix.com/internal/jobs/result`.
* Because n8n initiates the outbound request, **no public IP, no router port forwarding, and no firewall configuration** is needed on your PC!

### Method B: Direct Remote MySQL in n8n
* In local n8n, create a **MySQL Credential**:
  * **Host**: `srv1398.hstgr.io`
  * **Port**: `3306`
  * **Database**: `u245050038_ci_db`
  * **User**: `u245050038_ci_db`
  * **Password**: `<your-db-password>`
* Use standard n8n MySQL nodes to query or update tables directly.

### Method C: Instant Webhooks via Free Tunnel
If you want the "Publish Now" button on the Hostinger dashboard to instantly trigger local n8n webhooks:
1. Run Cloudflare tunnel on your PC:
   ```bash
   npx cloudflared tunnel --url http://localhost:5678
   ```
2. Set the generated URL in Hostinger environment variables:
   ```env
   N8N_BASE_URL=https://your-tunnel-subdomain.trycloudflare.com
   ```

---

## 5. Health & Verification Check

Once deployed, you can verify your database and sync status anytime by visiting:
`https://ci-dashboard.webtrionix.com/api/v1/database/status`

Output response:
```json
{
  "status": "ok",
  "sqlite": {
    "active": true,
    "posts": 28,
    "users": 5,
    "brands": 1
  },
  "mysql": {
    "configured": true,
    "connected": true,
    "message": "Successfully connected to Hostinger MySQL",
    "host": "127.0.0.1",
    "database": "u245050038_ci_db",
    "port": 3306
  }
}
```
