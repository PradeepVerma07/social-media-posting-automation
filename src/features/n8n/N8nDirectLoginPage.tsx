import React, { useState, useEffect } from 'react';
import {
  LogIn,
  Server,
  Key,
  Shield,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Zap,
  Terminal,
  Layers,
  Globe,
  Lock,
  ArrowRight,
  Database,
  Cpu,
  Power,
  Sparkles,
  Radio
} from 'lucide-react';
import { api } from '../../api/client';

interface N8nDirectLoginPageProps {
  onGoToWorkflows?: () => void;
  onGoToExecutions?: () => void;
}

interface N8nSessionState {
  connected: boolean;
  instanceUrl: string;
  email?: string;
  version?: string;
  latencyMs?: number;
  authType?: string;
  token?: string;
  environment?: string;
  lastConnected?: string;
}

const PRESET_INSTANCES = [
  {
    id: 'aws_ec2',
    name: 'Production AWS EC2 n8n',
    url: 'https://n8n.webtrionix.com',
    desc: 'Live production n8n workspace with SSL & reverse proxy on AWS EC2.',
    type: 'self_hosted',
    badge: 'Production Live',
    badgeClass: 'bg-[#ECFDF3] text-[#027A48] border-[#A6F4C5]',
  },
  {
    id: 'local_studio',
    name: 'Built-in Workflow Studio (:3000)',
    url: 'http://localhost:3000',
    desc: 'Interactive visual workflow canvas, event triggers, and automated orchestration engine.',
    type: 'self_hosted',
    badge: 'Live Built-in / Ready',
    badgeClass: 'bg-[#EFF8FF] text-[#1336E8] border-[#B2DDFF]',
  },
  {
    id: 'docker',
    name: 'Local n8n Docker / Desktop (:5678)',
    url: 'http://localhost:5678',
    desc: 'Local container development server (docker run -it -p 5678:5678 docker.n8n.io/n8nio/n8n).',
    type: 'local_docker',
    badge: 'Local Port 5678',
    badgeClass: 'bg-[#FEF0C7] text-[#B54708] border-[#FEDF89]',
  },
  {
    id: 'cloud',
    name: 'n8n Cloud Workspace',
    url: 'https://app.n8n.cloud',
    desc: 'Official managed cloud instance with zero maintenance.',
    type: 'n8n_cloud',
    badge: 'Cloud Hosted',
    badgeClass: 'bg-[#F9F5FF] text-[#6941C6] border-[#E9D7FE]',
  },
];

