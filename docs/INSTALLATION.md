# CI360 Automation Hub Installation Guide

Step-by-step setup guide for local development and self-hosted production servers.

---

## 1. Prerequisites

- **Node.js**: v20.x or v22.x LTS
- **npm**: v9.x or higher
- **MySQL**: 8.0+ (or MariaDB 10.6+)
- **Self-Hosted n8n Instance**: Running on accessible network/VPS

---

## 2. Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure your secrets:
```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=ci360_automation
DB_USER=root
DB_PASSWORD=your_password

N8N_BASE_URL=https://n8n.yourcompany.com
N8N_WEBHOOK_BASE_URL=https://n8n.yourcompany.com/webhook/ci360
N8N_WEBHOOK_SECRET=your_32_character_hmac_secret
```

---

## 3. Database Migration

Import schema and default development seeds into MySQL:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p ci360_automation < database/seeds.sql
```

---

## 4. Run Application

```bash
# Install dependencies
npm install

# Start development mode (Express API + Vite Dev Server on port 3000)
npm run dev
```

Open `http://localhost:3000` in your browser.

Default credentials:
- **Email**: `admin@ci360.internal`
- **Password**: `Admin@CI360#2026`
- **Role**: Super Admin
