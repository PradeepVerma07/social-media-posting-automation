import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Globe,
  CheckCircle2,
  Share2,
  Edit2,
  Trash2,
  Key,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Clock,
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff,
  Hash,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Youtube
} from 'lucide-react';
import { Brand, BrandTokens, RoleName } from '../../../server/src/types';
import { api } from '../../api/client';
import { getRolePermissions } from '../../utils/rbac';

interface BrandsPageProps {
  brands: Brand[];
  onCreateBrand: (brandData: any) => void;
  onUpdateBrand?: (id: number, brandData: any) => void;
  onDeleteBrand?: (id: number) => void;
  currentRole?: RoleName;
}

const COMMON_TIMEZONES = [
  { label: 'Asia/Kolkata (IST +05:30)', value: 'Asia/Kolkata' },
  { label: 'America/New_York (EST/EDT)', value: 'America/New_York' },
  { label: 'America/Los_Angeles (PST/PDT)', value: 'America/Los_Angeles' },
  { label: 'America/Chicago (CST/CDT)', value: 'America/Chicago' },
  { label: 'Europe/London (GMT/BST)', value: 'Europe/London' },
  { label: 'Europe/Paris (CET/CEST)', value: 'Europe/Paris' },
  { label: 'Asia/Dubai (GST +04:00)', value: 'Asia/Dubai' },
  { label: 'Asia/Singapore (SGT +08:00)', value: 'Asia/Singapore' },
  { label: 'Asia/Tokyo (JST +09:00)', value: 'Asia/Tokyo' },
  { label: 'Australia/Sydney (AEST/AEDT)', value: 'Australia/Sydney' },
  { label: 'UTC (Coordinated Universal Time)', value: 'UTC' },
];