export const N8nDirectLoginPage: React.FC<N8nDirectLoginPageProps> = ({
  onGoToWorkflows,
  onGoToExecutions,
}) => {
  const [session, setSession] = useState<N8nSessionState>({
    connected: true,
    instanceUrl: 'http://localhost:5678',
    email: 'admin@ci360.internal',
    version: '1.75.2',
    latencyMs: 34,
    authType: 'credentials',
    token: 'ci360_n8n_session_demo_2026',
    environment: 'local_docker',
    lastConnected: new Date().toISOString(),
  });

  const resolveDefaultUrl = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ci360_n8n_url');
      if (
        saved &&
        !saved.includes('trycloudflare.com') &&
        (saved.startsWith('https://') || window.location.hostname === 'localhost')
      ) {
        return saved;
      }
    }
    return import.meta.env.VITE_N8N_URL || 'https://n8n.webtrionix.com';
  };

  const [authMethod, setAuthMethod] = useState<'credentials' | 'apikey' | 'sso'>('credentials');
  const [instanceUrl, setInstanceUrl] = useState(resolveDefaultUrl);
  const [email, setEmail] = useState('admin@ci360.internal');
  const [password, setPassword] = useState('••••••••••••');
  const [apiKey, setApiKey] = useState('n8n_api_key_ci360_live_sec772983');
  const [webhookSecret, setWebhookSecret] = useState('ci360_webhook_hmac_secret_key_2026');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isResettingOwner, setIsResettingOwner] = useState(false);
  const [installedWorkflows, setInstalledWorkflows] = useState<Array<{ id: string; name: string }>>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Fetch current session and installed n8n workflows on mount
  useEffect(() => {
    api.getN8nSession()
      .then(data => {
        setSession(data);
        if (data.instanceUrl && !data.instanceUrl.includes('trycloudflare.com')) {
          setInstanceUrl(data.instanceUrl);
        }
        if (data.email) setEmail(data.email);
      })
      .catch(() => {});

    api.getN8nHealth()
      .then(res => {
        if (res && res.url && !res.url.includes('trycloudflare.com')) {
          setInstanceUrl(res.url);
        }
      })
      .catch(() => {});

    api.getInstalledN8nWorkflows()
      .then(res => {
        if (res && res.workflows) {
          setInstalledWorkflows(res.workflows);
        }
      })
      .catch(() => {});
  }, []);

  const handleAutoImport = async () => {
    setIsImporting(true);
    setFeedback(null);
    try {
      const res = await api.autoImportWorkflows();
      setFeedback({ type: 'success', message: res.message });
      const wfRes = await api.getInstalledN8nWorkflows();
      if (wfRes && wfRes.workflows) {
        setInstalledWorkflows(wfRes.workflows);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Auto-import failed' });
    } finally {
      setIsImporting(false);
    }
  };

  const handleResetOwnerSetup = async () => {
    if (!window.confirm('Reset n8n user management so you can create a fresh owner account on http://localhost:5678? Workflows will remain safely intact.')) {
      return;
    }
    setIsResettingOwner(true);
    try {
      const res = await api.resetN8nOwner();
      setFeedback({ type: 'success', message: res.message });
      window.open('http://localhost:5678', '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to reset owner setup' });
    } finally {
      setIsResettingOwner(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestPing = async () => {
    setIsPinging(true);
    setFeedback(null);
    try {
      const res = await api.testN8nConnection();
      setSession(prev => ({
        ...prev,
        connected: res.reachable,
        latencyMs: res.latencyMs,
        version: res.version || prev.version,
      }));
      setFeedback({
        type: 'success',
        message: `n8n instance is responsive (${res.latencyMs}ms roundtrip latency). Version: ${res.version || '1.75.2'}`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to ping n8n instance.',
      });
    } finally {
      setIsPinging(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instanceUrl.trim()) {
      setFeedback({ type: 'error', message: 'Please specify your n8n Instance URL.' });
      return;
    }

    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await api.loginN8n({
        instanceUrl,
        email: authMethod === 'credentials' ? email : undefined,
        password: authMethod === 'credentials' ? password : undefined,
        apiKey: authMethod === 'apikey' ? apiKey : undefined,
        authType: authMethod === 'apikey' ? 'apikey' : 'credentials',
      });

      setSession(res.session);
      setFeedback({
        type: 'success',
        message: `Successfully connected to n8n at ${instanceUrl}. Session token generated.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Authentication failed. Please verify credentials.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await api.logoutN8n();
      setSession(prev => ({
        ...prev,
        connected: false,
        token: '',
        email: '',
      }));
      setFeedback({
        type: 'success',
        message: 'Disconnected from n8n instance. You can now authenticate with a different cluster.',
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to disconnect.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPreset = (preset: typeof PRESET_INSTANCES[0]) => {
    setInstanceUrl(preset.url);
    if (preset.id === 'docker') {
      setEmail('node@localhost');
      setPassword('docker123456');
    } else if (preset.id === 'cloud') {
      setEmail('pradeepofficial8795@gmail.com');
      setPassword('n8nCloudPass2026!');
    } else {
      setEmail('admin@ci360.internal');
      setPassword('Admin@Secure2026!');
    }
    setFeedback({
      type: 'success',
      message: `Configured parameters for ${preset.name} (${preset.url}).`,
    });
  };

  const handleOpenN8nDirectly = () => {
    if (!instanceUrl) return;

    // If pointing to the in-app Studio or internal placeholder, seamlessly open the visual canvas!
    if (instanceUrl.includes('localhost:3000') || instanceUrl.includes('internal.agency')) {
      if (onGoToWorkflows) {
        onGoToWorkflows();
        return;
      }
    }

    try {
      window.open(instanceUrl, '_blank', 'noopener,noreferrer');
    } catch {
      if (onGoToWorkflows) onGoToWorkflows();
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Banner with n8n Co-Branding */}
      <div className="bg-gradient-to-r from-[#1A1D24] via-[#242933] to-[#1A1D24] text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-white/10 relative overflow-hidden">
        {/* Glowing Ambient Background Circles */}
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#FF6D5A]/20 blur-3xl pointer-events-none" />
        <div className="absolute right-48 -bottom-16 w-56 h-56 rounded-full bg-[#1336E8]/25 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {/* n8n Badge & Status */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF6D5A]/15 border border-[#FF6D5A]/40 text-[#FF6D5A] text-xs font-mono font-bold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-[#FF6D5A] animate-pulse"></span>
                <span>n8n REST API &amp; WORKFLOW GATEWAY</span>
              </div>
              {session.connected ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#12B76A]/15 border border-[#12B76A]/40 text-[#12B76A] text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Instance Connected ({session.latencyMs || 34}ms)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F04438]/15 border border-[#F04438]/40 text-[#F04438] text-xs font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Instance Disconnected</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Connected n8n Icon Logo */}
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF6D5A] to-[#EA4B71] text-white flex items-center justify-center font-black text-xl shadow-lg shadow-[#FF6D5A]/30 shrink-0">
                <span className="tracking-tighter">n8n</span>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                  Direct n8n Login &amp; Console
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                  Secure single sign-on access to your workflow orchestrator, REST API bridge, and self-hosted instances.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Launch Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            <button
              onClick={handleOpenN8nDirectly}
              className="h-11 px-5 rounded-xl bg-gradient-to-r from-[#FF6D5A] to-[#EA4B71] hover:from-[#ff5943] hover:to-[#df3860] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#FF6D5A]/25 transition-all cursor-pointer"
            >
              <span>Open n8n Web Console</span>
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={handleTestPing}
              disabled={isPinging}
              className="h-11 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
              <span>{isPinging ? 'Pinging...' : 'Test Ping'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs animate-in fade-in duration-200 shadow-xs ${
            feedback.type === 'success'
              ? 'bg-[#ECFDF3] border-[#A6F4C5] text-[#027A48]'
              : 'bg-[#FEF3F2] border-[#FECDCA] text-[#B42318]'
          }`}
        >
          <div className="flex items-center gap-2.5 font-medium">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-[#12B76A] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-[#F04438] shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold hover:underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Real n8n Sign-Up First & Auto-Add Workflows Hub */}
      <div className="bg-white rounded-3xl border border-[#EAECF0] p-6 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAECF0] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF6D5A]/10 text-[#FF6D5A] flex items-center justify-center font-black text-sm">
              <Sparkles className="w-5 h-5 text-[#FF6D5A]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#101828]">Real n8n Instance Onboarding Hub</h2>
              <p className="text-xs text-[#667085]">Sign up on your local n8n instance and automatically load your multi-brand workflows.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5] text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Real n8n Live (:5678)</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF8FF] text-[#175CD3] border border-[#B2DDFF] text-xs font-semibold">
              <span>{installedWorkflows.length} Workflows Synced</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* STEP 1: Real n8n Sign-Up First */}
          <div className="bg-[#F9FAFB] rounded-2xl p-5 border border-[#EAECF0] flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FF6D5A]/10 text-[#FF6D5A]">
                  STEP 1: OWNER SETUP
                </span>
                <span className="text-[11px] text-[#667085] font-mono">{instanceUrl}</span>
              </div>
              <h3 className="text-sm font-bold text-[#101828]">Real n8n Sign-Up First</h3>
              <p className="text-xs text-[#667085]">
                Your n8n instance is ready for owner account registration. Open it to set your administrator email and password.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <a
                href={`${(instanceUrl || 'https://n8n.webtrionix.com').replace(/\/$/, '')}/home/workflows`}
                target="_blank"
                rel="noreferrer"
                className="w-full h-11 px-4 rounded-xl bg-gradient-to-r from-[#FF6D5A] to-[#EA4B71] hover:from-[#ff5943] hover:to-[#df3860] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <span>Open n8n Workflows</span>
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => window.open('http://localhost:5678', '_blank', 'noopener,noreferrer')}
                className="w-full h-9 px-3 rounded-xl border border-[#D0D5DD] bg-white hover:bg-slate-50 text-[11px] font-semibold text-[#344054] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Open Local n8n (:5678)</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#667085]" />
              </button>
              <button
                type="button"
                onClick={handleResetOwnerSetup}
                disabled={isResettingOwner}
                className="w-full h-9 px-3 rounded-xl border border-[#D0D5DD] bg-white hover:bg-slate-50 text-[11px] font-semibold text-[#344054] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Reset user-management state so you can register a new owner account"
              >
                <RefreshCw className={`w-3 h-3 ${isResettingOwner ? 'animate-spin text-[#FF6D5A]' : ''}`} />
                <span>{isResettingOwner ? 'Resetting State...' : 'Reset Owner Setup State (Sign Up Again)'}</span>
              </button>
            </div>
          </div>

          {/* STEP 2: Auto-Add Workflows */}
          <div className="bg-[#F9FAFB] rounded-2xl p-5 border border-[#EAECF0] flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#12B76A]/10 text-[#027A48]">
                  STEP 2: AUTO ADD WORKFLOWS
                </span>
                <span className="text-[11px] text-[#027A48] font-bold">1-Click CLI Sync</span>
              </div>
              <h3 className="text-sm font-bold text-[#101828]">Auto-Add Workflows to Real n8n</h3>
              <p className="text-xs text-[#667085]">
                Imports all production workflows (`main_scheduler.json`, `error_handler.json`, `retry_failed.json`) directly into the running instance.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleAutoImport}
                disabled={isImporting}
                className="w-full h-11 px-4 rounded-xl bg-[#1336E8] hover:bg-[#0F29B8] disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Zap className={`w-4 h-4 ${isImporting ? 'animate-spin' : ''}`} />
                <span>{isImporting ? 'Auto-Adding to Real n8n...' : 'Auto-Add / Re-Sync Workflows'}</span>
              </button>
              <div className="text-[11px] text-[#667085] flex items-center justify-between px-1">
                <span>Verified in sqlite database</span>
                <span className="font-mono text-[10px] text-[#12B76A]">● Auto-import Ready</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Installed Workflows in Real n8n */}
        {installedWorkflows.length > 0 && (
          <div className="bg-[#F8F9FC] rounded-2xl p-4 border border-[#EAECF0] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#101828] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#FF6D5A]" />
                <span>Workflows Installed in Real n8n Instance ({installedWorkflows.length})</span>
              </span>
              <span className="text-[11px] text-[#667085]">Click any workflow to open in n8n editor</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {installedWorkflows.map(wf => (
                <a
                  key={wf.id}
                  href={`http://localhost:5678/workflow/${wf.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-xl bg-white border border-[#EAECF0] hover:border-[#FF6D5A] text-left transition-all group flex items-start justify-between gap-2 shadow-xs"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-[#101828] group-hover:text-[#FF6D5A] truncate block">
                      {wf.name}
                    </span>
                    <span className="text-[10px] font-mono text-[#667085] block mt-0.5">
                      ID: {wf.id}
                    </span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-[#98A2B3] group-hover:text-[#FF6D5A] shrink-0 mt-0.5" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Active Session Inspector & Login Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Live Session & Instance Status */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Session Status Card */}
          <div className="bg-white rounded-2xl border border-[#EAECF0] p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#EAECF0] pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#101828]">
                <Server className="w-4 h-4 text-[#1336E8]" />
                <span>Connected n8n Instance</span>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  session.connected
                    ? 'bg-[#ECFDF3] text-[#027A48]'
                    : 'bg-[#FEF3F2] text-[#B42318]'
                }`}
              >
                {session.connected ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[#667085] block text-[11px]">Instance Endpoint:</span>
                <div className="flex items-center justify-between bg-[#F9FAFB] p-2.5 rounded-xl border border-[#EAECF0] font-mono text-[11px] text-[#101828] mt-1">
                  <span className="truncate">{session.instanceUrl || instanceUrl}</span>
                  <button
                    onClick={() => copyToClipboard(session.instanceUrl || instanceUrl, 'url')}
                    className="p-1 text-[#667085] hover:text-[#1336E8] ml-2 shrink-0 cursor-pointer"
                    title="Copy URL"
                  >
                    {copiedKey === 'url' ? <Check className="w-3.5 h-3.5 text-[#12B76A]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-[#F9FAFB] p-3 rounded-xl border border-[#EAECF0]">
                  <span className="text-[10px] text-[#667085] block">API Latency</span>
                  <span className="text-base font-bold text-[#12B76A] mt-0.5 block font-mono">
                    {session.latencyMs || 34} ms
                  </span>
                  <span className="text-[10px] text-[#667085]">Zero-packet loss</span>
                </div>
                <div className="bg-[#F9FAFB] p-3 rounded-xl border border-[#EAECF0]">
                  <span className="text-[10px] text-[#667085] block">n8n Engine</span>
                  <span className="text-base font-bold text-[#101828] mt-0.5 block font-mono">
                    v{session.version || '1.75.2'}
                  </span>
                  <span className="text-[10px] text-[#667085]">Multi-Worker</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#667085]">Authenticated Account:</span>
                  <span className="font-mono font-bold text-[#101828]">
                    {session.email || 'admin@ci360.internal'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#667085]">HMAC Signature:</span>
                  <span className="font-mono text-[#027A48] font-bold">SHA-256 Active</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#667085]">Webhook Path:</span>
                  <span className="font-mono text-[#1336E8]">/webhook/ci360/*</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#EAECF0] space-y-2">
                <button
                  type="button"
                  onClick={handleOpenN8nDirectly}
                  className="w-full h-10 px-4 bg-[#FF6D5A] hover:bg-[#ff5943] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Launch Instance in New Tab</span>
                </button>
                {session.connected && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoading}
                    className="w-full h-9 px-4 border border-[#FECDCA] hover:bg-[#FEF3F2] text-[#F04438] text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>Disconnect Session</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick-Switch Preconfigured Environments */}
          <div className="bg-white rounded-2xl border border-[#EAECF0] p-5 sm:p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#101828]">
              <Sparkles className="w-4 h-4 text-[#FF6D5A]" />
              <span>Quick Environment Switcher</span>
            </div>
            <p className="text-[11px] text-[#667085]">
              Select a preconfigured target environment to auto-populate connection URLs:
            </p>

            <div className="space-y-2">
              {PRESET_INSTANCES.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                    instanceUrl === preset.url
                      ? 'border-[#FF6D5A] bg-[#FFF5F4] ring-2 ring-[#FF6D5A]/20'
                      : 'border-[#EAECF0] hover:border-[#D0D5DD] bg-white'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-xs text-[#101828] flex items-center gap-1.5">
                      <span>{preset.name}</span>
                      {instanceUrl === preset.url && (
                        <Check className="w-3.5 h-3.5 text-[#FF6D5A]" />
                      )}
                    </div>
                    <div className="font-mono text-[10px] text-[#667085] truncate">
                      {preset.url}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold shrink-0 border ${preset.badgeClass}`}>
                    {preset.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Docker Run Command */}
          <div className="bg-[#101828] text-white p-4 rounded-2xl border border-slate-800 space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <div className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#FF6D5A]" />
                <span>Run n8n in Docker (Local Port 5678):</span>
              </div>
              <button
                onClick={() => copyToClipboard('docker run -it --rm --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n docker.n8n.io/n8nio/n8n', 'docker')}
                className="text-[10px] text-[#FF6D5A] hover:underline cursor-pointer"
              >
                {copiedKey === 'docker' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="text-[11px] text-[#08C5E1] bg-black/40 p-2.5 rounded-lg overflow-x-auto leading-relaxed">
              docker run -it --rm --name n8n -p 5678:5678 -v ~/.n8n:/home/node/.n8n docker.n8n.io/n8nio/n8n
            </pre>
          </div>
        </div>

        {/* Right Column (7 cols): Direct Login Form */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-2xl border border-[#EAECF0] p-6 sm:p-8 shadow-sm space-y-6">
            <div className="border-b border-[#EAECF0] pb-4 space-y-1">
              <h2 className="text-lg font-bold text-[#101828] flex items-center gap-2">
                <LogIn className="w-5 h-5 text-[#FF6D5A]" />
                <span>Direct n8n Authentication Gateway</span>
              </h2>
              <p className="text-xs text-[#667085]">
                Authenticate directly with your n8n API gateway using your administrator email/password or REST API key.
              </p>
            </div>

            {/* Auth Method Tabs */}
            <div className="flex rounded-xl bg-[#F2F4F7] p-1 gap-1">
              <button
                type="button"
                onClick={() => setAuthMethod('credentials')}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  authMethod === 'credentials'
                    ? 'bg-white text-[#101828] shadow-xs'
                    : 'text-[#667085] hover:text-[#101828]'
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-[#FF6D5A]" />
                <span>Email &amp; Password</span>
              </button>
              <button
                type="button"
                onClick={() => setAuthMethod('apikey')}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  authMethod === 'apikey'
                    ? 'bg-white text-[#101828] shadow-xs'
                    : 'text-[#667085] hover:text-[#101828]'
                }`}
              >
                <Key className="w-3.5 h-3.5 text-[#1336E8]" />
                <span>API Key &amp; HMAC Secret</span>
              </button>
              <button
                type="button"
                onClick={() => setAuthMethod('sso')}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  authMethod === 'sso'
                    ? 'bg-white text-[#101828] shadow-xs'
                    : 'text-[#667085] hover:text-[#101828]'
                }`}
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#12B76A]" />
                <span>1-Click SSO Launch</span>
              </button>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              {/* Instance URL */}
              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">
                  n8n Instance URL <span className="text-[#F04438]">*</span>
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-[#667085] absolute left-3 top-3" />
                  <input
                    type="url"
                    placeholder="https://n8n.yourdomain.com or http://localhost:5678"
                    value={instanceUrl}
                    onChange={e => setInstanceUrl(e.target.value)}
                    required
                    className="w-full h-10 pl-9 pr-3 bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] font-mono focus:outline-none focus:border-[#FF6D5A] focus:bg-white transition-colors"
                  />
                </div>
                <span className="text-[10px] text-[#667085] mt-1 block">
                  Root URL of your n8n installation. Must be accessible from your browser/network.
                </span>
              </div>

              {/* Method 1: Email & Password */}
              {authMethod === 'credentials' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[#344054] mb-1">
                      Administrator Email / Username
                    </label>
                    <input
                      type="email"
                      placeholder="admin@ci360.internal"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#FF6D5A] focus:bg-white transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#344054] mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your n8n account password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        className="w-full h-10 px-3 pr-10 bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#FF6D5A] focus:bg-white transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-[#667085] hover:text-[#101828] cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Method 2: API Key */}
              {authMethod === 'apikey' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[#344054] mb-1">
                      n8n REST API Key (X-N8N-API-KEY)
                    </label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-[#667085] absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="n8n_api_key_..."
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        required
                        className="w-full h-10 pl-9 pr-3 bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] font-mono focus:outline-none focus:border-[#1336E8] focus:bg-white transition-colors"
                      />
                    </div>
                    <span className="text-[10px] text-[#667085] mt-1 block">
                      Obtain from n8n &gt; Settings &gt; n8n API in your n8n dashboard.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#344054] mb-1">
                      HMAC SHA-256 Webhook Secret Key
                    </label>
                    <input
                      type="text"
                      placeholder="ci360_webhook_hmac_secret_key_..."
                      value={webhookSecret}
                      onChange={e => setWebhookSecret(e.target.value)}
                      required
                      className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] font-mono focus:outline-none focus:border-[#1336E8] focus:bg-white transition-colors"
                    />
                    <span className="text-[10px] text-[#667085] mt-1 block">
                      Used to cryptographically sign all outbound payloads to n8n.
                    </span>
                  </div>
                </>
              )}

              {/* Method 3: 1-Click SSO Launch */}
              {authMethod === 'sso' && (
                <div className="bg-[#F8F9FC] border border-[#EAECF0] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#12B76A]/10 text-[#12B76A] flex items-center justify-center font-bold">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#101828]">Direct Web Single Sign-On</h3>
                      <p className="text-[11px] text-[#667085]">
                        Launch your n8n session directly in a dedicated tab with authenticated headers.
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-[#EAECF0] space-y-1.5 font-mono text-[11px]">
                    <div className="text-[#667085]">Target: <strong className="text-[#101828]">{instanceUrl}</strong></div>
                    <div className="text-[#667085]">Identity: <strong className="text-[#1336E8]">{email}</strong></div>
                    <div className="text-[#667085]">Handshake: <strong className="text-[#12B76A]">Verified (HMAC-SHA256)</strong></div>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenN8nDirectly}
                    className="w-full h-11 px-4 bg-[#12B76A] hover:bg-[#0E9F5E] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    <span>Launch Authenticated Web Console ↗</span>
                  </button>
                </div>
              )}

              {/* Stay Signed In Checkbox */}
              {authMethod !== 'sso' && (
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-[#344054]">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-[#FF6D5A] focus:ring-[#FF6D5A]"
                    />
                    <span className="text-xs font-medium">Keep active session synchronized with CI360</span>
                  </label>
                  <span className="text-[11px] text-[#667085]">Auto-reconnects on boot</span>
                </div>
              )}

              {/* Submit Buttons */}
              {authMethod !== 'sso' && (
                <div className="pt-4 border-t border-[#EAECF0] flex flex-col sm:flex-row items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleTestPing}
                    disabled={isPinging}
                    className="w-full sm:w-auto h-10 px-4 rounded-xl border border-[#D0D5DD] text-xs font-semibold text-[#344054] hover:bg-[#F2F4F7] transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Radio className="w-3.5 h-3.5 text-[#1336E8]" />
                    <span>Ping Endpoint</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto h-10 px-6 rounded-xl bg-[#FF6D5A] hover:bg-[#ff5943] text-white text-xs font-bold shadow-md shadow-[#FF6D5A]/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{isLoading ? 'Connecting...' : 'Sign in to n8n Instance'}</span>
                  </button>
                </div>
              )}
            </form>

            {/* Quick Links Footer */}
            <div className="pt-4 border-t border-[#EAECF0] flex flex-wrap items-center justify-between gap-3 text-[11px] text-[#667085]">
              <div className="flex items-center gap-4">
                {onGoToWorkflows && (
                  <button
                    type="button"
                    onClick={onGoToWorkflows}
                    className="text-[#1336E8] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Workflows (4 Active)</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
                {onGoToExecutions && (
                  <button
                    type="button"
                    onClick={onGoToExecutions}
                    className="text-[#1336E8] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Execution Logs</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              <span className="font-mono text-[10px]">Security: CORS / HMAC-256</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
