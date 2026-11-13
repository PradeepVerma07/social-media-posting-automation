import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Building2,
  Share2,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  Loader2,
  Send,
  Plus,
  Trash2,
  ExternalLink,
  Image as ImageIcon,
  Video,
  Film,
  Sparkles,
  RefreshCw,
  AtSign,
  Hash,
  Smile,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react';
import { Brand, SocialAccount, RoleName } from '../../../server/src/types';
import { NavigationTab } from '../../components/layout/Sidebar';
import { api } from '../../api/client';

interface InstantBrandPublisherProps {
  brands: Brand[];
  socialAccounts: SocialAccount[];
  currentRole?: RoleName;
  onPostPublished?: () => void;
  onNavigateToTab?: (tab: NavigationTab) => void;
}

export const InstantBrandPublisher: React.FC<InstantBrandPublisherProps> = ({
  brands = [],
  socialAccounts = [],
  currentRole = 'Super Admin',
  onPostPublished,
  onNavigateToTab,
}) => {
  // Brand selection - default to first active brand or brand with connected accounts
  const activeBrands = brands.filter(b => b.isActive);
  const preferredBrand =
    activeBrands.find(b => socialAccounts.some(a => a.brandId === b.id && a.connectionStatus === 'connected')) ||
    activeBrands[0] ||
    brands[0];

  const [selectedBrandId, setSelectedBrandId] = useState<number>(preferredBrand?.id ?? 0);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  
  // Post Details
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [taggedUsers, setTaggedUsers] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [placement, setPlacement] = useState<'feed' | 'reels_shorts' | 'story'>('feed');

  // Media Management
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [mediaUrl, setMediaUrl] = useState('');
  const [carouselUrls, setCarouselUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Submission & Results
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const carouselInputRef = useRef<HTMLInputElement>(null);

  const currentBrand = brands.find(b => b.id === selectedBrandId) || preferredBrand;

  // Filter accounts for the currently selected brand
  const brandAccounts = socialAccounts.filter(a => a.brandId === selectedBrandId);
  const connectedAccounts = brandAccounts.filter(a => a.connectionStatus === 'connected');
  const disconnectedAccounts = brandAccounts.filter(a => a.connectionStatus !== 'connected');

  // Automatically select all connected accounts whenever the selected brand changes
  useEffect(() => {
    if (selectedBrandId) {
      const activeAccountIds = socialAccounts
        .filter(a => a.brandId === selectedBrandId && a.connectionStatus === 'connected')
        .map(a => a.accountId || String(a.id));
      setSelectedAccountIds(activeAccountIds);
      setPublishResult(null);
      setPublishError(null);
    }
  }, [selectedBrandId, socialAccounts]);

  // Quick Emoji helpers
  const emojis = ['🔥', '✨', '🚀', '💡', '🌿', '🎯', '📢', '💬', '🌟', '📈', '👏', '⚡'];
  const handleInsertEmoji = (emoji: string) => {
    setCaption(prev => prev + ' ' + emoji);
  };

  // Popular hashtag pills
  const popularHashtags = [
    '#trending',
    '#viral',
    '#reels',
    '#business',
    '#innovation',
    '#growth',
    '#marketing',
    '#socialmedia',
    '#newpost',
  ];
  const handleToggleHashtag = (tag: string) => {
    const tags = hashtags ? hashtags.split(/[\s,]+/).filter(Boolean) : [];
    if (tags.includes(tag)) {
      setHashtags(tags.filter(t => t !== tag).join(' '));
    } else {
      setHashtags([...tags, tag].join(' '));
    }
  };

  // Toggle account selection
  const handleToggleAccount = (id: string) => {
    setSelectedAccountIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Upload single media handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const isVid = file.type.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(file.name);
      const detectedType = isVid ? 'video' : 'image';
      setMediaType(detectedType);
      if (detectedType === 'video' && placement === 'feed') {
        // Automatically switch to reels_shorts if video is uploaded for maximum impact
        setPlacement('reels_shorts');
      }

      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await api.uploadMedia({
        filename: file.name,
        fileData: base64Data,
        mimeType: file.type || (isVid ? 'video/mp4' : 'image/jpeg'),
      });

      if (res && res.url) {
        setMediaUrl(res.url);
        setUploadSuccess(`Successfully uploaded ${file.name} (${detectedType})`);
      } else {
        throw new Error('Upload succeeded but no public URL was returned.');
      }
    } catch (err: any) {
      console.error('Media upload error:', err);
      setUploadError(err.message || 'Failed to upload media file. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Add carousel image slide
  const handleCarouselUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;

    if (carouselUrls.length + files.length > 10) {
      setUploadError('Carousel posts support up to 10 images maximum.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        const base64Data = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const res = await api.uploadMedia({
          filename: file.name,
          fileData: base64Data,
          mimeType: file.type || 'image/jpeg',
        });

        if (res && res.url) {
          newUrls.push(res.url);
        }
      }

      setCarouselUrls(prev => [...prev, ...newUrls]);
      setMediaType('image');
      setUploadSuccess(`Added ${newUrls.length} image(s) to carousel.`);
    } catch (err: any) {
      console.error('Carousel upload error:', err);
      setUploadError(err.message || 'Failed to upload carousel media.');
    } finally {
      setIsUploading(false);
      if (carouselInputRef.current) carouselInputRef.current.value = '';
    }
  };

  const handleRemoveCarouselItem = (index: number) => {
    setCarouselUrls(prev => prev.filter((_, i) => i !== index));
  };

  // One-Click Instant Publish Handler
  const handleInstantPublish = async () => {
    setPublishError(null);
    setPublishResult(null);

    if (!selectedBrandId) {
      setPublishError('Please select a brand.');
      return;
    }

    if (!title.trim()) {
      setPublishError('Please provide a post title.');
      return;
    }

    if (!caption.trim()) {
      setPublishError('Please enter a caption for your post.');
      return;
    }

    const effectiveMediaUrls =
      placement === 'feed' && carouselUrls.length > 0
        ? carouselUrls
        : mediaUrl
        ? [mediaUrl]
        : [];

    if (effectiveMediaUrls.length === 0) {
      setPublishError('Please upload an image or video before publishing.');
      return;
    }

    if (selectedAccountIds.length === 0) {
      setPublishError(
        'No connected channels selected. Please connect Facebook or Instagram for this brand.'
      );
      return;
    }

    setIsPublishing(true);

    try {
      const isCarousel = placement === 'feed' && effectiveMediaUrls.length > 1;
      const effectiveMediaType = isCarousel ? 'carousel' : mediaType;

      const payload = {
        brandId: selectedBrandId,
        title: title.trim(),
        masterCaption: caption.trim(),
        caption: caption.trim(),
        hashtags: hashtags ? hashtags.split(/[\s,]+/).filter(Boolean) : [],
        mediaUrls: effectiveMediaUrls,
        media: effectiveMediaUrls.map(url => ({
          fileUrl: url,
          mediaType: effectiveMediaType,
        })),
        mediaType: effectiveMediaType,
        linkUrl: targetUrl.trim() || undefined,
        placement,
        placements: [placement],
        publishNow: true,
        publishImmediately: true,
        submitForApproval: false,
        accountIds: selectedAccountIds,
        taggedUsers: taggedUsers ? taggedUsers.split(/[\s,]+/).filter(Boolean) : [],
      };

      const result = await api.createPost(payload);
      setPublishResult(result);

      if (onPostPublished) {
        onPostPublished();
      }
    } catch (err: any) {
      console.error('Instant publish failed:', err);
      setPublishError(
        err.message || 'Failed to publish post immediately. Please verify account permissions.'
      );
    } finally {
      setIsPublishing(false);
    }
  };

  // Reset form for next post
  const handleReset = () => {
    setTitle('');
    setCaption('');
    setHashtags('');
    setTaggedUsers('');
    setTargetUrl('');
    setMediaUrl('');
    setCarouselUrls([]);
    setPublishResult(null);
    setPublishError(null);
    setUploadError(null);
    setUploadSuccess(null);
  };

  return (
    <div className="flex-1 bg-slate-50 min-h-screen p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <header className="rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold text-yellow-300 uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 fill-yellow-300" />
              Instant Direct Posting • No Approval Gate
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Instant Brand Direct Post
            </h1>
            <p className="text-sm text-blue-100 leading-relaxed">
              Select any brand to automatically engage all connected channels. Upload your visual or video, and publish directly to live Facebook Pages and Instagram handles instantly.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => onNavigateToTab('accounts')}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-all flex items-center gap-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                Manage Channels
              </button>
            )}
            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => onNavigateToTab('published')}
                className="px-4 py-2.5 rounded-xl bg-white text-blue-900 hover:bg-blue-50 font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                View Published Posts
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Grid: Left Editor & Right Live Preview / Result */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form & Configuration (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Step 1: Brand Selection Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">1. Select Target Brand</h2>
                  <p className="text-xs text-slate-500">
                    Accounts connected to this brand are automatically selected
                  </p>
                </div>
              </div>

              {currentBrand && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: currentBrand.primaryColor || '#1336E8' }}
                  />
                  <span>Timezone: {currentBrand.timezone || 'Asia/Kolkata'}</span>
                </div>
              )}
            </div>

            {/* Brand Dropdown */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Brand Portfolio
              </label>
              <select
                value={selectedBrandId}
                onChange={e => setSelectedBrandId(Number(e.target.value))}
                className="w-full h-12 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer shadow-sm"
              >
                {brands.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} {!b.isActive ? '(Inactive)' : ''} — {b.slug}
                  </option>
                ))}
              </select>
            </div>

            {/* Connected Social Accounts Auto-Detect Badge Strip */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-blue-600" />
                  Auto-Connected Publishing Targets ({selectedAccountIds.length} Active)
                </span>
                <span className="text-[11px] text-slate-500">
                  Click any account to toggle
                </span>
              </div>

              {connectedAccounts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {connectedAccounts.map(account => {
                    const accId = account.accountId || String(account.id);
                    const isSelected = selectedAccountIds.includes(accId);
                    return (
                      <button
                        type="button"
                        key={accId}
                        onClick={() => handleToggleAccount(accId)}
                        className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-400 text-blue-950 shadow-sm ring-1 ring-blue-400'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isSelected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                            }`}
                          />
                          <div className="truncate">
                            <p className="text-xs font-bold truncate">
                              {account.accountName || account.platform}
                            </p>
                            <p className="text-[11px] opacity-75 capitalize">
                              {account.platform} • {account.accountHandle || 'Connected'}
                            </p>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'border border-slate-300 text-transparent'
                          }`}
                        >
                          ✓
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    No active social accounts connected for {currentBrand?.name || 'this brand'}.
                  </div>
                  <p>
                    Connect your Facebook Page, Instagram, or WhatsApp in the Social Accounts tab with your Meta Token so this brand can publish directly.
                  </p>
                  {onNavigateToTab && (
                    <button
                      type="button"
                      onClick={() => onNavigateToTab('accounts')}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 transition-colors cursor-pointer"
                    >
                      Connect Meta Channels Now →
                    </button>
                  )}
                </div>
              )}

              {disconnectedAccounts.length > 0 && connectedAccounts.length > 0 && (
                <p className="text-[11px] text-slate-400 mt-2">
                  {disconnectedAccounts.length} channel(s) are currently disconnected (
                  {disconnectedAccounts.map(a => a.platform).join(', ')}).
                </p>
              )}
            </div>
          </div>

          {/* Step 2: Content Composer Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">2. Craft Your Content</h2>
                  <p className="text-xs text-slate-500">
                    Provide title, caption, hashtags, and media
                  </p>
                </div>
              </div>

              {/* Format / Placement Selector */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPlacement('feed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    placement === 'feed'
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📱 Feed Post
                </button>
                <button
                  type="button"
                  onClick={() => setPlacement('reels_shorts')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    placement === 'reels_shorts'
                      ? 'bg-white text-purple-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🎬 Reels / Shorts
                </button>
                <button
                  type="button"
                  onClick={() => setPlacement('story')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    placement === 'story'
                      ? 'bg-white text-rose-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ⏱️ 24h Story
                </button>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Post Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g., Exciting Launch: New Plant Arrivals This Weekend!"
                className="w-full h-11 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Caption */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Post Caption & Body *
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  {caption.length} / 5,000 characters
                </span>
              </div>
              <textarea
                rows={4}
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Write an engaging caption with details, features, or call to action..."
                className="w-full rounded-2xl border border-slate-300 bg-white p-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-y"
              />

              {/* Emoji bar */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Smile className="w-3.5 h-3.5" /> Emoji:
                </span>
                {emojis.map(e => (
                  <button
                    type="button"
                    key={e}
                    onClick={() => handleInsertEmoji(e)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Hashtags and Tagging */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-blue-600" />
                  Hashtags
                </label>
                <input
                  type="text"
                  value={hashtags}
                  onChange={e => setHashtags(e.target.value)}
                  placeholder="#nature #organic #growth"
                  className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <AtSign className="w-3.5 h-3.5 text-purple-600" />
                  Tagged Users / Collaborators
                </label>
                <input
                  type="text"
                  value={taggedUsers}
                  onChange={e => setTaggedUsers(e.target.value)}
                  placeholder="@partner_brand @creator"
                  className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Quick Hashtag Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400">Quick Tags:</span>
              {popularHashtags.map(tag => {
                const isSelected = hashtags.includes(tag);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => handleToggleHashtag(tag)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            {/* Optional Call to Action Link */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                Target Link / Call to Action URL (Optional)
              </label>
              <input
                type="url"
                value={targetUrl}
                onChange={e => setTargetUrl(e.target.value)}
                placeholder="https://example.com/product-page"
                className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Step 3: Media Upload Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
                  {mediaType === 'video' ? <Film className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">3. Media Asset (Image or Video)</h2>
                  <p className="text-xs text-slate-500">
                    Upload your high-res visual, 9:16 vertical video, or multi-slide carousel
                  </p>
                </div>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                    mediaType === 'video'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {mediaType}
                </span>
              </div>
            </div>

            {/* Upload Area */}
            {placement === 'feed' && carouselUrls.length > 0 ? (
              /* Carousel Multi-Slide Management */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Carousel Slides ({carouselUrls.length} / 10 images)
                  </span>
                  <button
                    type="button"
                    onClick={() => carouselInputRef.current?.click()}
                    disabled={carouselUrls.length >= 10 || isUploading}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add More Slides
                  </button>
                  <input
                    ref={carouselInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleCarouselUpload}
                    className="hidden"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {carouselUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative rounded-2xl overflow-hidden border border-slate-200 group aspect-square bg-slate-100"
                    >
                      <img
                        src={url}
                        alt={`Slide ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold">
                        Slide {idx + 1}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCarouselItem(idx)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-600/90 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-700 cursor-pointer"
                        title="Remove Slide"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : mediaUrl ? (
              /* Single Media Preview with Replace Button */
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 max-h-80 flex items-center justify-center">
                  {mediaType === 'video' ? (
                    <video
                      src={mediaUrl}
                      controls
                      className="max-h-80 w-auto rounded-xl mx-auto"
                    />
                  ) : (
                    <img
                      src={mediaUrl}
                      alt="Uploaded media"
                      className="max-h-80 w-auto object-contain rounded-xl mx-auto"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setMediaUrl('')}
                    className="absolute top-3 right-3 p-2 rounded-xl bg-rose-600/90 hover:bg-rose-700 text-white shadow-md transition-all cursor-pointer"
                    title="Remove and replace media"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 truncate font-mono">
                  Media Source: {mediaUrl}
                </p>
              </div>
            ) : (
              /* Dropzone for Uploading */
              <div className="space-y-3">
                <div
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-3xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/30 flex flex-col items-center justify-center space-y-3"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/mp4,video/quicktime,video/webm"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-2xl bg-blue-100/80 text-blue-700 flex items-center justify-center shadow-sm">
                    {isUploading ? (
                      <Loader2 className="w-7 h-7 animate-spin" />
                    ) : (
                      <UploadCloud className="w-7 h-7" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      {isUploading
                        ? 'Uploading & Processing Media Asset...'
                        : 'Click to upload your image or video'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Supports MP4, MOV, WebM, PNG, JPG, WebP (Max 50MB)
                    </p>
                  </div>
                </div>

                {/* Or Paste Direct HTTPS URL */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={e => {
                      setMediaUrl(e.target.value);
                      const isVid = /\.(mp4|mov|webm)$/i.test(e.target.value);
                      setMediaType(isVid ? 'video' : 'image');
                    }}
                    placeholder="Or paste direct HTTPS media URL (https://...)"
                    className="flex-1 h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {placement === 'feed' && (
                    <button
                      type="button"
                      onClick={() => carouselInputRef.current?.click()}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Layers className="w-4 h-4 text-slate-600" />
                      Carousel Mode
                    </button>
                  )}
                </div>
              </div>
            )}

            {uploadSuccess && (
              <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {uploadSuccess}
              </p>
            )}

            {uploadError && (
              <p className="text-xs font-semibold text-rose-600 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                {uploadError}
              </p>
            )}
          </div>

          {/* Step 4: Publish Action Card */}
          <div className="bg-gradient-to-br from-white to-blue-50/50 rounded-3xl border border-blue-200 p-6 shadow-md space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Ready to Publish Instantly?
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  This action bypasses the review queue and pushes live content immediately to the {selectedAccountIds.length} connected channel(s) for <strong>{currentBrand?.name}</strong>.
                </p>
              </div>

              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                No Approval Delay
              </span>
            </div>

            {publishError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Publishing Notice</p>
                  <p className="mt-0.5 leading-relaxed">{publishError}</p>
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={isPublishing || selectedAccountIds.length === 0}
              onClick={handleInstantPublish}
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-700 hover:from-blue-800 hover:via-indigo-700 hover:to-purple-800 text-white font-extrabold text-sm shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Publishing Live to Connected Brand Channels...</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 fill-yellow-300 text-yellow-300" />
                  <span>
                    🚀 Publish Instantly to {currentBrand?.name || 'Selected Brand'} (No Approval Needed)
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Live Mockup Preview & Execution Feedback (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Post-Publish Result Banner if Published */}
          {publishResult && (
            <div className="bg-white rounded-3xl border-2 border-emerald-400 p-6 shadow-xl space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-3 text-emerald-700">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Post Published Successfully!
                  </h3>
                  <p className="text-xs text-emerald-700 font-medium">
                    Published without approval delay to {currentBrand?.name}
                  </p>
                </div>
              </div>

              {/* Target Results */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Live Channel Status
                </p>

                {publishResult.targets && publishResult.targets.length > 0 ? (
                  publishResult.targets.map((tgt: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs py-1.5 border-b border-slate-200 last:border-0"
                    >
                      <span className="font-semibold capitalize text-slate-800">
                        {tgt.platform}:
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            tgt.status === 'Posted'
                              ? 'bg-emerald-100 text-emerald-800'
                              : tgt.status === 'Processing' || tgt.status === 'Scheduled'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {tgt.status}
                        </span>
                        {tgt.postUrl && (
                          <a
                            href={tgt.postUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold underline"
                          >
                            View Post ↗
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-600">
                    Direct publish initiated. Target confirmation registered in system.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  Create Another Post
                </button>
                {onNavigateToTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateToTab('published')}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    Published Archive <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Social Live Feed Mockup Preview Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                Live Post Simulation
              </span>
              <span className="text-[11px] text-slate-400">
                {placement === 'feed'
                  ? 'Feed Format'
                  : placement === 'reels_shorts'
                  ? 'Reels (9:16)'
                  : 'Story (24h)'}
              </span>
            </div>

            {/* Smartphone / Feed Card Shell */}
            <div className="border border-slate-200 rounded-3xl overflow-hidden bg-white shadow-md">
              {/* Post Header */}
              <div className="p-4 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-sm"
                    style={{ backgroundColor: currentBrand?.primaryColor || '#1336E8' }}
                  >
                    {currentBrand?.name ? currentBrand.name.slice(0, 2).toUpperCase() : 'BP'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 leading-tight">
                      {currentBrand?.name || 'Brand Name'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Direct Live Post • Just now
                    </p>
                  </div>
                </div>

                <div className="text-slate-400 font-bold">•••</div>
              </div>

              {/* Media Visual Area */}
              <div className="bg-slate-950 aspect-square flex items-center justify-center relative overflow-hidden">
                {placement === 'feed' && carouselUrls.length > 0 ? (
                  <img
                    src={carouselUrls[0]}
                    alt="First slide"
                    className="w-full h-full object-cover"
                  />
                ) : mediaUrl ? (
                  mediaType === 'video' ? (
                    <video
                      src={mediaUrl}
                      controls
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img
                      src={mediaUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <div className="text-center p-6 text-slate-500 space-y-2">
                    <ImageIcon className="w-10 h-10 mx-auto text-slate-600 opacity-60" />
                    <p className="text-xs font-medium">No media uploaded yet</p>
                    <p className="text-[11px] opacity-75">Upload an asset to preview</p>
                  </div>
                )}

                {placement === 'feed' && carouselUrls.length > 1 && (
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/70 text-white text-[10px] font-bold">
                    1/{carouselUrls.length}
                  </div>
                )}
              </div>

              {/* Post Content & Caption */}
              <div className="p-4 space-y-2 text-xs">
                {title && (
                  <p className="font-extrabold text-slate-900 text-sm">
                    {title}
                  </p>
                )}

                <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {caption || 'Your caption text will appear here...'}
                </p>

                {hashtags && (
                  <p className="text-blue-600 font-semibold text-[11px]">
                    {hashtags}
                  </p>
                )}

                {taggedUsers && (
                  <p className="text-purple-600 font-semibold text-[11px]">
                    With {taggedUsers}
                  </p>
                )}

                {targetUrl && (
                  <p className="text-[11px] text-blue-700 font-semibold flex items-center gap-1 pt-1 truncate">
                    <ExternalLink className="w-3 h-3" />
                    {targetUrl}
                  </p>
                )}
              </div>
            </div>

            {/* Explanatory notes */}
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 text-blue-900 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <Info className="w-4 h-4 text-blue-600" />
                How Instant Publishing Works
              </div>
              <p className="text-[11px] leading-relaxed text-blue-800">
                1. Clicking <strong>Publish Instantly</strong> automatically marks the post version as approved by your admin credential.
              </p>
              <p className="text-[11px] leading-relaxed text-blue-800">
                2. The system executes immediate publishing to Facebook and Instagram Meta Graph nodes without any queue delay.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
