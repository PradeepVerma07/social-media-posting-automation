# Hostinger Node.js Web App Deployment Guide

This guide details deploying the CI360 Automation Hub to Hostinger Shared Hosting or Cloud Hosting running Node.js Web Apps with MySQL 8.

---

## 1. Database Setup in Hostinger hPanel

1. Log in to your **Hostinger hPanel**.
2. Navigate to **Databases** -> **MySQL Databases**.
3. Create a new database:
   - Database Name: `u123456_ci360`
   - Database User: `u123456_admin`
   - Password: `[GENERATE_SECURE_PASSWORD]`
4. Open **phpMyAdmin** for the created database.
5. Click **Import** -> Select `database/schema.sql`.
6. Click **Import** -> Select `database/seeds.sql` to populate default roles and the initial Super Admin account.

---

## 2. Hostinger Node.js Configuration

1. In hPanel, navigate to **Websites** -> Select your domain -> **Node.js**.
2. Configure settings:
   - **Node.js Version**: Select `20.x` or `22.x LTS`.
   - **Application Mode**: `Production`
   - **Application Root**: `/home/u123456/public_html`
   - **Application Startup File**: `server.ts` or `server/dist/server.js`
   - **Application Port**: Hostinger assigns a port or forwards via passenger reverse proxy.
3. In **Environment Variables**, add:
   ```env
   NODE_ENV=production
   PORT=3000
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=u123456_ci360
   DB_USER=u123456_admin
   DB_PASSWORD=your_secure_password
   N8N_BASE_URL=https://n8n.yourdomain.com
   N8N_WEBHOOK_SECRET=your_32_character_hmac_secret
   ```

---

## 3. Build & Deploy Files

```bash
# In your local project or via SSH:
npm install
npm run build

# Upload the project root to /home/u123456/public_html:
# - dist/ (Compiled React frontend)
# - server/
# - server.ts
# - package.json
```

4. Click **Restart** in Hostinger's Node.js dashboard.
5. Visit `https://yourdomain.com` to access CI360 Automation Hub.
