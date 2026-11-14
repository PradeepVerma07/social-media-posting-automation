import React, { useState, useMemo, useEffect } from 'react';
import {
  Share2,
  CheckCircle2,
  RotateCw,
  ExternalLink,
  ShieldCheck,
  Shield,
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
  Copy,
  Trash2,
  Infinity,
  Zap,
  Eye,
  EyeOff,
  Loader2
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
  selectedBrandId?:number|null;
}

interface BrandGroup {
  brandId: string;
  brandName: string;
  accounts: SocialAccount[];
}

type PlatformType = 'meta' | 'instagram' | 'youtube' | 'linkedin' | 'whatsapp' | 'x';

interface MetaConnectedCardProps {
  brandId: string;
  brandName: string;
  accounts: SocialAccount[];
  onRefresh?: () => void;
  canManage: boolean;
  onOpenModal?: (platform: PlatformType) => void;
}

export const MetaConnectedCard: React.FC<MetaConnectedCardProps> = ({
  brandId,
  brandName,
  accounts,
  onRefresh,
  canManage,
  onOpenModal,
}) => {
  const fbAccount = accounts.find(a => a.platform === 'facebook');
  const igAccount = accounts.find(a => a.platform === 'instagram');
  const waAccount = accounts.find(a => a.platform === 'whatsapp');

  const isConnected = (fbAccount && fbAccount.connectionStatus === 'connected') || 
                      (igAccount && igAccount.connectionStatus === 'connected');

  const [pageId, setPageId] = useState(
    fbAccount?.externalId && !fbAccount.externalId.startsWith('ACC-') && fbAccount.externalId !== 'Not configured'
      ? fbAccount.externalId
      : ''
  );
  const [pageDisplayName, setPageDisplayName] = useState(fbAccount?.accountName || brandName || '');
  const [token, setToken] = useState('');
  const [igId, setIgId] = useState(
    igAccount?.accountHandle?.replace(/^@/, '') || 
    (igAccount?.externalId && !igAccount.externalId.startsWith('ACC-') && igAccount.externalId !== 'Not configured' ? igAccount.externalId : '')
  );
  const [waNumber, setWaNumber] = useState(waAccount?.accountHandle || '');
  const [showToken, setShowToken] = useState(false);
  const [showDevDetails, setShowDevDetails] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [copiedField, setCopiedField] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useEffect(() => {
    if (fbAccount?.externalId && !fbAccount.externalId.startsWith('ACC-') && fbAccount.externalId !== 'Not configured') {
      setPageId(fbAccount.externalId);
    }
    if (fbAccount?.accountName) {
      setPageDisplayName(fbAccount.accountName);
    }
    if (igAccount?.accountHandle) {
      setIgId(igAccount.accountHandle.replace(/^@/, ''));
    } else if (igAccount?.externalId && !igAccount.externalId.startsWith('ACC-') && igAccount.externalId !== 'Not configured') {
      setIgId(igAccount.externalId);
    }
    if (waAccount?.accountHandle) {
      setWaNumber(waAccount.accountHandle);
    }
  }, [fbAccount, igAccount, waAccount, brandName]);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const handleTest = async () => {
    const targetAcc = fbAccount || igAccount;
    const targetId = targetAcc ? String((targetAcc as any).accountId || targetAcc.id) : null;
    if (!targetId && !token.trim()) {
      setFeedback({ type: 'error', message: 'Paste a Meta access token or connect the channel first to test.' });
      return;
    }
    setIsTesting(true);
    setFeedback(null);
    try {
      if (targetId) {
        const res = await api.checkMetaAccount(targetId);
        setFeedback({ type: 'success', message: res.message || 'Meta verified the connection successfully!' });
      } else {
        await api.connectSocialAccountToken({
          platform: 'meta',
          token: token.trim(),
          pageId: pageId.trim() || undefined,
          instagramId: igId.trim() || undefined,
          reassign: true,
        }, brandId);
        setFeedback({ type: 'success', message: 'Token verified and Meta channels connected!' });
        setToken('');
        onRefresh?.();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Meta Graph API verification failed.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm(`Disconnect Meta accounts (Facebook & Instagram) for ${brandName}?`)) return;
    setIsDisconnecting(true);
    setFeedback(null);
    try {
      if (fbAccount) await api.disconnectSocialAccount(String((fbAccount as any).accountId || fbAccount.id));
      if (igAccount) await api.disconnectSocialAccount(String((igAccount as any).accountId || igAccount.id));
      setFeedback({ type: 'info', message: 'Meta channels disconnected.' });
      onRefresh?.();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to disconnect account.' });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleConnect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token.trim()) {
      setFeedback({ type: 'error', message: 'Please paste your Meta Access Token to connect.' });
      return;
    }
    setIsConnecting(true);
    setFeedback(null);
    try {
      let pageIdInput = pageId.trim();
      let igIdInput = igId.trim();

      if (pageIdInput.startsWith('1784') || (pageIdInput.length >= 16 && !igIdInput)) {
        if (!igIdInput) igIdInput = pageIdInput;
        if (fbAccount?.externalId && !fbAccount.externalId.startsWith('ACC-') && fbAccount.externalId !== 'Not configured') {
          pageIdInput = fbAccount.externalId;
        } else {
          pageIdInput = '';
        }
      }

      const res = await api.connectSocialAccountToken({
        platform: 'meta',
        token: token.trim(),
        pageId: pageIdInput || undefined,
        instagramId: igIdInput || undefined,
        reassign: true,
      }, brandId);
      setFeedback({ type: 'success', message: res.message || 'Meta (Facebook & Instagram) connected successfully!' });
      setToken('');
      onRefresh?.();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to connect Meta account.' });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs hover:shadow-sm transition-all space-y-4 w-full">
      {/* Header matching screenshot */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200/90 flex items-center justify-center shrink-0 text-[#0081FB] shadow-xs">
            <Infinity className="w-6 h-6" strokeWidth={2.4} />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900 leading-tight">
              Instagram &amp; Facebook (Meta)
            </h4>
            <p className="text-xs text-slate-500 font-medium">
              Graph API Publishing &amp; Feeds
            </p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border shrink-0 ${
          isConnected 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
            : 'bg-slate-100 text-slate-500 border-slate-200'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
          <span>{isConnected ? 'CONNECTED' : 'DISCONNECTED'}</span>
        </span>
      </div>

      {/* Sub-channel pills matching screenshot */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Facebook Pill */}
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
          fbAccount?.connectionStatus === 'connected' 
            ? 'bg-blue-50/80 text-blue-900 border-blue-200/90' 
            : 'bg-slate-50 text-slate-500 border-slate-200'
        }`}>
          <Facebook className="w-3.5 h-3.5 text-[#1877F2]" />
          <span className="truncate max-w-[120px]" title={fbAccount?.accountName || 'Facebook'}>
            {fbAccount?.accountName ? (fbAccount.accountName.length > 12 ? fbAccount.accountName.slice(0, 10) + '...' : fbAccount.accountName) : 'Facebook'}
          </span>
        </div>

        {/* Instagram Pill */}
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
          igAccount?.connectionStatus === 'connected' 
            ? 'bg-pink-50/80 text-pink-900 border-pink-200/90' 
            : 'bg-slate-50 text-slate-500 border-slate-200'
        }`}>
          <Instagram className="w-3.5 h-3.5 text-[#E4405F]" />
          <span className="truncate max-w-[120px]" title={igAccount?.accountHandle || '@instagram'}>
            {igAccount?.accountHandle ? (igAccount.accountHandle.length > 12 ? igAccount.accountHandle.slice(0, 10) + '...' : igAccount.accountHandle) : '@instagram'}
          </span>
        </div>

        {/* WhatsApp Pill */}
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
          waAccount?.connectionStatus === 'connected' 
            ? 'bg-emerald-50/80 text-emerald-900 border-emerald-200/90' 
            : 'bg-slate-50 text-slate-500 border-slate-200'
        }`}>
          <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
          <span className="truncate max-w-[100px]">
            {waAccount?.accountHandle ? waAccount.accountHandle : 'Optional'}
          </span>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
          feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
          feedback.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-900' :
          'bg-blue-50 border-blue-200 text-blue-900'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
          <span className="leading-relaxed font-medium">{feedback.message}</span>
        </div>
      )}

      {/* Inputs matching screenshot */}
      <form onSubmit={handleConnect} className="space-y-3 pt-1">
        {/* Facebook Page ID */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
            <Facebook className="w-3.5 h-3.5 text-[#1877F2]" />
            <span>FACEBOOK PAGE ID *</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            disabled={!canManage || isConnecting}
            value={pageId}
            onChange={e => setPageId(e.target.value)}
            placeholder="1411150458750239"
            className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60"
          />
        </div>

        {/* Page Display Name */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
            PAGE DISPLAY NAME
          </label>
          <input
            type="text"
            disabled={!canManage || isConnecting}
            value={pageDisplayName}
            onChange={e => setPageDisplayName(e.target.value)}
            placeholder="Webtrionix"
            className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60"
          />
        </div>

        {/* Page Access Token */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              PAGE ACCESS TOKEN *
            </label>
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showToken ? 'Mask' : 'Reveal'}</span>
            </button>
          </div>
          <input
            type={showToken ? "text" : "password"}
            autoComplete="off"
            spellCheck={false}
            disabled={!canManage || isConnecting}
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="EAAB... (Paste Page or User Access Token)"
            className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60"
          />
        </div>

        {/* Instagram Business ID */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Instagram className="w-3.5 h-3.5 text-[#E4405F]" />
              <span>INSTAGRAM BUSINESS ID (OPTIONAL)</span>
            </label>
            {igAccount?.accountHandle && (
              <span className="text-[11px] font-bold text-slate-600 font-mono">
                {igAccount.accountHandle}
              </span>
            )}
          </div>
          <input
            type="text"
            disabled={!canManage || isConnecting}
            value={igId}
            onChange={e => setIgId(e.target.value)}
            placeholder="17841499999999"
            className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60"
          />
        </div>

        {/* WhatsApp Business */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
            <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
            <span>WHATSAPP BUSINESS (OPTIONAL)</span>
          </label>
          <input
            type="text"
            disabled={!canManage || isConnecting}
            value={waNumber}
            onChange={e => setWaNumber(e.target.value)}
            placeholder="e.g. +91 98765 43210 (Auto-detected from token)"
            className="w-full h-11 px-3.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-60"
          />
        </div>

        {/* Webhook & Developer Details */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowDevDetails(!showDevDetails)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <span className="text-[10px]">{showDevDetails ? '▼' : '▶'}</span>
            <span>⚙️ Webhook &amp; Developer Details</span>
          </button>
          {showDevDetails && (
            <div className="mt-2.5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Callback Webhook URL:
                </span>
                <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-200 font-mono text-[11px]">
                  <span className="truncate">https://360.webtrionix.com/api/v1/meta/webhook</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('https://360.webtrionix.com/api/v1/meta/webhook', 'url')}
                    className="p-1 text-slate-500 hover:text-slate-800"
                    title="Copy URL"
                  >
                    {copiedField === 'url' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Verify Token:
                </span>
                <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-200 font-mono text-[11px]">
                  <span>ci360_meta_webhook_secret</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('ci360_meta_webhook_secret', 'token')}
                    className="p-1 text-slate-500 hover:text-slate-800"
                    title="Copy Token"
                  >
                    {copiedField === 'token' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Generate token in <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">Graph API Explorer ↗</a> with permissions: <code>pages_show_list, pages_read_engagement, pages_manage_posts, instagram_basic, instagram_content_publish</code>
              </p>
            </div>
          )}
        </div>

        {/* Action buttons matching screenshot */}
        <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
          {/* Disconnect Button */}
          <button
            type="button"
            disabled={!canManage || !isConnected || isDisconnecting}
            onClick={handleDisconnect}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-40"
          >
            <span>🔌</span>
            <span>{isDisconnecting ? 'Disconnecting...' : 'Disconnect'}</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Test Button */}
            <button
              type="button"
              disabled={isTesting || (!fbAccount && !token.trim())}
              onClick={handleTest}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-800 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-40"
            >
              <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>{isTesting ? 'Testing...' : 'Test'}</span>
            </button>

            {/* Connect Button */}
            <button
              type="submit"
              disabled={!canManage || isConnecting || (!token.trim() && !isConnected)}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>💾</span>
              <span>{isConnecting ? 'Connecting...' : 'Connect'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export const SocialAccountsPage: React.FC<SocialAccountsPageProps> = ({
  accounts,
  brands,
  onRefreshAccounts,
  currentRole = 'Super Admin',
  selectedBrandId=null,
}) => {
  const permissions = getRolePermissions(currentRole);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>('meta');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [checkingId,setCheckingId]=useState(''),[checkNotice,setCheckNotice]=useState(''),[checkFailed,setCheckFailed]=useState(false);
  const [disconnectingId, setDisconnectingId] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const verifySaved=async(account:SocialAccount)=>{const id=String((account as any).accountId||account.id);if(checkingId)return;setCheckingId(id);setCheckNotice('');setCheckFailed(false);try{const result=await api.checkMetaAccount(id);setCheckNotice(result.message);}catch(error:any){setCheckNotice(error.message);setCheckFailed(true);}finally{await onRefreshAccounts?.();setCheckingId('');}};

  // Form states per platform
  const [metaToken, setMetaToken] = useState('');
  const [metaPageId,setMetaPageId]=useState('');
  const [metaIgId, setMetaIgId] = useState('');
  const [connectionBrandId,setConnectionBrandId]=useState('');
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

  const openConnectModal = (platform?: PlatformType,brandKey?:string) => {
    const match=brands?.find(b=>String(b.id)===brandKey||String((b as any).brandId)===brandKey);
    setConnectionBrandId(String(match?.id||selectedBrandId||''));
    setErrorMsg(null);
    setSuccessMsg(null);
    if (platform) {
      setSelectedPlatform(platform);
    }
    setModalOpen(true);
  };

  const clearCredentials=()=>{setMetaToken('');setMetaPageId('');setMetaIgId('');setYtToken('');setLiToken('');setWaToken('');setXApiKey('');setXApiSecret('');setXAccessToken('');setXAccessSecret('');setXBearerToken('');};
  const closeModal=()=>{if(isLoading)return;clearCredentials();setModalOpen(false);setErrorMsg(null);};
  useEffect(() => {
    setErrorMsg(null);
    if (connectionBrandId) {
      const selected = brands?.find(b => 
        String(b.id) === connectionBrandId || 
        String((b as any).brandId) === connectionBrandId || 
        String((b as any).brand_id) === connectionBrandId
      );
      const brandCode = (selected as any)?.brandId || (selected as any)?.brand_id;
      const brandAccounts = accounts.filter(a => 
        String(a.brandId) === String(connectionBrandId) || 
        (selected && (String(a.brandId) === String(selected.id) || (brandCode && String(a.brandId) === String(brandCode))))
      );
      const fbAcc = brandAccounts.find(a => a.platform === 'facebook');
      const igAcc = brandAccounts.find(a => a.platform === 'instagram');
      if (fbAcc?.externalId && fbAcc.externalId !== 'Not configured' && !fbAcc.externalId.startsWith('ACC-')) {
        setMetaPageId(fbAcc.externalId);
      } else {
        setMetaPageId('');
      }
      if (igAcc?.accountHandle && igAcc.accountHandle !== 'Not connected') {
        setMetaIgId(igAcc.accountHandle);
      } else if (igAcc?.externalId && igAcc.externalId !== 'Not configured' && !igAcc.externalId.startsWith('ACC-')) {
        setMetaIgId(igAcc.externalId);
      } else {
        setMetaIgId('');
      }
    } else {
      setMetaPageId('');
      setMetaIgId('');
    }
  }, [selectedPlatform, connectionBrandId, brands, accounts]);
  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const selected=brands?.find(b=>String(b.id)===connectionBrandId);
      if(!selected)throw new Error('Select the brand for this connection.');
      let payload: any = { platform: selectedPlatform, brandId: (selected as any).brandId || selected.id, reassign: true };

      if (selectedPlatform === 'meta' || selectedPlatform === 'instagram') {
        if (!metaToken.trim()) throw new Error('Meta Graph API token is required.');
        payload.token = metaToken.trim();
        let pageIdInput = metaPageId.trim();
        let igIdInput = metaIgId.trim();

        if (pageIdInput.startsWith('1784') || (pageIdInput.length >= 16 && !igIdInput)) {
          if (!igIdInput) igIdInput = pageIdInput;
          const brandCode = (selected as any)?.brandId || (selected as any)?.brand_id;
          const brandAccounts = accounts.filter(a => 
            String(a.brandId) === String(connectionBrandId) || 
            String(a.brandId) === String(selected.id) || 
            (brandCode && String(a.brandId) === String(brandCode))
          );
          const fbAccount = brandAccounts.find(a => a.platform === 'facebook');
          if (fbAccount?.externalId && fbAccount.externalId !== 'Not configured' && !fbAccount.externalId.startsWith('ACC-')) {
            pageIdInput = fbAccount.externalId;
          } else {
            pageIdInput = '';
          }
        }

        if (pageIdInput) payload.pageId = pageIdInput;
        if (igIdInput) payload.instagramId = igIdInput;
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
      clearCredentials();
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
      setTimeout(() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (dialog) dialog.scrollTop = 0;
      }, 50);
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
          typeKey: 'instagram' as PlatformType,
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
            String(acc.brandId) === String((b as any).brandId)
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
            Connect the selected brand with credentials verified by the provider and encrypted at rest.
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
                          <span>AES-256-GCM encrypted credentials</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => openConnectModal('meta',group.brandId)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 hover:border-indigo-300 text-xs font-semibold rounded-xl transition-all shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add / Connect Channel</span>
                    </button>
                  </div>
                </div>

                {/* Brand Social Channels Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left: Unified Instagram & Facebook (Meta) Card matching screenshot */}
                  <div className="lg:col-span-7">
                    <MetaConnectedCard
                      brandId={group.brandId}
                      brandName={group.brandName}
                      accounts={group.accounts}
                      onRefresh={onRefreshAccounts}
                      canManage={permissions.canManageAccounts}
                      onOpenModal={(platform) => openConnectModal(platform, group.brandId)}
                    />
                  </div>

                  {/* Right: Other Social Channels (YouTube, LinkedIn, X, etc.) */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                        <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Other Social Platforms</span>
                      </h4>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {group.accounts.filter(a => !['facebook', 'instagram', 'whatsapp'].includes(a.platform.toLowerCase()) && a.connectionStatus === 'connected').length} connected
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3.5">
                      {group.accounts
                        .filter(acc => !['facebook', 'instagram', 'whatsapp'].includes(acc.platform.toLowerCase()))
                        .map(acc => {
                          const meta = getPlatformMeta(acc.platform);
                          const isConnected = acc.connectionStatus === 'connected';

                          return (
                            <div
                              key={acc.id}
                              onClick={() => openConnectModal(meta.typeKey, group.brandId)}
                              className={`group rounded-2xl border transition-all duration-200 p-4 flex flex-col justify-between space-y-3 cursor-pointer ${
                                isConnected
                                  ? 'bg-slate-50/70 hover:bg-white border-slate-200/90 hover:border-indigo-300 hover:shadow-xs'
                                  : 'bg-white hover:bg-amber-50/20 border-dashed border-slate-300 hover:border-indigo-300'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div className={`w-9 h-9 rounded-xl ${meta.bg} ${meta.border} border flex items-center justify-center shrink-0 shadow-xs`}>
                                    {meta.icon}
                                  </div>
                                  <div>
                                    <h5 className="text-xs font-bold text-slate-900">{meta.name}</h5>
                                    <p className={`text-[11px] font-mono truncate max-w-[140px] ${isConnected ? 'text-slate-600 font-semibold' : 'text-slate-400 italic'}`}>
                                      {isConnected ? (acc.accountHandle || `@${acc.platform}`) : 'Not connected'}
                                    </p>
                                  </div>
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

                              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                                <span className="text-slate-500 font-mono text-[10px] truncate max-w-[120px]">
                                  {isConnected ? (acc.socialMediaId || (acc as any).externalId) : 'Unset'}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {permissions.canManageAccounts && (
                                    <button
                                      type="button"
                                      title="Delete channel"
                                      disabled={deletingId === String((acc as any).accountId || acc.id)}
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        const id = String((acc as any).accountId || acc.id);
                                        if (!window.confirm(`Permanently remove this ${meta.name} channel for ${group.brandName}?`)) return;
                                        setDeletingId(id);
                                        try {
                                          await api.deleteSocialAccount(id);
                                          setCheckNotice(`${meta.name} channel removed successfully.`);
                                          setCheckFailed(false);
                                          await onRefreshAccounts?.();
                                        } catch (err: any) {
                                          setCheckNotice(err.message || 'Failed to delete account');
                                          setCheckFailed(true);
                                        } finally {
                                          setDeletingId('');
                                        }
                                      }}
                                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {isConnected && permissions.canManageAccounts && (
                                    <button
                                      type="button"
                                      disabled={disconnectingId === String((acc as any).accountId || acc.id)}
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        const id = String((acc as any).accountId || acc.id);
                                        setDisconnectingId(id);
                                        try {
                                          await api.disconnectSocialAccount(id);
                                          setCheckNotice(`${meta.name} channel disconnected.`);
                                          setCheckFailed(false);
                                          await onRefreshAccounts?.();
                                        } catch (err: any) {
                                          setCheckNotice(err.message || 'Failed to disconnect account');
                                          setCheckFailed(true);
                                        } finally {
                                          setDisconnectingId('');
                                        }
                                      }}
                                      className="px-2 py-1 text-[11px] font-semibold rounded-lg text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                                    >
                                      {disconnectingId === String((acc as any).accountId || acc.id) ? 'Disconnecting…' : 'Disconnect'}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openConnectModal(meta.typeKey, group.brandId);
                                    }}
                                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors border cursor-pointer ${
                                      isConnected
                                        ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-xs'
                                    }`}
                                  >
                                    {isConnected ? 'Settings' : 'Connect'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {checkNotice&&<p role={checkFailed?'alert':'status'} className={'rounded-xl border p-4 text-sm '+(checkFailed?'border-rose-200 bg-rose-50 text-rose-800':'border-emerald-200 bg-emerald-50 text-emerald-800')}>{checkNotice}</p>}
      {/* MULTI-PLATFORM CONNECTION & STEP-BY-STEP HELP WIZARD MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div role="dialog" aria-modal="true" aria-label="Connect social account" className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Connect & Authenticate Social Channel</h3>
                  <p className="text-xs text-slate-500">Verified with the provider and encrypted at rest</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Platform Selector Tabs */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSelectedPlatform('meta')}
                className={`py-2 px-2 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                  selectedPlatform === 'meta' ? 'bg-white text-indigo-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Facebook className="w-4 h-4 text-[#1877F2]" />
                <span className="truncate">Meta (FB)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlatform('instagram')}
                className={`py-2 px-2 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                  selectedPlatform === 'instagram' ? 'bg-white text-indigo-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Instagram className="w-4 h-4 text-[#E4405F]" />
                <span className="truncate">Instagram</span>
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
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{errorMsg}</span>
                </div>
                {Array.from(errorMsg.matchAll(/"([^"]+)"\s*\(ID:\s*(\d+)\)/g)).length > 0 && (
                  <div className="pt-1 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[11px] font-semibold text-rose-800">Click to use Page ID:</span>
                    {Array.from(errorMsg.matchAll(/"([^"]+)"\s*\(ID:\s*(\d+)\)/g)).map((match, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setMetaPageId(match[2])}
                        className="px-2 py-0.5 bg-white border border-rose-300 rounded-lg text-rose-900 font-bold hover:bg-rose-100 transition-colors cursor-pointer text-[11px]"
                      >
                        {match[1]} ({match[2]})
                      </button>
                    ))}
                  </div>
                )}
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
              <label className="block text-sm font-semibold text-slate-700">Brand<select aria-label="Connection brand" required disabled={isLoading} value={connectionBrandId} onChange={e=>setConnectionBrandId(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"><option value="">Select a brand</option>{brands?.map(brand=><option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></label>
              {/* META (FACEBOOK & INSTAGRAM) */}
              {(selectedPlatform === 'meta' || selectedPlatform === 'instagram') && (
                <div className="space-y-4">
                  {selectedPlatform === 'instagram' ? (
                    <div className="p-3.5 bg-pink-50/70 border border-pink-200/80 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-pink-900">
                        <HelpCircle className="w-4 h-4 text-pink-600" />
                        <span>How to connect your Instagram Account (Step-by-Step):</span>
                      </div>
                      <ol className="text-xs text-pink-800 space-y-1 list-decimal list-inside pl-1 leading-relaxed">
                        <li>Ensure your Instagram account is switched to <strong>Professional / Business</strong> in the Instagram app (Settings &gt; Account &gt; Switch to Professional).</li>
                        <li>Link the Instagram account to your Facebook Page in <strong>Meta Business Suite</strong> or Facebook Page Settings.</li>
                        <li>In <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noreferrer" className="underline font-bold text-pink-900">Meta Graph API Explorer ↗</a>, add permissions: <code className="bg-white/80 px-1 py-0.5 rounded font-mono font-bold text-[11px]">instagram_basic, instagram_content_publish, pages_show_list, pages_read_engagement, pages_manage_posts</code> and generate token.</li>
                        <li>Paste your token below. You can also specify your Instagram username or numeric ID for instant verification.</li>
                      </ol>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                        <HelpCircle className="w-4 h-4 text-blue-600" />
                        <span>How to get your Meta Graph API Token (Step-by-Step):</span>
                      </div>
                      <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside pl-1 leading-relaxed">
                        <li>Go to <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noreferrer" className="underline font-bold text-blue-900">Meta Graph API Explorer ↗</a></li>
                        <li>Select your Meta App and add permissions: <code className="bg-white/80 px-1 py-0.5 rounded font-mono font-bold text-[11px]">pages_show_list, pages_read_engagement, pages_manage_posts, instagram_basic, instagram_content_publish, whatsapp_business_management, whatsapp_business_messaging</code></li>
                        <li>Click <strong>Generate Access Token</strong> and grant access to your Pages, Instagram, and WhatsApp.</li>
                        <li>Paste your token below. <strong>Facebook, linked Instagram, and WhatsApp</strong> accounts will be automatically discovered and connected simultaneously!</li>
                      </ol>
                    </div>
                  )}

                  <label className="block text-xs font-semibold text-slate-700">
                    Facebook Page ID (when the token covers multiple Pages)
                    <input aria-label="Facebook Page ID" inputMode="numeric" value={metaPageId} onChange={e=>setMetaPageId(e.target.value)} placeholder="Numeric Page ID (e.g. 145474...)" className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm"/>
                  </label>

                  <label className="block text-xs font-semibold text-slate-700">
                    Instagram Username or Account ID (Optional — auto-detected if linked to Page)
                    <input aria-label="Instagram Username or ID" value={metaIgId} onChange={e=>setMetaIgId(e.target.value)} placeholder="e.g. @yourbrand or numeric ID (1784...)" className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm"/>
                  </label>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Meta User or Page Access Token *
                    </label>
                    <input type="password" autoComplete="off" spellCheck={false} aria-label="Meta access token" value={metaToken}
                      onChange={e => setMetaToken(e.target.value)}
                      placeholder="Paste your Meta access token"
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
                    <input type="password" autoComplete="off" spellCheck={false} aria-label="YouTube credential" value={ytToken}
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
                    <input type="password" autoComplete="off" spellCheck={false} aria-label="LinkedIn access token" value={liToken}
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
                    <input type="password" autoComplete="off" spellCheck={false} aria-label="WhatsApp access token" value={waToken}
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
                    <input type="password" autoComplete="off" spellCheck={false} aria-label="X bearer token" value={xBearerToken || xAccessToken}
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

              {/* Inline Bottom Alert for scrolled view */}
              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="font-medium leading-relaxed">{errorMsg}</span>
                  </div>
                  {Array.from(errorMsg.matchAll(/"([^"]+)"\s*\(ID:\s*(\d+)\)/g)).length > 0 && (
                    <div className="pt-1 flex flex-wrap gap-1.5 items-center">
                      <span className="text-[11px] font-semibold text-rose-800">Click to use Page ID:</span>
                      {Array.from(errorMsg.matchAll(/"([^"]+)"\s*\(ID:\s*(\d+)\)/g)).map((match, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setMetaPageId(match[2])}
                          className="px-2 py-0.5 bg-white border border-rose-300 rounded-lg text-rose-900 font-bold hover:bg-rose-100 transition-colors cursor-pointer text-[11px]"
                        >
                          {match[1]} ({match[2]})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-medium leading-relaxed">{successMsg}</span>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading||!connectionBrandId}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
                >
                  {isLoading && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isLoading ? 'Verifying & Encrypting...' : selectedPlatform === 'meta' ? 'Save & Connect Channels (FB, Insta & WhatsApp)' : selectedPlatform === 'instagram' ? 'Save & Connect Instagram Channel' : `Save & Encrypt ${selectedPlatform.toUpperCase()} Token`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
