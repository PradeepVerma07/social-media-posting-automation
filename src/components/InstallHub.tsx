import React, { useState } from 'react';
import {
  Terminal,
  Server,
  Cloud,
  Layers,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  KeyRound,
  FileCode,
  Radio,
  Send,
  AlertCircle
} from 'lucide-react';

interface InstallHubProps {
  onOpenWorkflow: () => void;
}

export const InstallHub: React.FC<InstallHubProps> = ({ onOpenWorkflow }) => {
  const [activeTab, setActiveTab] = useState<'docker' | 'npm' | 'cloud' | 'tunnel' | 'connect'>('docker');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Docker generator state
  const [dbType, setDbType] = useState<'sqlite' | 'postgres'>('postgres');
  const [port, setPort] = useState('5678');
  const [domain, setDomain] = useState('n8n.example.com');
  const [timezone, setTimezone] = useState('UTC');
  const [encryptionKey, setEncryptionKey] = useState('a9f4c82b1d3e5f7a0c9e8d7b6a5c4e3f');
  const [enablePruning, setEnablePruning] = useState(true);

  // Instance Connector State
  const [testInstanceUrl, setTestInstanceUrl] = useState('http://localhost:5678');
  const [testWebhookUrl, setTestWebhookUrl] = useState('');
  const [pingStatus, setPingStatus] = useState<'idle' | 'checking' | 'reachable' | 'unreachable'>('idle');
  const [pingMessage, setPingMessage] = useState('');
  const [webhookSendStatus, setWebhookSendStatus] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const regenerateKey = () => {
    const chars = '0123456789abcdef';
    let key = '';
    for (let i = 0; i < 32; i++) {
      key += chars[Math.floor(Math.random() * chars.length)];
    }
    setEncryptionKey(key);
  };

  const dockerOneLiner = `docker run -d --name n8n \\
  -p ${port}:5678 \\
  -e N8N_ENCRYPTION_KEY="${encryptionKey}" \\
  -e GENERIC_TIMEZONE="${timezone}" \\
  -e N8N_DIAGNOSTICS_ENABLED="false" \\
  -v n8n_data:/home/node/.n8n \\
  docker.n8n.io/n8nio/n8n`;

  const dockerComposeYml = dbType === 'postgres'
    ? `version: '3.8'

volumes:
  n8n_data:
  postgres_data:

services:
  postgres:
    image: postgres:16-alpine
    container_name: n8n-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_USER=n8n
      - POSTGRES_PASSWORD=n8n_secure_pass_replace_me
      - POSTGRES_DB=n8n
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -h localhost -U n8n -d n8n']
      interval: 5s
      timeout: 5s
      retries: 10

  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    container_name: n8n-server
    restart: unless-stopped
    ports:
      - "${port}:5678"
    environment:
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=n8n_secure_pass_replace_me
      - N8N_ENCRYPTION_KEY=${encryptionKey}
      - GENERIC_TIMEZONE=${timezone}
      - WEBHOOK_URL=https://${domain}/
      - EXECUTIONS_DATA_PRUNE=${enablePruning ? 'true' : 'false'}
      - EXECUTIONS_DATA_MAX_AGE=168
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      postgres:
        condition: service_healthy`
    : `version: '3.8'

volumes:
  n8n_data:

services:
  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    container_name: n8n-server
    restart: unless-stopped
    ports:
      - "${port}:5678"
    environment:
      - N8N_ENCRYPTION_KEY=${encryptionKey}
      - GENERIC_TIMEZONE=${timezone}
      - WEBHOOK_URL=https://${domain}/
      - EXECUTIONS_DATA_PRUNE=${enablePruning ? 'true' : 'false'}
      - EXECUTIONS_DATA_MAX_AGE=168
    volumes:
      - n8n_data:/home/node/.n8n`;

  const handlePingInstance = async () => {
    setPingStatus('checking');
    setPingMessage('Testing connection to ' + testInstanceUrl + '...');
    try {
      const cleanUrl = testInstanceUrl.replace(/\/+$/, '');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      // Attempt healthz check or direct probe
      await fetch(`${cleanUrl}/healthz`, {
        mode: 'no-cors',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      setPingStatus('reachable');
      setPingMessage(`Connected! Host at ${cleanUrl} is responding.`);
    } catch (err: any) {
      setPingStatus('unreachable');
      setPingMessage(`Could not establish direct browser connection to ${testInstanceUrl}. Check if n8n is running and CORS allows local traffic.`);
    }
  };

  const handleSendTestWebhook = async () => {
    if (!testWebhookUrl) return;
    setWebhookSendStatus('Sending payload...');
    try {
      await fetch(testWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'n8n Workflow Studio',
          testEvent: 'manual_verification',
          timestamp: new Date().toISOString(),
          status: 'verified',
        }),
        mode: 'no-cors',
      });
      setWebhookSendStatus('Webhook dispatched! Check your n8n execution log.');
      setTimeout(() => setWebhookSendStatus(null), 4000);
    } catch (err: any) {
      setWebhookSendStatus('Dispatch attempted. If endpoint is active, payload has arrived.');
      setTimeout(() => setWebhookSendStatus(null), 4000);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Installation Banner */}
      <div className="border border-slate-800 bg-slate-900/60 backdrop-blur-sm p-6 sm:p-8 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-mono text-[#ff6d5a]">
            <span>OFFICIAL N8N DEPLOYMENT</span>
            <span>·</span>
            <span>SELF-HOSTED GUIDE</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Install & Deploy n8n Workflow Automation
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Choose your preferred deployment method below: generate ready-to-run Docker Compose setups,
            execute global npm commands, or trigger one-click cloud deployments. You can also build and test
            workflows in our integrated canvas right now.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch gap-3 shrink-0">
          <button
            onClick={onOpenWorkflow}
            className="px-5 py-2.5 bg-[#ff6d5a] hover:bg-[#ea503c] text-white font-medium text-sm rounded-lg transition-colors shadow-lg shadow-[#ff6d5a]/20 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <Layers className="w-4 h-4" />
            Launch Visual Builder
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('docker')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'docker'
              ? 'bg-slate-800 text-white border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Server className="w-4 h-4 text-[#ff6d5a]" />
          Docker & Compose Generator
        </button>
        <button
          onClick={() => setActiveTab('npm')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'npm'
              ? 'bg-slate-800 text-white border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Terminal className="w-4 h-4 text-emerald-400" />
          npm CLI Quickstart
        </button>
        <button
          onClick={() => setActiveTab('cloud')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'cloud'
              ? 'bg-slate-800 text-white border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Cloud className="w-4 h-4 text-sky-400" />
          Cloud 1-Click Hosting
        </button>
        <button
          onClick={() => setActiveTab('tunnel')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'tunnel'
              ? 'bg-slate-800 text-white border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Radio className="w-4 h-4 text-amber-400" />
          Webhook Tunnels
        </button>
        <button
          onClick={() => setActiveTab('connect')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'connect'
              ? 'bg-slate-800 text-white border border-slate-700'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Radio className="w-4 h-4 text-purple-400" />
          Live Instance Tester
        </button>
      </div>

      {/* Tab: Docker & Docker Compose */}
      {activeTab === 'docker' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-6 border border-slate-800 bg-slate-900/50 p-6 rounded-xl">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-white">Configuration Parameters</h3>
              <p className="text-xs text-slate-400 mt-1">
                Customize your self-hosted n8n environment variables.
              </p>
            </div>

            {/* Database Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Database Engine</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDbType('postgres')}
                  className={`p-3 text-left rounded-lg border text-xs font-medium transition-colors ${
                    dbType === 'postgres'
                      ? 'border-[#ff6d5a] bg-[#ff6d5a]/10 text-white'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="font-semibold text-slate-200">PostgreSQL (Prod)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">High reliability & scale</div>
                </button>
                <button
                  type="button"
                  onClick={() => setDbType('sqlite')}
                  className={`p-3 text-left rounded-lg border text-xs font-medium transition-colors ${
                    dbType === 'sqlite'
                      ? 'border-[#ff6d5a] bg-[#ff6d5a]/10 text-white'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="font-semibold text-slate-200">SQLite (Simple)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Zero config, single file</div>
                </button>
              </div>
            </div>

            {/* Port & Domain */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Host Port</label>
                <input
                  type="text"
                  value={port}
                  onChange={e => setPort(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#ff6d5a]"
                  placeholder="5678"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Timezone</label>
                <input
                  type="text"
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#ff6d5a]"
                  placeholder="UTC"
                />
              </div>
            </div>

            {/* Webhook Domain */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Public Domain / Webhook URL</label>
              <input
                type="text"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#ff6d5a]"
                placeholder="n8n.yourdomain.com"
              />
              <p className="text-[11px] text-slate-500">
                Used to generate valid incoming webhook trigger URLs.
              </p>
            </div>

            {/* Encryption Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">Encryption Key</label>
                <button
                  type="button"
                  onClick={regenerateKey}
                  className="text-[11px] text-[#ff6d5a] hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Generate New
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={encryptionKey}
                  onChange={e => setEncryptionKey(e.target.value)}
                  className="w-full px-3 py-2 pr-8 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#ff6d5a]"
                />
                <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2.5" />
              </div>
            </div>

            {/* Pruning Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                <span className="text-xs font-medium text-slate-300 block">Execution Data Pruning</span>
                <span className="text-[11px] text-slate-500">Auto-delete runs older than 7 days</span>
              </div>
              <input
                type="checkbox"
                checked={enablePruning}
                onChange={e => setEnablePruning(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-[#ff6d5a] focus:ring-0"
              />
            </div>
          </div>

          {/* Generated Code Column */}
          <div className="lg:col-span-7 space-y-6">
            {/* Quick One-Liner */}
            <div className="border border-slate-800 bg-slate-900/60 p-5 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#ff6d5a]" />
                  <span className="text-xs font-semibold text-slate-200">Instant Docker One-Liner</span>
                </div>
                <button
                  onClick={() => copyToClipboard(dockerOneLiner, 'docker-run')}
                  className="text-xs flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                >
                  {copiedKey === 'docker-run' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'docker-run' ? 'Copied' : 'Copy Command'}</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-3.5 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto border border-slate-800/80 leading-relaxed">
                {dockerOneLiner}
              </pre>
            </div>

            {/* docker-compose.yml */}
            <div className="border border-slate-800 bg-slate-900/60 p-5 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-[#ff6d5a]" />
                  <span className="text-xs font-semibold text-slate-200">docker-compose.yml</span>
                </div>
                <button
                  onClick={() => copyToClipboard(dockerComposeYml, 'compose')}
                  className="text-xs flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                >
                  {copiedKey === 'compose' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'compose' ? 'Copied' : 'Copy docker-compose.yml'}</span>
                </button>
              </div>
              <pre className="bg-slate-950 p-4 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto border border-slate-800/80 max-h-[380px] leading-relaxed">
                {dockerComposeYml}
              </pre>
              <div className="text-xs text-slate-400 flex items-center gap-2 pt-1">
                <span>Run with:</span>
                <code className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-slate-200 font-mono">
                  docker compose up -d
                </code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: npm CLI */}
      {activeTab === 'npm' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-slate-800 bg-slate-900/50 p-6 rounded-xl space-y-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <Terminal className="w-5 h-5" />
              <h3 className="text-base font-semibold text-white">npm Global Install (Recommended for Local Dev)</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              If you have Node.js 18.17+ or Node.js 20+ installed on your workstation, you can run n8n directly with npm.
            </p>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <span className="text-xs text-slate-400">1. Install n8n globally</span>
                <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono text-white">
                  <span>npm install -g n8n</span>
                  <button
                    onClick={() => copyToClipboard('npm install -g n8n', 'npm-install')}
                    className="text-slate-400 hover:text-white"
                  >
                    {copiedKey === 'npm-install' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-400">2. Launch n8n service</span>
                <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono text-white">
                  <span>n8n start</span>
                  <button
                    onClick={() => copyToClipboard('n8n start', 'npm-start')}
                    className="text-slate-400 hover:text-white"
                  >
                    {copiedKey === 'npm-start' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-400">3. Open editor in browser</span>
                <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-xs text-slate-300">
                  Navigate to <code className="text-[#ff6d5a] font-mono">http://localhost:5678</code>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-slate-800 bg-slate-900/50 p-6 rounded-xl space-y-4">
            <h3 className="text-base font-semibold text-white">Troubleshooting Common npm Errors</h3>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  EACCES / Permission Denied
                </div>
                <p className="text-slate-400 text-[11px]">
                  Avoid using sudo. Instead configure npm to use a user-owned directory:
                </p>
                <code className="block p-1.5 bg-slate-900 rounded font-mono text-[11px] text-slate-200">
                  mkdir ~/.npm-global && npm config set prefix '~/.npm-global'
                </code>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <div className="font-semibold text-slate-200">Node.js Compatibility</div>
                <p className="text-slate-400 text-[11px]">
                  n8n officially supports LTS versions of Node.js (v18, v20, and v22). Check your version with <code className="text-slate-200 font-mono">node -v</code>.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                <div className="font-semibold text-slate-200">Specify Custom Port & Tunnels</div>
                <code className="block p-1.5 bg-slate-900 rounded font-mono text-[11px] text-slate-200">
                  N8N_PORT=8080 n8n start --tunnel
                </code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Cloud 1-Click Hosting */}
      {activeTab === 'cloud' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-slate-800 bg-slate-900/50 p-6 rounded-xl flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-mono text-sky-400">PAAS / CLOUD CONTAINER</div>
              <h4 className="text-lg font-semibold text-white">Railway</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Deploy with PostgreSQL and persistent volume in 2 minutes. Free trial credits available.
              </p>
            </div>
            <a
              href="https://railway.app/template/n8n"
              target="_blank"
              rel="noreferrer"
              className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Deploy to Railway</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="border border-slate-800 bg-slate-900/50 p-6 rounded-xl flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-mono text-purple-400">MANAGED DROPLĒT</div>
              <h4 className="text-lg font-semibold text-white">DigitalOcean 1-Click</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Pre-configured droplet with Docker, Let's Encrypt SSL, and auto-renewing certificates.
              </p>
            </div>
            <a
              href="https://marketplace.digitalocean.com/apps/n8n"
              target="_blank"
              rel="noreferrer"
              className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Launch 1-Click Droplet</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="border border-slate-800 bg-slate-900/50 p-6 rounded-xl flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-mono text-[#ff6d5a]">OFFICIAL SAAS</div>
              <h4 className="text-lg font-semibold text-white">n8n Cloud</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Fully managed by n8n core engineers. Includes zero maintenance, automatic backups, and high availability.
              </p>
            </div>
            <a
              href="https://n8n.io/pricing/"
              target="_blank"
              rel="noreferrer"
              className="w-full py-2 px-4 bg-[#ff6d5a] hover:bg-[#ea503c] text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Start Free Cloud Trial</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Tab: Webhook Tunnels */}
      {activeTab === 'tunnel' && (
        <div className="border border-slate-800 bg-slate-900/50 p-6 rounded-xl space-y-6">
          <div>
            <h3 className="text-base font-semibold text-white">Forwarding Webhooks to Localhost</h3>
            <p className="text-xs text-slate-400 mt-1">
              External webhook triggers (Stripe, GitHub, Shopify, Slack) cannot call <code>http://localhost:5678</code> directly.
              Use a secure tunnel to expose your local instance to the internet.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Option A: Built-in n8n Tunnel</span>
                <span className="text-[11px] text-[#ff6d5a]">Simplest</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                n8n includes a free tunnel sub-service for development:
              </p>
              <pre className="p-3 bg-slate-900 rounded text-xs font-mono text-emerald-400 border border-slate-800">
                n8n start --tunnel
              </pre>
            </div>

            <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Option B: Cloudflare Tunnel</span>
                <span className="text-[11px] text-sky-400">Zero open ports</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Fast and free secure tunnel with persistent vanity URLs:
              </p>
              <pre className="p-3 bg-slate-900 rounded text-xs font-mono text-sky-300 border border-slate-800">
                cloudflared tunnel --url http://localhost:5678
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Live Instance Tester */}
      {activeTab === 'connect' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border border-slate-800 bg-slate-900/50 p-6 rounded-xl space-y-4">
            <h3 className="text-base font-semibold text-white">Ping Local or Remote Instance</h3>
            <p className="text-xs text-slate-300">
              Verify that your running n8n container or local server is reachable from this client.
            </p>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">n8n Instance URL</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={testInstanceUrl}
                    onChange={e => setTestInstanceUrl(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#ff6d5a]"
                    placeholder="http://localhost:5678"
                  />
                  <button
                    onClick={handlePingInstance}
                    disabled={pingStatus === 'checking'}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition-colors shrink-0 disabled:opacity-50"
                  >
                    {pingStatus === 'checking' ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>
              </div>

              {pingMessage && (
                <div
                  className={`p-3 rounded-lg border text-xs ${
                    pingStatus === 'reachable'
                      ? 'border-emerald-800/80 bg-emerald-950/40 text-emerald-300'
                      : pingStatus === 'checking'
                      ? 'border-slate-800 bg-slate-950 text-slate-300'
                      : 'border-amber-800/80 bg-amber-950/30 text-amber-300'
                  }`}
                >
                  {pingMessage}
                </div>
              )}
            </div>
          </div>

          <div className="border border-slate-800 bg-slate-900/50 p-6 rounded-xl space-y-4">
            <h3 className="text-base font-semibold text-white">Send Test Webhook to n8n</h3>
            <p className="text-xs text-slate-300">
              Fire a test event directly into your n8n Webhook node to check your workflow trigger.
            </p>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Webhook Test URL</label>
                <input
                  type="text"
                  value={testWebhookUrl}
                  onChange={e => setTestWebhookUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#ff6d5a]"
                  placeholder="https://n8n.yourdomain.com/webhook-test/34a7-b89c..."
                />
              </div>

              <button
                onClick={handleSendTestWebhook}
                disabled={!testWebhookUrl}
                className="w-full py-2.5 px-4 bg-[#ff6d5a] hover:bg-[#ea503c] disabled:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Dispatch Test Event
              </button>

              {webhookSendStatus && (
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300">
                  {webhookSendStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
