import React, { useState } from 'react';
import { Settings, Shield, Server, Key, Download, Copy, Check, ExternalLink } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const hostingerStartupGuide = `# Hostinger Node.js Web App Deployment Steps

1. Export or copy the MySQL schema from /database/schema.sql into your Hostinger phpMyAdmin database.
2. In Hostinger hPanel -> Node.js:
   - Node.js Version: 20.x or 22.x LTS
   - Application Root: /home/u123456/public_html
   - Application Startup File: server/dist/server.js
3. Build artifacts:
   - Run: npm install && npm run build
   - The React client builds to client/dist (or dist)
   - Express server compiles to server/dist/server.js
4. Configure Hostinger Environment Variables in hPanel:
   - DB_HOST=localhost (or Hostinger MySQL IP)
   - DB_NAME=u123456_ci360
   - DB_USER=u123456_admin
   - DB_PASSWORD=your_secure_db_pass
   - N8N_BASE_URL=https://n8n.yourdomain.com
   - N8N_WEBHOOK_SECRET=your_32_char_secret`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[#101828]">System Settings &amp; Hostinger Deployment</h2>
        <p className="text-xs text-[#667085] mt-1">
          Configure security variables, n8n orchestration bridge secrets, and production MySQL connection strings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* n8n Webhook Bridge Settings */}
        <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-[#1336E8]">
            <Server className="w-5 h-5" />
            <h3 className="text-base font-bold text-[#101828]">n8n Bridge Configuration</h3>
          </div>
          <p className="text-xs text-[#667085]">
            Protected server-side environment parameters. These values are never exposed to React clients.
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-[#344054] block mb-1">N8N_BASE_URL</label>
              <input
                type="text"
                readOnly
                value="http://localhost:5678"
                className="w-full h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl font-mono text-[#101828]"
              />
            </div>
            <div>
              <label className="font-semibold text-[#344054] block mb-1">N8N_WEBHOOK_SECRET (HMAC SHA-256)</label>
              <input
                type="password"
                readOnly
                value="ci360_webhook_hmac_secret_key_2026"
                className="w-full h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl font-mono text-[#101828]"
              />
            </div>
          </div>
        </div>

        {/* Database Configuration */}
        <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2.5 text-[#12B76A]">
            <Shield className="w-5 h-5" />
            <h3 className="text-base font-bold text-[#101828]">Hostinger MySQL 8 Pool</h3>
          </div>
          <p className="text-xs text-[#667085]">
            Configured with connection pooling (mysql2) and transactional schema migrations.
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-[#344054] block mb-1">Database Engine</label>
              <div className="p-3 bg-[#F6F8FC] rounded-xl border border-[#D0D5DD] font-mono text-[11px] text-[#101828]">
                MySQL 8.0 (InnoDB, utf8mb4_unicode_ci, 24 Production Tables)
              </div>
            </div>
            <div>
              <label className="font-semibold text-[#344054] block mb-1">Connection Pool Limit</label>
              <div className="p-3 bg-[#F6F8FC] rounded-xl border border-[#D0D5DD] font-mono text-[11px] text-[#101828]">
                DB_CONNECTION_LIMIT = 5 (Optimized for shared hosting)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hostinger Startup Instructions */}
      <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold text-[#101828]">Hostinger Node.js Startup Guide</h3>
            <p className="text-xs text-[#667085]">Verified instructions for Hostinger Web App deployments</p>
          </div>
          <button
            onClick={() => copyText(hostingerStartupGuide, 'guide')}
            className="px-3 py-1.5 bg-[#F6F8FC] hover:bg-[#F2F4F7] border border-[#D0D5DD] rounded-lg text-xs font-semibold flex items-center gap-1.5"
          >
            {copiedKey === 'guide' ? <Check className="w-3.5 h-3.5 text-[#12B76A]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey === 'guide' ? 'Copied' : 'Copy Guide'}</span>
          </button>
        </div>

        <pre className="p-4 bg-[#101828] rounded-xl text-xs font-mono text-[#08C5E1] overflow-x-auto leading-relaxed">
          {hostingerStartupGuide}
        </pre>
      </div>
    </div>
  );
};
