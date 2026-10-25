import React, { useState, useMemo } from 'react';
import {
  Share2,
  CheckCircle2,
  RotateCw,
  ExternalLink,
  ShieldCheck,
  Plus,
  KeyRound,
  X,
  AlertCircle,
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  MessageCircle,
  Twitter,
  Globe,
  Building2,
  HelpCircle,
  Check,
  Copy
} from 'lucide-react';
import { SocialAccount, Brand, RoleName } from '../../../server/src/types';
import { formatISTDate, formatISTTime } from '../../utils/timezone';
import { api } from '../../api/client';
import { getRolePermissions } from '../../utils/rbac';

interface SocialAccountsPageProps {
  accounts: SocialAccount[];
  brands?: Brand[];
  onRefreshAccounts?: () => void;
  currentRole?: RoleName;
}

interface BrandGroup {
  brandId: string;
  brandName: string;
  accounts: SocialAccount[];
}

type PlatformType = 'meta' | 'youtube' | 'linkedin' | 'whatsapp' | 'x';

export const SocialAccountsPage: React.FC<SocialAccountsPageProps> = ({
  accounts,
  brands,
  onRefreshAccounts,
  currentRole = 'Super Admin',
}) => {
  const permissions = getRolePermissions(currentRole);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>('meta');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states per platform
  const [metaToken, setMetaToken] = useState('');
  const [ytChannelId, setYtChannelId] = useState('');
  const [ytToken, setYtToken] = useState('');
  const [ytHandle, setYtHandle] = useState('');
  const [liUrn, setLiUrn] = useState('');
  const [liToken, setLiToken] = useState('');
  const [liName, setLiName] = useState('');
  const [waPhoneId, setWaPhoneId] = useState('');
  const [waToken, setWaToken] = useState('');
  const [waNumber, setWaNumber] = useState('');
  const [xHandle, setXHandle] = useState('');
  const [xApiKey, setXApiKey] = useState('');
  const [xApiSecret, setXApiSecret] = useState('');
  const [xAccessToken, setXAccessToken] = useState('');
  const [xAccessSecret, setXAccessSecret] = useState('');
  const [xBearerToken, setXBearerToken] = useState('');

  const openConnectModal = (platform?: PlatformType) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (platform) {
      setSelectedPlatform(platform);
    }
    setModalOpen(true);
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let payload: any = { platform: selectedPlatform };

      if (selectedPlatform === 'meta') {
        if (!metaToken.trim()) throw new Error('Meta Graph API token is required.');
        payload.token = metaToken.trim();
      } else if (selectedPlatform === 'youtube') {
        if (!ytToken.trim()) throw new Error('YouTube OAuth token or Google API Key is required.');
        payload.channelId = ytChannelId.trim();
        payload.token = ytToken.trim();
        payload.accountHandle = ytHandle.trim() || undefined;
      } else if (selectedPlatform === 'linkedin') {
        if (!liToken.trim()) throw new Error('LinkedIn OAuth 2.0 Access Token is required.');
        payload.organizationUrn = liUrn.trim();
        payload.token = liToken.trim();
        payload.accountName = liName.trim() || undefined;
      } else if (selectedPlatform === 'whatsapp') {
        if (!waPhoneId.trim() || !waToken.trim()) throw new Error('WhatsApp Phone Number ID and System User Token are required.');
        payload.phoneNumberId = waPhoneId.trim();
        payload.token = waToken.trim();
        payload.phoneNumber = waNumber.trim() || undefined;
      } else if (selectedPlatform === 'x') {
        if (!xBearerToken.trim() && !xApiKey.trim() && !xAccessToken.trim()) {
          throw new Error('X (Twitter) API Keys, Access Token, or Bearer Token is required.');
        }
        payload.accountHandle = xHandle.trim() || undefined;
        payload.apiKey = xApiKey.trim();
        payload.apiSecret = xApiSecret.trim();
        payload.accessToken = xAccessToken.trim();
        payload.accessSecret = xAccessSecret.trim();
        payload.bearerToken = xBearerToken.trim();
      }

      const res = await api.connectSocialAccountToken(payload);
      setSuccessMsg(res.message || `${selectedPlatform.toUpperCase()} channel credentials verified and encrypted!`);
      if (onRefreshAccounts) {
        onRefreshAccounts();
      }
      setTimeout(() => {
        setModalOpen(false);
        setSuccessMsg(null);
      }, 1600);
    } catch (err: any) {
      setErrorMsg(err.message || `Failed connecting ${selectedPlatform} account.`);
    } finally {
      setIsLoading(false);
    }
  };

  const getPlatformMeta = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook':
        return {
          typeKey: 'meta' as PlatformType,
          name: 'Facebook',
          icon: <Facebook className="w-5 h-5 text-[#1877F2]" />,
          bg: 'bg-blue-50/80',
          border: 'border-blue-200/80',
          badge: 'bg-blue-100 text-blue-800'
        };
      case 'instagram':
        return {
          typeKey: 'meta' as PlatformType,
          name: 'Instagram',
          icon: <Instagram className="w-5 h-5 text-[#E4405F]" />,
          bg: 'bg-pink-50/80',
          border: 'border-pink-200/80',
          badge: 'bg-pink-100 text-pink-800'
        };
      case 'youtube':
        return {
          typeKey: 'youtube' as PlatformType,
          name: 'YouTube',
          icon: <Youtube className="w-5 h-5 text-[#FF0000]" />,
          bg: 'bg-red-50/80',
          border: 'border-red-200/80',
          badge: 'bg-red-100 text-red-800'
        };
      case 'whatsapp':
        return {
          typeKey: 'whatsapp' as PlatformType,
          name: 'WhatsApp',
          icon: <MessageCircle className="w-5 h-5 text-[#25D366]" />,
          bg: 'bg-emerald-50/80',
          border: 'border-emerald-200/80',
          badge: 'bg-emerald-100 text-emerald-800'
        };
      case 'linkedin':
        return {
          typeKey: 'linkedin' as PlatformType,
          name: 'LinkedIn',
          icon: <Linkedin className="w-5 h-5 text-[#0A66C2]" />,
          bg: 'bg-sky-50/80',
          border: 'border-sky-200/80',
          badge: 'bg-sky-100 text-sky-800'
        };
      case 'x':
      case 'twitter':
        return {
          typeKey: 'x' as PlatformType,
          name: 'X (Twitter)',
          icon: <Twitter className="w-5 h-5 text-slate-900" />,
          bg: 'bg-slate-100',
          border: 'border-slate-300',
          badge: 'bg-slate-200 text-slate-800'
        };
      default:
        return {
          typeKey: 'meta' as PlatformType,
          name: platform,
          icon: <Share2 className="w-5 h-5 text-indigo-600" />,
          bg: 'bg-indigo-50',
          border: 'border-indigo-200',
          badge: 'bg-indigo-100 text-indigo-800'
        };
    }
  };

  // Group accounts by Brand
  const brandGroups = useMemo<BrandGroup[]>(() => {
    const map = new Map<string, BrandGroup>();

    if (brands && brands.length > 0) {
      brands.forEach(b => {
        const key = String(b.id || (b as any).brandId || 'BR-001');
        map.set(key, {
          brandId: (b as any).brandId || `BR-00${b.id}`,
          brandName: b.name || 'Flower plant',
          accounts: []
        });
      });
    }

    accounts.forEach(acc => {
      let placed = false;
      if (brands && brands.length > 0) {
        for (const b of brands) {
          const key = String(b.id || (b as any).brandId || 'BR-001');
          if (
            String(acc.brandId) === String(b.id) ||
            String(acc.brandId) === String((b as any).brandId) ||
            (b.name && acc.accountName?.toLowerCase().includes(b.name.toLowerCase()))
          ) {
            map.get(key)?.accounts.push(acc);
            placed = true;
            break;
          }
        }
      }

      if (!placed) {
        const fallbackKey = String(acc.brandId || 'BR-001');
        if (!map.has(fallbackKey)) {
          const cleanName = acc.accountName
            ? acc.accountName.split('(')[0].replace(/YouTube.*|WhatsApp.*|AgriTech.*|X Channel.*/i, '').trim()
            : 'Flower plant';
          map.set(fallbackKey, {
            brandId: fallbackKey,
            brandName: cleanName || 'Flower plant',
            accounts: []
          });
        }
        map.get(fallbackKey)?.accounts.push(acc);
      }
    });

    return Array.from(map.values()).filter(g => g.accounts.length > 0);
  }, [accounts, brands]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#101828]">Connected Social Accounts</h2>
          <p className="text-xs text-[#667085] mt-1">
            Real multi-channel OAuth credentials verified and hardware-encrypted via AES-256-GCM token vault.
          </p>
        </div>

        {permissions.canManageAccounts ? (
          <button
            onClick={() => openConnectModal('meta')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1336E8] hover:bg-[#0E27B3] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Social Channel</span>
          </button>
        ) : (
          <span className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-medium">
            View-Only ({currentRole})
          </span>
        )}
      </div>

      {!permissions.canManageAccounts && (
        <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 text-blue-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>View-Only Governance ({currentRole}):</strong> Connecting new social platforms and editing token credentials is restricted to Administrators.
            </span>
          </div>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-blue-100 rounded text-blue-700 font-bold">
            Read-Only
          </span>
        </div>
      )}

      {/* Brand-Wise Cards with Social Platforms Next-to-Next */}
      {brandGroups.length > 0 ? (
        <div className="space-y-6">
          {brandGroups.map(group => {
            const connectedCount = group.accounts.filter(a => a.connectionStatus === 'connected').length;

            return (
              <div
                key={group.brandId}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-sm p-6 sm:p-7 space-y-6 transition-all"
              >
                {/* Brand Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-slate-900">{group.brandName}</h3>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-mono font-bold border border-indigo-100">
                          {group.brandId}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${
                          connectedCount > 0
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${connectedCount > 0 ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'}`}></span>
                          <span>{connectedCount} of {group.accounts.length} Channels Active</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 font-mono">
                          <Globe className="w-3.5 h-3.5 text-slate-400" />
                          <span>Asia/Kolkata (IST)</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-emerald-700 font-medium">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>AES-256-GCM Hardware Vault</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => openConnectModal('meta')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 hover:border-indigo-300 text-xs font-semibold rounded-xl transition-all shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add / Connect Channel</span>
                    </button>
                  </div>
                </div>

                {/* Social Platforms Responsive Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5">
                  {group.accounts.map(acc => {
                    const meta = getPlatformMeta(acc.platform);
                    const isConnected = acc.connectionStatus === 'connected';

                    return (
                      <div
                        key={acc.id}
                        onClick={() => openConnectModal(meta.typeKey)}
                        className={`group rounded-2xl border transition-all duration-200 p-4 flex flex-col justify-between space-y-3 cursor-pointer ${
                          isConnected
                            ? 'bg-slate-50/70 hover:bg-white border-slate-200/90 hover:border-indigo-300 hover:shadow-sm'
                            : 'bg-white hover:bg-amber-50/20 border-dashed border-slate-300 hover:border-indigo-300'
                        }`}
                      >
                        {/* Channel Top */}
                        <div className="flex items-start justify-between gap-2">
                          <div className={`w-10 h-10 rounded-xl ${meta.bg} ${meta.border} border flex items-center justify-center shrink-0 shadow-xs`}>
                            {meta.icon}
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0 ${
                            isConnected
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-600' : 'bg-slate-400'}`}></span>
                            <span>{isConnected ? 'Active' : 'Disconnected'}</span>
                          </span>
                        </div>

                        {/* Account Identity */}
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {meta.name}
                          </h4>
                          <p className={`text-[11px] font-mono truncate ${isConnected ? 'text-slate-600 font-semibold' : 'text-slate-400 italic'}`}>
                            {isConnected ? (acc.accountHandle || `@${acc.platform}`) : 'Not connected'}
                          </p>
                        </div>

                        {/* Details */}
                        <div className="space-y-1.5 pt-2 border-t border-slate-200/60 text-[11px]">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-slate-500">ID:</span>
                            <span className="font-mono text-slate-800 font-semibold truncate max-w-[95px]" title={acc.socialMediaId || (acc as any).externalId}>
                              {isConnected ? (acc.socialMediaId || (acc as any).externalId) : 'Not configured'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-slate-500">OAuth:</span>
                            <span className={isConnected ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
                              {isConnected ? 'Active Token' : 'Unset'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-slate-500">Sync:</span>
                            <span className="font-mono text-[10px] text-slate-500">
                              {isConnected && acc.lastSuccessfulPublishAt ? `${formatISTTime(acc.lastSuccessfulPublishAt)}` : '—'}
                            </span>
                          </div>
                        </div>

                        {/* Action */}
                        <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-1">
                          <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>AES-256</span>
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openConnectModal(meta.typeKey);
                            }}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors border ${
                              isConnected
                                ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                                : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-xs'
                            }`}
                          >
                            {isConnected ? 'Update' : '+ Connect'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* MULTI-PLATFORM CONNECTION & STEP-BY-STEP HELP WIZARD MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Connect & Authenticate Social Channel</h3>
                  <p className="text-xs text-slate-500">AES-256-GCM hardware encryption at rest</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Platform Selector Tabs */}
            <div className="grid grid-cols-5 gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSelectedPlatform('meta')}
                className={`py-2 px-2 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                  selectedPlatform === 'meta' ? 'bg-white text-indigo-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Facebook className="w-4 h-4 text-[#1877F2]" />
                <span className="truncate">Meta</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlatform('youtube')}
                className={`py-2 px-2 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                  selectedPlatform === 'youtube' ? 'bg-white text-indigo-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Youtube className="w-4 h-4 text-[#FF0000]" />
                <span className="truncate">YouTube</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlatform('linkedin')}
                className={`py-2 px-2 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                  selectedPlatform === 'linkedin' ? 'bg-white text-indigo-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Linkedin className="w-4 h-4 text-[#0A66C2]" />
                <span className="truncate">LinkedIn</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlatform('whatsapp')}
                className={`py-2 px-2 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                  selectedPlatform === 'whatsapp' ? 'bg-white text-indigo-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageCircle className="w-4 h-4 text-[#25D366]" />
                <span className="truncate">WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlatform('x')}
                className={`py-2 px-2 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                  selectedPlatform === 'x' ? 'bg-white text-indigo-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Twitter className="w-4 h-4 text-slate-900" />
                <span className="truncate">X (Twitter)</span>
              </button>
            </div>

            {/* Error & Success Alerts */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* FORM PER PLATFORM */}
            <form onSubmit={handleConnect} className="space-y-4">
              {/* META (FACEBOOK & INSTAGRAM) */}
              {selectedPlatform === 'meta' && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                      <HelpCircle className="w-4 h-4 text-blue-600" />
                      <span>How to get your Meta Graph API Token (Step-by-Step):</span>
                    </div>
                    <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside pl-1 leading-relaxed">
                      <li>Go to <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noreferrer" className="underline font-bold text-blue-900">Meta Graph API Explorer ↗</a></li>
                      <li>Select your Meta App and add User Token permissions: <code className="bg-white/80 px-1 py-0.5 rounded font-mono font-bold text-[11px]">pages_show_list, pages_read_engagement, pages_manage_posts, instagram_basic, instagram_content_publish</code></li>
                      <li>Click <strong>Generate Access Token</strong> and grant access to your Facebook Page and linked Instagram account.</li>
                      <li>Copy the generated token starting with <code className="font-mono font-bold">EAGV...</code> and paste below.</li>
                    </ol>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Meta User or Page Access Token (EAGV...) *
                    </label>
                    <textarea
                      rows={3}
                      value={metaToken}
                      onChange={e => setMetaToken(e.target.value)}
                      placeholder="Paste your Meta Access Token here (e.g. EAGVJejn...)"
                      required
                      className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-600 leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* YOUTUBE */}
              {selectedPlatform === 'youtube' && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-red-50/70 border border-red-200/80 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-red-900">
                      <HelpCircle className="w-4 h-4 text-red-600" />
                      <span>How to connect your YouTube Channel (Step-by-Step):</span>
                    </div>
                    <ol className="text-xs text-red-800 space-y-1 list-decimal list-inside pl-1 leading-relaxed">
                      <li>Open <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="underline font-bold text-red-900">Google Cloud Console ↗</a> and create or select a project.</li>
                      <li>Under <strong>APIs &amp; Services &gt; Library</strong>, search for and enable <strong>YouTube Data API v3</strong>.</li>
                      <li>Under <strong>Credentials</strong>, create an OAuth 2.0 Client ID or API Key with scopes: <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-[10px]">https://www.googleapis.com/auth/youtube.upload</code></li>
                      <li>Find your Channel ID in <a href="https://studio.youtube.com" target="_blank" rel="noreferrer" className="underline font-bold text-red-900">YouTube Studio ↗</a> &gt; Settings &gt; Channel &gt; Advanced settings (starts with <code className="font-mono font-bold">UC...</code>).</li>
                    </ol>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        YouTube Channel ID (UC...) *
                      </label>
                      <input
                        type="text"
                        value={ytChannelId}
                        onChange={e => setYtChannelId(e.target.value)}
                        placeholder="e.g. UC_flowerplant_yt"
                        required
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Channel Handle (Optional)
                      </label>
                      <input
                        type="text"
                        value={ytHandle}
                        onChange={e => setYtHandle(e.target.value)}
                        placeholder="e.g. @flowerplant_yt"
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Google OAuth Access Token or API Key *
                    </label>
                    <textarea
                      rows={2}
                      value={ytToken}
                      onChange={e => setYtToken(e.target.value)}
                      placeholder="Paste your YouTube Data API Key or OAuth Access Token"
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>
              )}

              {/* LINKEDIN */}
              {selectedPlatform === 'linkedin' && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-sky-50/70 border border-sky-200/80 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-sky-900">
                      <HelpCircle className="w-4 h-4 text-sky-600" />
                      <span>How to connect your LinkedIn Organization (Step-by-Step):</span>
                    </div>
                    <ol className="text-xs text-sky-800 space-y-1 list-decimal list-inside pl-1 leading-relaxed">
                      <li>Go to <a href="https://www.linkedin.com/developers/apps" target="_blank" rel="noreferrer" className="underline font-bold text-sky-900">LinkedIn Developer Portal ↗</a> and create an App.</li>
                      <li>Under <strong>Products</strong>, add <strong>Share on LinkedIn</strong> and <strong>Sign In with LinkedIn</strong>.</li>
                      <li>In the OAuth 2.0 Tools, generate an Access Token with scopes: <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-[10px]">w_member_social, w_organization_social</code></li>
                      <li>Your Organization URN format is <code className="font-mono font-bold">urn:li:organization:&lt;ID&gt;</code> (found in your LinkedIn Page URL).</li>
                    </ol>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Organization URN / Company ID *
                      </label>
                      <input
                        type="text"
                        value={liUrn}
                        onChange={e => setLiUrn(e.target.value)}
                        placeholder="e.g. urn:li:organization:12345678"
                        required
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Company Page Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={liName}
                        onChange={e => setLiName(e.target.value)}
                        placeholder="e.g. Flower Plant AgriTech"
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      LinkedIn OAuth 2.0 Access Token *
                    </label>
                    <textarea
                      rows={2}
                      value={liToken}
                      onChange={e => setLiToken(e.target.value)}
                      placeholder="Paste your LinkedIn OAuth Access Token"
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>
              )}

              {/* WHATSAPP */}
              {selectedPlatform === 'whatsapp' && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                      <HelpCircle className="w-4 h-4 text-emerald-600" />
                      <span>How to connect WhatsApp Cloud API (Step-by-Step):</span>
                    </div>
                    <ol className="text-xs text-emerald-800 space-y-1 list-decimal list-inside pl-1 leading-relaxed">
                      <li>In <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="underline font-bold text-emerald-900">Meta Developer Portal ↗</a>, go to your App &gt; <strong>WhatsApp &gt; API Setup</strong>.</li>
                      <li>Copy your <strong>Phone Number ID</strong> and <strong>WhatsApp Business Account ID</strong>.</li>
                      <li>In Business Settings &gt; System Users, generate a permanent access token with permission <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-[10px]">whatsapp_business_messaging</code>.</li>
                    </ol>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        WhatsApp Phone Number ID *
                      </label>
                      <input
                        type="text"
                        value={waPhoneId}
                        onChange={e => setWaPhoneId(e.target.value)}
                        placeholder="e.g. 105948372615482"
                        required
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Display Phone Number (Optional)
                      </label>
                      <input
                        type="text"
                        value={waNumber}
                        onChange={e => setWaNumber(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Permanent System User Access Token *
                    </label>
                    <textarea
                      rows={2}
                      value={waToken}
                      onChange={e => setWaToken(e.target.value)}
                      placeholder="Paste your WhatsApp Cloud API Permanent Access Token"
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>
              )}

              {/* X (TWITTER) */}
              {selectedPlatform === 'x' && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-slate-100 border border-slate-300 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                      <HelpCircle className="w-4 h-4 text-slate-700" />
                      <span>How to connect X (Twitter) Developer API (Step-by-Step):</span>
                    </div>
                    <ol className="text-xs text-slate-700 space-y-1 list-decimal list-inside pl-1 leading-relaxed">
                      <li>Go to <a href="https://developer.x.com" target="_blank" rel="noreferrer" className="underline font-bold text-slate-900">X Developer Portal ↗</a> &gt; Projects &amp; Apps &gt; your App.</li>
                      <li>Under "User authentication settings", ensure permissions are set to <strong>Read and Write</strong>.</li>
                      <li>In <strong>Keys and Tokens</strong>, generate your API Key, API Secret, Access Token, and Access Secret (or Bearer Token).</li>
                    </ol>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      X Account Handle *
                    </label>
                    <input
                      type="text"
                      value={xHandle}
                      onChange={e => setXHandle(e.target.value)}
                      placeholder="e.g. @flowerplant_in"
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        API Key (Consumer Key)
                      </label>
                      <input
                        type="text"
                        value={xApiKey}
                        onChange={e => setXApiKey(e.target.value)}
                        placeholder="Paste X API Key"
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        API Key Secret
                      </label>
                      <input
                        type="password"
                        value={xApiSecret}
                        onChange={e => setXApiSecret(e.target.value)}
                        placeholder="Paste X API Secret"
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Access Token (or OAuth 2.0 Bearer Token) *
                    </label>
                    <textarea
                      rows={2}
                      value={xBearerToken || xAccessToken}
                      onChange={e => {
                        setXBearerToken(e.target.value);
                        setXAccessToken(e.target.value);
                      }}
                      placeholder="Paste your Access Token or OAuth 2.0 Bearer Token"
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
                >
                  {isLoading && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isLoading ? 'Verifying & Encrypting...' : `Save & Encrypt ${selectedPlatform.toUpperCase()} Token`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
