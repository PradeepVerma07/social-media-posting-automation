import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  Zap,
  TrendingUp,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Search,
  Wand2,
  Image as ImageIcon,
  Clock,
  ArrowRight,
  Eye,
  Layers,
  BarChart3,
  Flame,
  AlertCircle,
  Copy,
  Check,
  Instagram,
  Facebook,
  Linkedin,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  Plus
} from 'lucide-react';
import {
  api,
  AIStudioOverview,
  FeedAuditItem,
  InterceptedPostItem,
  CreativeVariantItem,
  CopyVariantItem
} from '../../api/client';
import { Post, Brand } from '../../../server/src/types';

interface AIStudioDashboardProps {
  posts?: Post[];
  brands?: Brand[];
  onNavigateToTab?: (tab: string) => void;
}

type StudioTab = 'overview' | 'intercept' | 'canvas' | 'feed-matrix';

export const AIStudioDashboard: React.FC<AIStudioDashboardProps> = ({
  posts = [],
  brands = [],
  onNavigateToTab
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>('overview');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [overview, setOverview] = useState<AIStudioOverview | null>(null);
  const [feedAudits, setFeedAudits] = useState<FeedAuditItem[]>([]);
  const [interceptQueue, setInterceptQueue] = useState<InterceptedPostItem[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New Audit Modal / Form state
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditPlatform, setAuditPlatform] = useState<string>('instagram');
  const [auditTitle, setAuditTitle] = useState<string>('');
  const [auditCaption, setAuditCaption] = useState<string>('');
  const [auditMediaUrl, setAuditMediaUrl] = useState<string>('');
  const [auditError, setAuditError] = useState<string | null>(null);

  // Gemini Canvas Studio state
  const [canvasMediaUrl, setCanvasMediaUrl] = useState<string>(
    'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=1200&q=80'
  );
  const [canvasTransformType, setCanvasTransformType] = useState<string>('reframe_9_16');
  const [canvasPrompt, setCanvasPrompt] = useState<string>('');
  const [isTransforming, setIsTransforming] = useState<boolean>(false);
  const [lastVariant, setLastVariant] = useState<CreativeVariantItem | null>(null);

  // Copy Polish state
  const [copyBaseText, setCopyBaseText] = useState<string>(
    'Our all-natural organic plant food booster gives indoor plants 2x faster leaf sprout without harsh chemicals.'
  );
  const [copyPlatform, setCopyPlatform] = useState<string>('instagram');
  const [copyGoal, setCopyGoal] = useState<string>('engagement');
  const [isPolishing, setIsPolishing] = useState<boolean>(false);
  const [copyVariants, setCopyVariants] = useState<CopyVariantItem[]>([]);

  // Load initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [ov, audits, queue] = await Promise.all([
        api.getAIOverview().catch(() => null),
        api.getFeedAudits('all').catch(() => ({ items: [] })),
        api.getInterceptQueue('all').catch(() => ({ items: [] })),
      ]);

      if (ov) setOverview(ov);
      if (audits?.items) setFeedAudits(audits.items);
      if (queue?.items) setInterceptQueue(queue.items);
    } catch (err) {
      console.error('Failed to load AI Studio data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Run deep audit on live post
  const handleRunAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditCaption.trim()) {
      setAuditError('Please enter caption text to evaluate.');
      return;
    }

    try {
      setIsAuditing(true);
      setAuditError(null);
      const result = await api.analyzeFeed({
        platform: auditPlatform,
        title: auditTitle.trim() || `${auditPlatform.toUpperCase()} Campaign Post`,
        caption: auditCaption.trim(),
        mediaUrl: auditMediaUrl.trim() || undefined,
      });

      setFeedAudits((prev) => [result, ...prev]);
      setAuditCaption('');
      setAuditTitle('');
      setAuditMediaUrl('');
      setActiveTab('feed-matrix');
    } catch (err: any) {
      setAuditError(err.message || 'Audit failed. Check API connection.');
    } finally {
      setIsAuditing(false);
    }
  };

  // 1-Click apply recommendation for intercepted post
  const handleApplyRecommendation = async (item: InterceptedPostItem) => {
    try {
      const res = await api.applyRecommendation({
        interceptId: item.interceptId,
        appliedCaption: item.suggestedCaption,
        appliedHashtags: item.suggestedHashtags,
        appliedTiming: item.suggestedTiming,
        status: 'approved',
      });

      if (res.success) {
        setInterceptQueue((prev) =>
          prev.map((q) =>
            q.interceptId === item.interceptId
              ? { ...q, status: 'approved', suggestedCaption: res.appliedCaption }
              : q
          )
        );
      }
    } catch (err: any) {
      alert('Failed to apply recommendation: ' + err.message);
    }
  };

  // Trigger Gemini Creative Transformation
  const handleTransformCreative = async () => {
    if (!canvasMediaUrl) return;
    try {
      setIsTransforming(true);
      const variant = await api.transformCreative({
        mediaUrl: canvasMediaUrl,
        transformType: canvasTransformType,
        prompt: canvasPrompt,
        aspectRatio: canvasTransformType === 'reframe_9_16' ? '9:16' : '1:1',
      });
      setLastVariant(variant);
    } catch (err: any) {
      alert('Transformation failed: ' + err.message);
    } finally {
      setIsTransforming(false);
    }
  };

  // Generate 3 Gemini Copy variants
  const handleGenerateCopyVariants = async () => {
    if (!copyBaseText.trim()) return;
    try {
      setIsPolishing(true);
      const res = await api.getCopyVariants({
        baseCaption: copyBaseText,
        platform: copyPlatform,
        audienceGoal: copyGoal,
      });
      if (res.variants) {
        setCopyVariants(res.variants);
      }
    } catch (err: any) {
      alert('Copy generation failed: ' + err.message);
    } finally {
      setIsPolishing(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram':
        return <Instagram className="w-4 h-4 text-pink-500" />;
      case 'facebook':
        return <Facebook className="w-4 h-4 text-blue-500" />;
      case 'linkedin':
        return <Linkedin className="w-4 h-4 text-sky-500" />;
      case 'whatsapp':
        return <MessageCircle className="w-4 h-4 text-emerald-500" />;
      default:
        return <Layers className="w-4 h-4 text-violet-400" />;
    }
  };

  const filteredAudits = selectedPlatform === 'all'
    ? feedAudits
    : feedAudits.filter((a) => a.platform.toLowerCase() === selectedPlatform.toLowerCase());

  return (
    <div className="min-h-screen bg-[#08070E] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Studio Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#170B28] via-[#100D22] to-[#0A1128] border border-violet-500/30 p-6 sm:p-8 shadow-[0_0_50px_rgba(139,92,246,0.15)]">
        <div className="absolute -right-10 -top-10 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-40 -bottom-10 w-60 h-60 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/70 border border-violet-500/40 text-xs font-semibold text-violet-300 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
              <span>CI360 AI Neural Studio & Predictive Feed Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Autonomous Social Intelligence Engine
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Multimodal pre-flight post interception, real-time feed auditing across Instagram, LinkedIn, Facebook & WhatsApp, and Google Gemini 2.0 creative enhancement.
            </p>
          </div>

          {/* Quick Engine Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-violet-400' : ''}`} />
              Sync Feeds
            </button>
            <button
              onClick={() => setActiveTab('canvas')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-900/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Wand2 className="w-3.5 h-3.5" />
              Open Gemini Canvas
            </button>
          </div>
        </div>

        {/* Engine Operational Status Badges */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-200 font-medium">Gemini 2.0 Flash:</span> Active
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span className="text-slate-200 font-medium">Pre-Flight Intercept Gate:</span> Armed
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-400" />
            <span className="text-slate-200 font-medium">n8n Orchestration Hook:</span> Connected
          </div>
          <div className="ml-auto font-mono text-[11px] text-slate-400">
            Last Synced: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Tab Navigation Pill Bar */}
      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[#120F1D] border border-white/10 w-fit overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'overview'
              ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Intelligence Hub
        </button>
        <button
          onClick={() => setActiveTab('intercept')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'intercept'
              ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Bot className="w-4 h-4" />
          Intercept Queue
          {overview?.interceptQueue?.pendingCount ? (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-pink-500 text-white font-bold animate-pulse">
              {overview.interceptQueue.pendingCount}
            </span>
          ) : null}
        </button>
        <button
          onClick={() => setActiveTab('canvas')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'canvas'
              ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Wand2 className="w-4 h-4" />
          Gemini Canvas Studio
        </button>
        <button
          onClick={() => setActiveTab('feed-matrix')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'feed-matrix'
              ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-md'
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          <Flame className="w-4 h-4" />
          Feed Performance Matrix
        </button>
      </div>

      {/* =========================================================================
          TAB 1: INTELLIGENCE HUB OVERVIEW
          ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metric Scorecards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-[#120F1D]/80 border border-violet-500/20 p-5 backdrop-blur-xl relative overflow-hidden group hover:border-violet-500/50 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Live Feed Health</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
                  Optimal
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{overview?.healthScore || 89}%</span>
                <span className="text-xs text-emerald-400 flex items-center font-medium">
                  <TrendingUp className="w-3 h-3 mr-0.5" /> +4.2%
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Linguistic hook resonance & visual quality benchmark across active accounts.
              </p>
              <div className="mt-3 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full"
                  style={{ width: `${overview?.healthScore || 89}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl bg-[#120F1D]/80 border border-violet-500/20 p-5 backdrop-blur-xl group hover:border-violet-500/50 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Avg Hook Score</span>
                <span className="p-1.5 rounded-lg bg-pink-500/10 text-pink-400">
                  <Zap className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{overview?.avgHookScore || 86}/100</span>
                <span className="text-xs text-slate-400">Top 10% tier</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                First 3-second scroll stop power evaluated by Gemini linguistic model.
              </p>
              <div className="mt-3 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-rose-400 rounded-full"
                  style={{ width: `${overview?.avgHookScore || 86}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl bg-[#120F1D]/80 border border-violet-500/20 p-5 backdrop-blur-xl group hover:border-violet-500/50 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Avg Visual Cohesion</span>
                <span className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400">
                  <ImageIcon className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">{overview?.avgVisualScore || 91}/100</span>
                <span className="text-xs text-emerald-400">+6.8%</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Color balance, typography hierarchy & branding recognition accuracy.
              </p>
              <div className="mt-3 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
                  style={{ width: `${overview?.avgVisualScore || 91}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl bg-[#120F1D]/80 border border-violet-500/20 p-5 backdrop-blur-xl group hover:border-violet-500/50 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Engagement Velocity</span>
                <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">
                  {overview?.avgEngagementVelocity || 2.1}x
                </span>
                <span className="text-xs text-sky-400">vs industry baseline</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                1st hour interaction velocity across Instagram, LinkedIn & WhatsApp.
              </p>
              <div className="mt-3 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-cyan-400 rounded-full"
                  style={{ width: '75%' }}
                />
              </div>
            </div>
          </div>

          {/* Platform Performance Benchmarks */}
          <div className="rounded-2xl bg-[#120F1D]/80 border border-white/10 p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-violet-400" />
                  Multi-Channel Algorithmic Benchmarks
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Cross-platform algorithmic resonance and engagement velocity per network.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('feed-matrix')}
                className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1"
              >
                View Full Matrix <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  platform: 'Instagram',
                  icon: <Instagram className="w-5 h-5 text-pink-500" />,
                  hook: 92,
                  visual: 90,
                  velocity: '2.4x',
                  status: 'Viral Reel / Story Outperforming',
                  color: 'from-pink-500/10 to-rose-500/10 border-pink-500/30',
                },
                {
                  platform: 'LinkedIn',
                  icon: <Linkedin className="w-5 h-5 text-sky-500" />,
                  hook: 88,
                  visual: 94,
                  velocity: '1.9x',
                  status: 'B2B Thought Leadership High Save Rate',
                  color: 'from-sky-500/10 to-blue-500/10 border-sky-500/30',
                },
                {
                  platform: 'Facebook',
                  icon: <Facebook className="w-5 h-5 text-blue-500" />,
                  hook: 81,
                  visual: 85,
                  velocity: '1.6x',
                  status: 'Community Comments Resonating',
                  color: 'from-blue-500/10 to-indigo-500/10 border-blue-500/30',
                },
                {
                  platform: 'WhatsApp',
                  icon: <MessageCircle className="w-5 h-5 text-emerald-500" />,
                  hook: 86,
                  visual: 90,
                  velocity: '2.8x',
                  status: 'Broadcast Status High CTR (34.5%)',
                  color: 'from-emerald-500/10 to-teal-500/10 border-emerald-500/30',
                },
              ].map((p) => (
                <div
                  key={p.platform}
                  className={`rounded-xl bg-gradient-to-br ${p.color} border p-4 transition-all hover:scale-[1.01]`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {p.icon}
                      <span className="font-bold text-white text-sm">{p.platform}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-300">{p.velocity}</span>
                  </div>
                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Hook Quality:</span>
                      <span className="font-bold text-white">{p.hook}/100</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Visual Score:</span>
                      <span className="font-bold text-white">{p.visual}/100</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10 text-[11px] text-slate-300 line-clamp-1">
                    {p.status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scheduled Intercept Gate Callout */}
          <div className="rounded-2xl bg-gradient-to-r from-violet-950/60 to-slate-900 border border-violet-500/30 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-violet-400 font-semibold text-xs">
                <Bot className="w-4 h-4" />
                Pre-Flight Intercept Gate Active
              </div>
              <h4 className="text-lg font-bold text-white">
                Scheduled Posts Intercepted Before Dispatch
              </h4>
              <p className="text-xs text-slate-400 max-w-xl">
                Every post scheduled from Content Calendar or Post Composer automatically runs through our ML virality scoring model before hitting n8n webhooks.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('intercept')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs shadow-lg shadow-violet-900/40 transition-all hover:scale-[1.02]"
            >
              Review Intercept Queue ({overview?.interceptQueue?.pendingCount || 0} Pending)
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: SCHEDULED INTERCEPT QUEUE
          ========================================================================= */}
      {activeTab === 'intercept' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-violet-400" />
                Pre-Flight Intercept Inspection Queue
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Scheduled posts evaluated against algorithmic engagement benchmarks before automated dispatch.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  // Trigger mock interception test post
                  api.interceptPost({
                    caption: 'Check out our new weekly product drop! Fresh seasonal plants now live.',
                    hashtags: '#plants #green #sale',
                    platform: 'instagram',
                    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
                  }).then((item) => {
                    setInterceptQueue((prev) => [item, ...prev]);
                  });
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Test Intercept Gate
              </button>
            </div>
          </div>

          {interceptQueue.length === 0 ? (
            <div className="rounded-2xl bg-[#120F1D]/80 border border-white/10 p-12 text-center space-y-3">
              <Bot className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No Posts Currently in Intercept Queue</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                When posts are scheduled in the Content Calendar or Post Composer, they will automatically appear here with AI recommendations before dispatch.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {interceptQueue.map((item) => (
                <div
                  key={item.interceptId}
                  className="rounded-2xl bg-[#120F1D]/80 border border-white/10 hover:border-violet-500/40 p-6 transition-all space-y-4"
                >
                  {/* Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md bg-violet-950/80 border border-violet-500/30 text-xs font-mono font-bold text-violet-300">
                        {item.interceptId}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          item.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                        }`}
                      >
                        {item.status === 'approved' ? 'Approved & Ready for Dispatch' : 'Pending AI Optimization'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">Virality Potential:</span>
                        <span className="font-extrabold text-white text-sm bg-violet-950/60 px-2 py-0.5 rounded border border-violet-500/30 text-pink-400">
                          {item.viralityScore}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">Resonance Index:</span>
                        <span className="font-extrabold text-white text-sm bg-sky-950/60 px-2 py-0.5 rounded border border-sky-500/30 text-sky-400">
                          {item.algorithmIndex}/100
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Side-by-Side Original vs AI Suggestion */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Original Scheduled Post */}
                    <div className="rounded-xl bg-[#090812] border border-white/5 p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                        <span>Original Scheduled Draft</span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {item.originalScheduledAt ? new Date(item.originalScheduledAt).toLocaleString() : 'Pending'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed font-normal bg-black/30 p-3 rounded-lg border border-white/5 min-h-[90px]">
                        {item.originalCaption}
                      </p>
                      {item.originalHashtags && (
                        <div className="text-[11px] text-slate-400 font-mono">
                          {item.originalHashtags}
                        </div>
                      )}
                    </div>

                    {/* AI Optimized Version */}
                    <div className="rounded-xl bg-gradient-to-br from-violet-950/30 to-pink-950/20 border border-violet-500/30 p-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-pink-300 font-semibold">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                          AI Neural studio Optimized
                        </span>
                        <span className="text-[11px] font-mono text-emerald-400 font-bold">
                          Optimal Time: {item.suggestedTiming ? new Date(item.suggestedTiming).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Optimal IST'}
                        </span>
                      </div>
                      <p className="text-xs text-white whitespace-pre-line leading-relaxed font-normal bg-black/40 p-3 rounded-lg border border-violet-500/20 min-h-[90px]">
                        {item.suggestedCaption}
                      </p>
                      {item.suggestedHashtags && (
                        <div className="text-[11px] text-pink-300 font-mono">
                          {item.suggestedHashtags}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actionable Improvements List */}
                  {item.improvementReasons && item.improvementReasons.length > 0 && (
                    <div className="rounded-xl bg-white/5 border border-white/5 p-3.5 space-y-2">
                      <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        Predicted Algorithmic Lift Factors:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {item.improvementReasons.map((reason, idx) => (
                          <div key={idx} className="text-xs bg-black/40 p-2.5 rounded-lg border border-white/5 space-y-1">
                            <div className="font-semibold text-violet-300 flex items-center justify-between">
                              <span>{reason.title}</span>
                              <span className="text-[10px] text-emerald-400 font-bold">{reason.impact}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-snug">{reason.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bottom Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button
                      onClick={() => {
                        setCanvasMediaUrl(
                          item.originalMediaUrl ||
                          'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=1200&q=80'
                        );
                        setActiveTab('canvas');
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 font-semibold"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      Refine Asset in Gemini Canvas
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(item.suggestedCaption, item.interceptId)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 font-medium transition-all"
                      >
                        {copiedId === item.interceptId ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy Optimized
                          </>
                        )}
                      </button>

                      {item.status !== 'approved' && (
                        <button
                          onClick={() => handleApplyRecommendation(item)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-md transition-all hover:scale-[1.02]"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Apply & Approve for Publish
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: GEMINI CANVAS STUDIO (MULTIMODAL CREATIVE & COPY)
          ========================================================================= */}
      {activeTab === 'canvas' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-pink-400" />
                Google Gemini Creative Multimodal Studio
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Direct in-module aspect-ratio reframing, studio inpainting, dynamic badge overlays and multi-variant copy polish.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Control Panel: Image & Transformation Settings */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl bg-[#120F1D]/80 border border-white/10 p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-violet-400" />
                  Multimodal Transformation Engine
                </h3>

                {/* Media URL Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Media Asset Source</label>
                  <input
                    type="url"
                    value={canvasMediaUrl}
                    onChange={(e) => setCanvasMediaUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                </div>

                {/* Transformation Preset Modes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Transformation Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'reframe_9_16', label: '1:1 ➔ 9:16 Reel Reframe', desc: 'Auto background expansion' },
                      { id: 'studio_light', label: 'Studio Lighting Inpaint', desc: 'Warmer bokeh & highlight' },
                      { id: 'badge_overlay', label: 'Badge & Headline Overlay', desc: 'High-CTR banner badge' },
                      { id: 'ab_variant', label: 'A/B Test Multi-Variant', desc: '3 conversion variants' },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setCanvasTransformType(mode.id)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          canvasTransformType === mode.id
                            ? 'bg-violet-600/20 border-violet-500 text-white shadow-xs'
                            : 'bg-black/20 border-white/5 text-slate-400 hover:text-white hover:border-white/20'
                        }`}
                      >
                        <div className="text-xs font-bold">{mode.label}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{mode.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prompt Directives */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Gemini Vision Prompt Directive (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={canvasPrompt}
                    onChange={(e) => setCanvasPrompt(e.target.value)}
                    placeholder="e.g. Warmer botanical greenhouse lighting, soft depth of field, high contrast branding..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  />
                </div>

                {/* Run Transform Button */}
                <button
                  onClick={handleTransformCreative}
                  disabled={isTransforming}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 text-white font-bold text-xs shadow-lg shadow-violet-900/40 transition-all flex items-center justify-center gap-2 hover:scale-[1.01]"
                >
                  <Wand2 className={`w-4 h-4 ${isTransforming ? 'animate-spin' : ''}`} />
                  {isTransforming ? 'Transforming via Gemini Multimodal...' : 'Execute Multimodal Transformation'}
                </button>
              </div>

              {/* Gemini 2.0 Copy Polish Card */}
              <div className="rounded-2xl bg-[#120F1D]/80 border border-white/10 p-5 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  Gemini Copy Polish & 3-Variant Engine
                </h3>

                <textarea
                  rows={3}
                  value={copyBaseText}
                  onChange={(e) => setCopyBaseText(e.target.value)}
                  placeholder="Paste your raw caption draft..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                />

                <div className="flex items-center gap-2">
                  <select
                    value={copyPlatform}
                    onChange={(e) => setCopyPlatform(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="facebook">Facebook</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>

                  <button
                    onClick={handleGenerateCopyVariants}
                    disabled={isPolishing}
                    className="flex-1 py-2 px-4 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className={`w-3.5 h-3.5 text-pink-400 ${isPolishing ? 'animate-spin' : ''}`} />
                    {isPolishing ? 'Generating 3 Variants...' : 'Generate 3 Copy Variants'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Display: Visual Transformation Preview & Copy Variants */}
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-2xl bg-[#120F1D]/80 border border-white/10 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Eye className="w-4 h-4 text-violet-400" />
                    Canvas Visual Transformation Preview
                  </h3>
                  {lastVariant && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
                      Confidence: {Math.round(lastVariant.confidenceScore * 100)}%
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Original Asset */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-400">Original Creative (1:1)</span>
                    <div className="aspect-square rounded-xl overflow-hidden bg-black/60 border border-white/10 relative group">
                      <img
                        src={canvasMediaUrl}
                        alt="Original Creative"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as any).src =
                            'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=1200&q=80';
                        }}
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono text-white">
                        Source
                      </div>
                    </div>
                  </div>

                  {/* Transformed Asset */}
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-pink-300">
                      Gemini Multimodal Result ({canvasTransformType === 'reframe_9_16' ? '9:16' : '1:1'})
                    </span>
                    <div
                      className={`rounded-xl overflow-hidden bg-black/60 border border-violet-500/40 relative group ${
                        canvasTransformType === 'reframe_9_16' ? 'aspect-[9/16]' : 'aspect-square'
                      }`}
                    >
                      <img
                        src={lastVariant?.transformedUrl || canvasMediaUrl}
                        alt="Transformed Creative"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-violet-950/80 border border-violet-500/40 text-[10px] font-mono text-pink-300">
                        {lastVariant?.styleApplied || 'Transformed'}
                      </div>
                    </div>
                  </div>
                </div>

                {lastVariant && lastVariant.tagsAdded && (
                  <div className="pt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-slate-400 mr-1">AI Tags Applied:</span>
                    {lastVariant.tagsAdded.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-slate-300 font-mono"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Generated Copy Variants List */}
              {copyVariants.length > 0 && (
                <div className="rounded-2xl bg-[#120F1D]/80 border border-white/10 p-5 space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-pink-400" />
                    Gemini 3-Variant Output
                  </h3>

                  <div className="space-y-3">
                    {copyVariants.map((variant, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl bg-black/40 border border-white/10 hover:border-violet-500/40 p-4 space-y-2 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-violet-300">{variant.style}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-pink-400 font-mono font-bold">
                              Virality: {variant.viralityScore}%
                            </span>
                            <button
                              onClick={() => copyToClipboard(variant.caption, `variant-${idx}`)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
                              title="Copy variant"
                            >
                              {copiedId === `variant-${idx}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-200 whitespace-pre-line leading-relaxed font-normal bg-black/30 p-2.5 rounded-lg border border-white/5">
                          {variant.caption}
                        </p>
                        <div className="text-[10px] text-slate-400 font-medium">
                          Best for: {variant.bestFor}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: FEED PERFORMANCE MATRIX & DEEP AUDITOR
          ========================================================================= */}
      {activeTab === 'feed-matrix' && (
        <div className="space-y-6">
          {/* Header & Instant Audit Trigger */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-pink-500" />
                Live Feed Performance Matrix
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Linguistic hook grading, engagement velocity, and sentiment diagnostics across published feeds.
              </p>
            </div>

            {/* Platform filter tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#120F1D] border border-white/10">
              {['all', 'instagram', 'linkedin', 'facebook', 'whatsapp'].map((plat) => (
                <button
                  key={plat}
                  onClick={() => setSelectedPlatform(plat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    selectedPlatform === plat
                      ? 'bg-violet-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {plat}
                </button>
              ))}
            </div>
          </div>

          {/* Inline Audit Form Box */}
          <div className="rounded-2xl bg-[#120F1D]/80 border border-violet-500/20 p-5 backdrop-blur-xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-pink-400" />
              Audit a Live Post Caption or URL
            </h3>

            <form onSubmit={handleRunAudit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={auditTitle}
                  onChange={(e) => setAuditTitle(e.target.value)}
                  placeholder="Post Campaign Title (e.g. Monstera Watering Routine)"
                  className="px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
                <select
                  value={auditPlatform}
                  onChange={(e) => setAuditPlatform(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none"
                >
                  <option value="instagram">Instagram</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="facebook">Facebook</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
                <input
                  type="url"
                  value={auditMediaUrl}
                  onChange={(e) => setAuditMediaUrl(e.target.value)}
                  placeholder="Media Image URL (Optional)"
                  className="px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                />
              </div>

              <textarea
                rows={2}
                value={auditCaption}
                onChange={(e) => setAuditCaption(e.target.value)}
                placeholder="Paste the caption text here for instant linguistic and virality scoring..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />

              {auditError && (
                <div className="text-xs text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {auditError}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isAuditing}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-bold text-xs shadow-lg shadow-violet-900/30 transition-all hover:scale-[1.02]"
                >
                  <Wand2 className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
                  {isAuditing ? 'Evaluating Post Intelligence...' : 'Run Deep Feed Audit'}
                </button>
              </div>
            </form>
          </div>

          {/* Feed Matrix Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {filteredAudits.map((item) => (
              <div
                key={item.auditId}
                className="rounded-2xl bg-[#120F1D]/80 border border-white/10 hover:border-violet-500/40 p-5 transition-all space-y-4"
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getPlatformIcon(item.platform)}
                    <span className="font-bold text-sm text-white capitalize">{item.platform}</span>
                    <span className="text-[11px] font-mono text-slate-500">{item.auditId}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                        item.viralityGrade === 'A+' || item.viralityGrade === 'A'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      Grade {item.viralityGrade}
                    </span>
                    <span className="text-xs font-mono font-bold text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-500/30">
                      {item.engagementVelocity}x Vel
                    </span>
                  </div>
                </div>

                {/* Content preview */}
                <div className="flex gap-4">
                  {item.mediaUrl && (
                    <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-black/40 border border-white/10">
                      <img
                        src={item.mediaUrl}
                        alt="Media Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as any).src =
                            'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';
                        }}
                      />
                    </div>
                  )}
                  <div className="space-y-1 min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                    <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed font-normal">
                      {item.caption}
                    </p>
                  </div>
                </div>

                {/* Score breakdown metrics */}
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/10 text-center">
                  <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Hook</span>
                    <span className="text-xs font-bold text-pink-400">{item.hookScore}/100</span>
                  </div>
                  <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Visual</span>
                    <span className="text-xs font-bold text-violet-400">{item.visualScore}/100</span>
                  </div>
                  <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Reach Forecast</span>
                    <span className="text-xs font-bold text-emerald-400">
                      {item.metrics?.estimatedImpressions || item.metrics?.impressions || '12.4k'}
                    </span>
                  </div>
                  <div className="bg-black/30 p-2 rounded-lg border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Sentiment</span>
                    <span className="text-xs font-bold text-sky-400 capitalize">{item.sentiment}</span>
                  </div>
                </div>

                {/* Actionable Recommendations Bullet points */}
                {item.recommendations && item.recommendations.length > 0 && (
                  <div className="bg-violet-950/20 border border-violet-500/20 p-3 rounded-xl space-y-1.5">
                    <span className="text-[11px] font-semibold text-violet-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-pink-400" />
                      Algorithmic Optimizations:
                    </span>
                    <ul className="space-y-1 text-[11px] text-slate-300 list-disc list-inside">
                      {item.recommendations.slice(0, 2).map((rec, rIdx) => (
                        <li key={rIdx} className="leading-snug">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