export const BrandsPage: React.FC<BrandsPageProps> = ({
  brands,
  onCreateBrand,
  onUpdateBrand,
  onDeleteBrand,
  currentRole = 'Super Admin',
}) => {
  const permissions = getRolePermissions(currentRole);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'meta' | 'other'>('general');

  // Form Fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#059669');
  const [secondaryColor, setSecondaryColor] = useState('#10B981');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [country, setCountry] = useState('IN');
  const [defaultHashtags, setDefaultHashtags] = useState('');
  const [defaultKeywords, setDefaultKeywords] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Per-Brand Tokens
  const [metaAccessToken, setMetaAccessToken] = useState('');
  const [facebookPageId, setFacebookPageId] = useState('');
  const [facebookPageName, setFacebookPageName] = useState('');
  const [facebookPageToken, setFacebookPageToken] = useState('');
  const [instagramBusinessId, setInstagramBusinessId] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [linkedinUrn, setLinkedinUrn] = useState('');
  const [linkedinAccessToken, setLinkedinAccessToken] = useState('');
  const [xBearerToken, setXBearerToken] = useState('');
  const [youtubeChannelId, setYoutubeChannelId] = useState('');

  // UI state for verification
  const [showTokens, setShowTokens] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    user?: any;
    pages?: any[];
    error?: string;
  } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Open Modal for Create
  const handleOpenCreate = () => {
    setEditingBrand(null);
    setName('');
    setSlug('');
    setPrimaryColor('#059669');
    setSecondaryColor('#10B981');
    setTimezone('Asia/Kolkata');
    setCountry('IN');
    setDefaultHashtags('#FlowerPlant #IndoorPlants #GreenLife');
    setDefaultKeywords('plants, gardening, indoor plants');
    setLogoUrl('');
    setIsActive(true);

    setMetaAccessToken('');
    setFacebookPageId('');
    setFacebookPageName('');
    setFacebookPageToken('');
    setInstagramBusinessId('');
    setInstagramHandle('');
    setLinkedinUrn('');
    setLinkedinAccessToken('');
    setXBearerToken('');
    setYoutubeChannelId('');

    setVerificationResult(null);
    setActiveTab('general');
    setModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setName(brand.name);
    setSlug(brand.slug);
    setPrimaryColor(brand.primaryColor || '#059669');
    setSecondaryColor(brand.secondaryColor || '#10B981');
    setTimezone(brand.timezone || 'Asia/Kolkata');
    setCountry(brand.country || 'IN');
    setDefaultHashtags(brand.defaultHashtags || '');
    setDefaultKeywords(brand.defaultKeywords || '');
    setLogoUrl(brand.logoUrl || '');
    setIsActive(brand.isActive !== false);

    const t = brand.tokens || {};
    setMetaAccessToken(t.metaAccessToken || '');
    setFacebookPageId(t.facebookPageId || '');
    setFacebookPageName(t.facebookPageName || '');
    setFacebookPageToken(t.facebookPageToken || '');
    setInstagramBusinessId(t.instagramBusinessId || '');
    setInstagramHandle(t.instagramHandle || '');
    setLinkedinUrn(t.linkedinUrn || '');
    setLinkedinAccessToken(t.linkedinAccessToken || '');
    setXBearerToken(t.xBearerToken || '');
    setYoutubeChannelId(t.youtubeChannelId || '');

    setVerificationResult(null);
    setActiveTab('general');
    setModalOpen(true);
  };

  // Live Token Verification via Meta Graph API
  const handleVerifyMetaToken = async () => {
    if (!metaAccessToken.trim()) {
      setVerificationResult({ valid: false, error: 'Please enter a Meta Access Token first.' });
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const res = await api.verifyBrandToken('meta', metaAccessToken.trim());
      setVerificationResult(res);

      // If pages found and fields empty, auto-populate
      if (res.valid && res.pages && res.pages.length > 0) {
        const firstPage = res.pages[0];
        if (!facebookPageId) setFacebookPageId(firstPage.pageId);
        if (!facebookPageName) setFacebookPageName(firstPage.pageName);
        if (firstPage.instagramAccount && !instagramBusinessId) {
          setInstagramBusinessId(firstPage.instagramAccount.id);
          setInstagramHandle(`@${firstPage.instagramAccount.username}`);
        }
        showNotification(`Verified! Meta connected to page "${firstPage.pageName}"`);
      }
    } catch (err: any) {
      setVerificationResult({ valid: false, error: err.message || 'Token verification failed' });
    } finally {
      setIsVerifying(false);
    }
  };

  // Save Brand (Create or Update)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) return;

    const brandPayload = {
      name,
      slug: slug.toLowerCase().replace(/\s+/g, '-'),
      primaryColor,
      secondaryColor,
      timezone,
      country,
      defaultHashtags,
      defaultKeywords,
      logoUrl,
      isActive,
      tokens: {
        metaAccessToken: metaAccessToken.trim(),
        facebookPageId: facebookPageId.trim(),
        facebookPageName: facebookPageName.trim(),
        facebookPageToken: facebookPageToken.trim(),
        instagramBusinessId: instagramBusinessId.trim(),
        instagramHandle: instagramHandle.trim(),
        linkedinUrn: linkedinUrn.trim(),
        linkedinAccessToken: linkedinAccessToken.trim(),
        xBearerToken: xBearerToken.trim(),
        youtubeChannelId: youtubeChannelId.trim(),
      },
    };

    if (editingBrand) {
      if (onUpdateBrand) {
        onUpdateBrand(editingBrand.id, brandPayload);
        showNotification(`Brand "${name}" updated and tokens auto-synced to n8n automations!`);
      }
    } else {
      onCreateBrand(brandPayload);
      showNotification(`Brand "${name}" created and tokens registered for future multi-brand posting!`);
    }

    setModalOpen(false);
  };

  // Delete Brand
  const handleDelete = (brand: Brand) => {
    if (window.confirm(`Are you sure you want to delete brand "${brand.name}"? This will remove its connected channels and automations.`)) {
      if (onDeleteBrand) {
        onDeleteBrand(brand.id);
        showNotification(`Brand "${brand.name}" deleted.`);
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 bg-[#101828] text-white rounded-xl shadow-2xl border border-slate-700 text-xs animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#101828]">Brands & Credentials Management</h2>
          <p className="text-xs text-[#667085] mt-1">
            Configure multi-brand profiles, per-brand social media API tokens, and automatic n8n scheduler synchronization.
          </p>
        </div>
        {permissions.canManageBrands ? (
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2.5 bg-[#1336E8] hover:bg-[#0E27B3] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Brand</span>
          </button>
        ) : (
          <span className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-medium">
            View-Only ({currentRole})
          </span>
        )}
      </div>

      {/* Info Pill */}
      <div className="p-3.5 bg-[#F0F4FE] border border-[#D0DDFB] rounded-2xl flex items-center justify-between text-xs text-[#1336E8]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#1336E8] shrink-0" />
          <span>
            <strong>Multi-Brand Token Isolation:</strong> Each brand stores its own Facebook Page ID, Instagram Business ID, and API tokens. The n8n automation scheduler automatically injects the matching brand token at posting time.
          </span>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 bg-white rounded-lg border border-[#D0DDFB] font-semibold">
          {brands.length} {brands.length === 1 ? 'Brand' : 'Brands'} Active
        </span>
      </div>

      {/* Brands Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {brands.map(brand => {
          const t = brand.tokens || {};
          const hasMeta = !!(t.metaAccessToken || t.facebookPageId || t.instagramBusinessId);
          const hasLi = !!(t.linkedinUrn || t.linkedinAccessToken);
          const hasX = !!t.xBearerToken;
          const hasYt = !!(t.youtubeChannelId || t.youtubeAccessToken);

          return (
            <div
              key={brand.id}
              className="bg-white rounded-2xl border border-[#EAECF0] shadow-sm p-6 space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Brand Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-base shadow-sm shrink-0"
                      style={{ backgroundColor: brand.primaryColor || '#1336E8' }}
                    >
                      {brand.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#101828] leading-tight">{brand.name}</h3>
                      <span className="text-[11px] font-mono text-[#667085]">/{brand.slug}</span>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      brand.isActive !== false ? 'bg-[#ECFDF3] text-[#12B76A]' : 'bg-[#FEF3F2] text-[#D92D20]'
                    }`}
                  >
                    {brand.isActive !== false ? 'Active' : 'Paused'}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-2 text-xs text-[#475467] pt-4 mt-3 border-t border-[#EAECF0]">
                  <div className="flex justify-between items-center">
                    <span className="text-[#667085] flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Timezone:
                    </span>
                    <span className="font-mono text-[#101828] font-medium">{brand.timezone}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#667085]">Connected Channels:</span>
                    <span className="font-semibold text-[#1336E8]">
                      {brand.connectedAccountsCount || 0} channels
                    </span>
                  </div>
                </div>

                {/* Hashtags */}
                {brand.defaultHashtags && (
                  <div className="mt-3 p-2.5 rounded-xl bg-[#F6F8FC] border border-[#EAECF0] text-[11px] text-[#1336E8] font-medium truncate">
                    {brand.defaultHashtags}
                  </div>
                )}

                {/* Configured Platforms Status */}
                <div className="mt-4 pt-3 border-t border-[#EAECF0] space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-[#667085] tracking-wider block">
                    Brand Credentials
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {/* Facebook */}
                    <div
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold ${
                        t.facebookPageId || hasMeta
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-slate-50 text-slate-400 border border-slate-200'
                      }`}
                    >
                      <Facebook className="w-3 h-3" />
                      <span>FB: {t.facebookPageId ? t.facebookPageName || t.facebookPageId : 'Not Configured'}</span>
                    </div>

                    {/* Instagram */}
                    <div
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold ${
                        t.instagramBusinessId || hasMeta
                          ? 'bg-pink-50 text-pink-700 border border-pink-200'
                          : 'bg-slate-50 text-slate-400 border border-slate-200'
                      }`}
                    >
                      <Instagram className="w-3 h-3" />
                      <span>IG: {t.instagramHandle || t.instagramBusinessId || 'Not Configured'}</span>
                    </div>

                    {/* YouTube */}
                    {hasYt && (
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                        <Youtube className="w-3 h-3" />
                        <span>YouTube</span>
                      </div>
                    )}

                    {/* LinkedIn */}
                    {hasLi && (
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                        <Linkedin className="w-3 h-3" />
                        <span>LinkedIn</span>
                      </div>
                    )}

                    {/* X */}
                    {hasX && (
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-800 border border-slate-300">
                        <Twitter className="w-3 h-3" />
                        <span>X / Twitter</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {permissions.canManageBrands && (
                <div className="flex items-center justify-between pt-4 mt-2 border-t border-[#EAECF0]">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(brand)}
                    className="flex-1 py-2 px-3 bg-[#F6F8FC] hover:bg-[#EEF2F6] text-[#101828] font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-[#D0D5DD] transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[#1336E8]" />
                    <span>Edit Brand & Tokens</span>
                  </button>

                  {brands.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDelete(brand)}
                      className="p-2 ml-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Delete Brand"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add / Edit Brand Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#EAECF0] pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#101828]">
                  {editingBrand ? `Edit Brand: ${editingBrand.name}` : 'Create New Brand Profile'}
                </h3>
                <p className="text-xs text-[#667085] mt-1">
                  Manage brand identity, time zones, and social platform access tokens for automated multi-brand posting.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Navigation Tabs in Modal */}
            <div className="flex border-b border-[#EAECF0] gap-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('general')}
                className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'general'
                    ? 'border-[#1336E8] text-[#1336E8]'
                    : 'border-transparent text-[#667085] hover:text-[#101828]'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>General Profile</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('meta')}
                className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'meta'
                    ? 'border-[#1336E8] text-[#1336E8]'
                    : 'border-transparent text-[#667085] hover:text-[#101828]'
                }`}
              >
                <Key className="w-4 h-4" />
                <span>Meta (Facebook & Instagram) API</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('other')}
                className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
                  activeTab === 'other'
                    ? 'border-[#1336E8] text-[#1336E8]'
                    : 'border-transparent text-[#667085] hover:text-[#101828]'
                }`}
              >
                <Share2 className="w-4 h-4" />
                <span>Other Networks</span>
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* TAB 1: General Details */}
              {activeTab === 'general' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-semibold text-[#344054] block mb-1">Brand Name *</label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Flower Plant"
                        className="w-full h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs focus:ring-2 focus:ring-[#1336E8] focus:bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-[#344054] block mb-1">Slug / Identifier *</label>
                      <input
                        type="text"
                        value={slug}
                        onChange={e => setSlug(e.target.value)}
                        placeholder="e.g. flower-plant"
                        className="w-full h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#1336E8] focus:bg-white"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-semibold text-[#344054] block mb-1">Default Timezone (IANA) *</label>
                      <select
                        value={timezone}
                        onChange={e => setTimezone(e.target.value)}
                        className="w-full h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs focus:ring-2 focus:ring-[#1336E8] focus:bg-white"
                      >
                        {COMMON_TIMEZONES.map(tz => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </select>
                      <span className="text-[10px] text-[#667085] mt-1 block">
                        Posts for this brand scheduled at e.g. 10:30 PM will convert relative to this timezone.
                      </span>
                    </div>

                    <div>
                      <label className="font-semibold text-[#344054] block mb-1">Brand Color Accent</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={e => setPrimaryColor(e.target.value)}
                          className="w-12 h-10 rounded-xl cursor-pointer p-0.5 border border-[#D0D5DD]"
                        />
                        <input
                          type="text"
                          value={primaryColor}
                          onChange={e => setPrimaryColor(e.target.value)}
                          className="w-full h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-[#344054] block mb-1">Default Brand Hashtags</label>
                    <input
                      type="text"
                      value={defaultHashtags}
                      onChange={e => setDefaultHashtags(e.target.value)}
                      placeholder="e.g. #FlowerPlant #IndoorPlants #GreenLife #PlantCare"
                      className="w-full h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-[#344054] block mb-1">Default Keywords</label>
                    <input
                      type="text"
                      value={defaultKeywords}
                      onChange={e => setDefaultKeywords(e.target.value)}
                      placeholder="e.g. plants, indoor greenery, succulents"
                      className="w-full h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: Meta (Facebook & Instagram) API Tokens */}
              {activeTab === 'meta' && (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs">
                    <p className="font-semibold flex items-center gap-1.5">
                      <Facebook className="w-4 h-4 text-blue-600" />
                      Meta Graph API Configuration for this Brand
                    </p>
                    <p className="text-[11px] text-blue-800 mt-1">
                      Paste this brand's Meta User or Page Access Token. You can click <strong>Verify Live Token</strong> to test it immediately against Meta's Graph API and auto-fill page & IG details.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-[#344054]">Meta Access Token</label>
                      <button
                        type="button"
                        onClick={() => setShowTokens(!showTokens)}
                        className="text-[11px] text-[#1336E8] flex items-center gap-1 font-medium hover:underline"
                      >
                        {showTokens ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showTokens ? 'Mask Token' : 'Show Token'}</span>
                      </button>
                    </div>
                    <textarea
                      value={metaAccessToken}
                      onChange={e => setMetaAccessToken(e.target.value)}
                      placeholder="EAGVJejn6LZAgBS..."
                      rows={3}
                      className="w-full p-2.5 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#1336E8] focus:bg-white"
                    />
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-[#667085]">
                        Token is securely encrypted and used exclusively for this brand's scheduled posts.
                      </span>
                      <button
                        type="button"
                        onClick={handleVerifyMetaToken}
                        disabled={isVerifying || !metaAccessToken.trim()}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold text-[11px] flex items-center gap-1 transition-all"
                      >
                        <RefreshCw className={`w-3 h-3 ${isVerifying ? 'animate-spin' : ''}`} />
                        <span>{isVerifying ? 'Verifying...' : 'Verify Live Token'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Verification Feedback Banner */}
                  {verificationResult && (
                    <div
                      className={`p-3 rounded-xl border text-xs ${
                        verificationResult.valid
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50 border-rose-200 text-rose-900'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        {verificationResult.valid ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>Meta Token Verified & Active!</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-rose-600" />
                            <span>Token Verification Error</span>
                          </>
                        )}
                      </div>
                      <p className="text-[11px] mt-1">
                        {verificationResult.valid
                          ? `Identity confirmed for Meta account: ${verificationResult.user?.name || 'Verified User'} (ID: ${verificationResult.user?.id || 'Active'}). Found ${verificationResult.pages?.length || 0} pages.`
                          : verificationResult.error}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="font-semibold text-[#344054] block mb-1">Facebook Page ID</label>
                      <input
                        type="text"
                        value={facebookPageId}
                        onChange={e => setFacebookPageId(e.target.value)}
                        placeholder="e.g. 1454740611044963"
                        className="w-full h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-[#344054] block mb-1">Facebook Page Name</label>
                      <input
                        type="text"
                        value={facebookPageName}
                        onChange={e => setFacebookPageName(e.target.value)}
                        placeholder="e.g. Flower plant"
                        className="w-full h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="font-semibold text-[#344054] block mb-1">Instagram Business Account ID</label>
                      <input
                        type="text"
                        value={instagramBusinessId}
                        onChange={e => setInstagramBusinessId(e.target.value)}
                        placeholder="e.g. 17841439037630316"
                        className="w-full h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-[#344054] block mb-1">Instagram Handle</label>
                      <input
                        type="text"
                        value={instagramHandle}
                        onChange={e => setInstagramHandle(e.target.value)}
                        placeholder="e.g. @ciflow904"
                        className="w-full h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Other Social Networks */}
              {activeTab === 'other' && (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs">
                    <p className="font-semibold flex items-center gap-1.5">
                      <Share2 className="w-4 h-4 text-slate-700" />
                      Multi-Platform Credentials (LinkedIn, X, YouTube)
                    </p>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Configure individual brand credentials for LinkedIn, X (Twitter), and YouTube.
                    </p>
                  </div>

                  {/* LinkedIn */}
                  <div className="p-3 bg-[#F6F8FC] border border-[#EAECF0] rounded-xl space-y-3">
                    <div className="flex items-center gap-1.5 font-bold text-sky-800">
                      <Linkedin className="w-4 h-4 text-sky-700" />
                      <span>LinkedIn Profile / Company Page</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-[#344054] block mb-1">Organization URN / Author ID</label>
                        <input
                          type="text"
                          value={linkedinUrn}
                          onChange={e => setLinkedinUrn(e.target.value)}
                          placeholder="e.g. urn:li:organization:12345678"
                          className="w-full h-9 px-3 bg-white border border-[#D0D5DD] rounded-xl text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-[#344054] block mb-1">Access Token</label>
                        <input
                          type={showTokens ? 'text' : 'password'}
                          value={linkedinAccessToken}
                          onChange={e => setLinkedinAccessToken(e.target.value)}
                          placeholder="AQV..."
                          className="w-full h-9 px-3 bg-white border border-[#D0D5DD] rounded-xl text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* X / Twitter */}
                  <div className="p-3 bg-[#F6F8FC] border border-[#EAECF0] rounded-xl space-y-3">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <Twitter className="w-4 h-4 text-slate-900" />
                      <span>X (Twitter) v2 API</span>
                    </div>
                    <div>
                      <label className="font-semibold text-[#344054] block mb-1">Bearer Token / OAuth Token</label>
                      <input
                        type={showTokens ? 'text' : 'password'}
                        value={xBearerToken}
                        onChange={e => setXBearerToken(e.target.value)}
                        placeholder="AAAAAAAAAAAAAAAAAAAAA..."
                        className="w-full h-9 px-3 bg-white border border-[#D0D5DD] rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* YouTube */}
                  <div className="p-3 bg-[#F6F8FC] border border-[#EAECF0] rounded-xl space-y-3">
                    <div className="flex items-center gap-1.5 font-bold text-rose-800">
                      <Youtube className="w-4 h-4 text-rose-700" />
                      <span>YouTube Channel</span>
                    </div>
                    <div>
                      <label className="font-semibold text-[#344054] block mb-1">Channel ID</label>
                      <input
                        type="text"
                        value={youtubeChannelId}
                        onChange={e => setYoutubeChannelId(e.target.value)}
                        placeholder="e.g. UC_x5XG1OV2P6uZZ5FSM9Ttw"
                        className="w-full h-9 px-3 bg-white border border-[#D0D5DD] rounded-xl text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-[#EAECF0]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 border border-[#D0D5DD] hover:bg-[#F2F4F7] rounded-xl text-xs font-semibold text-[#344054] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#1336E8] hover:bg-[#0E27B3] text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingBrand ? 'Save Brand & Auto-Sync Automations' : 'Create Brand & Register Tokens'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
