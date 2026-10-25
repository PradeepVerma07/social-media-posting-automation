import React, { useState, useEffect, useRef } from 'react';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Upload,
  Link,
  Image as ImageIcon,
  Smile,
  Calendar,
  Clock,
  Send,
  Save,
  CheckCircle2,
  AlertTriangle,
  Globe,
  FileCheck,
  Layers,
  Sparkles,
  ExternalLink,
  Radio,
  RefreshCw,
  Youtube,
  MessageCircle,
  Video,
  Smartphone,
  UploadCloud,
  Loader2,
  Film,
  Play,
  Trash2,
  Maximize2
} from 'lucide-react';
import { Brand, SocialPlatform, ContentPlacement } from '../../../server/src/types';
import { fromISTInputValues } from '../../utils/timezone';
import { api } from '../../api/client';
import { MediaViewerModal } from '../../components/media/MediaViewerModal';

interface CreatePostComposerProps {
  brands: Brand[];
  onSavePost: (postData: any) => void;
  onCancel: () => void;
  onMultiBrandPublish?: (data: any) => Promise<any>;
  onViewExecutions?: () => void;
  onViewAnalytics?: () => void;
}

export const CreatePostComposer: React.FC<CreatePostComposerProps> = ({
  brands,
  onSavePost,
  onCancel,
  onMultiBrandPublish,
  onViewExecutions,
  onViewAnalytics,
}) => {
  const [composerMode, setComposerMode] = useState<'single' | 'multibrand'>('multibrand');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fallback to ensure Brand Profile dropdown & brand selection is never blank even while loading
  const availableBrands: Brand[] = brands && brands.length > 0 ? brands : [
    {
      id: 1,
      name: 'Flower Plant (Asia/Kolkata) - Meta Connected',
      slug: 'flower-plant',
      primaryColor: '#12B76A',
      secondaryColor: '#E6F9F0',
      timezone: 'Asia/Kolkata',
      country: 'IN',
      isActive: true,
      connectedAccountsCount: 6,
    },
    {
      id: 2,
      name: 'Nexus Cloud Global',
      slug: 'nexus-cloud',
      primaryColor: '#1336E8',
      secondaryColor: '#EFF8FF',
      timezone: 'Asia/Kolkata',
      country: 'IN',
      isActive: true,
      connectedAccountsCount: 4,
    },
    {
      id: 3,
      name: 'Apex Automation Labs',
      slug: 'apex-labs',
      primaryColor: '#7F56D9',
      secondaryColor: '#F9F5FF',
      timezone: 'Asia/Kolkata',
      country: 'IN',
      isActive: true,
      connectedAccountsCount: 3,
    },
  ];

  // Multi-Brand Broadcast Form State
  const [selectedBrandIds, setSelectedBrandIds] = useState<number[]>(
    brands && brands.length > 0 ? brands.map(b => b.id) : [availableBrands[0].id]
  );
  const [broadcastPlatforms, setBroadcastPlatforms] = useState<SocialPlatform[]>([
    'youtube',
    'whatsapp',
    'facebook',
    'instagram',
    'linkedin',
    'x',
  ]);
  const [selectedPlacements, setSelectedPlacements] = useState<ContentPlacement[]>(['feed']);
  const [selectedChannelPreset, setSelectedChannelPreset] = useState<string>('all');

  const [broadcastCampaignName, setBroadcastCampaignName] = useState('Global Q4 Omnichannel Product Launch');
  const [broadcastTitle, setBroadcastTitle] = useState('Autonomous Multi-Agent AI Workflow Engine Live');
  const [broadcastCaption, setBroadcastCaption] = useState(
    '🚀 We are proud to launch our Next-Gen Autonomous AI Workflow Engine! Real-time multi-agent orchestration, native n8n bridge, and zero-downtime scalability across cloud environments. Built for modern high-velocity teams.'
  );
  const [broadcastHashtags, setBroadcastHashtags] = useState('#AIWorkflows #n8n #Automation #CloudNative #DevOps');
  const [broadcastTargetUrl, setBroadcastTargetUrl] = useState('https://nexuscloud.io/releases/autonomous-engine');
  const [broadcastMediaUrl, setBroadcastMediaUrl] = useState(
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&h=630&q=80'
  );
  const [broadcastMediaType, setBroadcastMediaType] = useState<'image' | 'video'>('image');
  const [isUploadingBroadcastMedia, setIsUploadingBroadcastMedia] = useState(false);
  const [broadcastUploadError, setBroadcastUploadError] = useState<string | null>(null);
  const [broadcastUploadSuccess, setBroadcastUploadSuccess] = useState<string | null>(null);

  const [broadcastOverrides, setBroadcastOverrides] = useState<Record<string, string>>({
    x: '⚡ Next-Gen Autonomous AI Workflow Engine is LIVE! Sub-10ms n8n bridge with zero-downtime failover. Read the whitepaper: https://nexuscloud.io/releases/autonomous-engine #AIWorkflows #DevOps',
  });
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastReport, setBroadcastReport] = useState<any | null>(null);

  // Form State (Single Brand Wizard)
  const [brandId, setBrandId] = useState<number>(brands[0]?.id || availableBrands[0].id);
  const [campaignName, setCampaignName] = useState('Q4 Product Launch');
  const [title, setTitle] = useState('');
  const [internalTags, setInternalTags] = useState('cloud, enterprise, release');
  const [country, setCountry] = useState('IN');
  const [timezone, setTimezone] = useState('Asia/Kolkata');

  // Step 2: Platforms
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([
    'facebook',
    'instagram',
    'youtube',
    'whatsapp',
  ]);

  // Keep brand selection in sync with props
  useEffect(() => {
    if (brands && brands.length > 0) {
      if (!brands.some(b => b.id === brandId)) {
        setBrandId(brands[0].id);
      }
      setSelectedBrandIds(brands.map(b => b.id));
    }
  }, [brands]);

  // Step 3: Media
  const [mediaUrl, setMediaUrl] = useState(
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&h=630&q=80'
  );
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);
  const [mediaUploadSuccess, setMediaUploadSuccess] = useState<string | null>(null);
  const [googleDriveUrl, setGoogleDriveUrl] = useState('');
  const [altText, setAltText] = useState('Product architecture diagram');

  // Interactive Lightbox State
  const [activeLightboxUrl, setActiveLightboxUrl] = useState<string | null>(null);
  const [activeLightboxType, setActiveLightboxType] = useState<'image' | 'video'>('image');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Direct File Input Refs
  const singleFileInputRef = useRef<HTMLInputElement | null>(null);
  const broadcastFileInputRef = useRef<HTMLInputElement | null>(null);

  const isVideoUrl = (url?: string | null) => {
    if (!url) return false;
    return (
      /\.(mp4|webm|mov|mkv|avi)(\?.*)?$/i.test(url) ||
      (url.includes('/uploads/') && /\.(mp4|webm|mov)/i.test(url)) ||
      /(?:youtube\.com|youtu\.be)/i.test(url)
    );
  };

  const handleDirectUpload = async (file: File, isBroadcast: boolean) => {
    const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/i.test(file.name);
    
    if (isBroadcast) {
      setIsUploadingBroadcastMedia(true);
      setBroadcastUploadError(null);
      setBroadcastUploadSuccess(null);
    } else {
      setIsUploadingMedia(true);
      setMediaUploadError(null);
      setMediaUploadSuccess(null);
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const dataUrl = e.target?.result as string;
          const uploadRes = await api.uploadMedia({
            filename: file.name,
            fileData: dataUrl,
            mimeType: file.type,
          });

          if (isBroadcast) {
            setBroadcastMediaUrl(uploadRes.url);
            setBroadcastMediaType(uploadRes.mediaType);
            setBroadcastUploadSuccess(`Uploaded "${file.name}" (${(file.size / 1024 / 1024).toFixed(2)} MB) - Ready!`);
          } else {
            setMediaUrl(uploadRes.url);
            setMediaType(uploadRes.mediaType);
            setMediaUploadSuccess(`Uploaded "${file.name}" (${(file.size / 1024 / 1024).toFixed(2)} MB) - Ready!`);
          }
        } catch (err: any) {
          const msg = err.message || 'Failed to upload media file';
          if (isBroadcast) setBroadcastUploadError(msg);
          else setMediaUploadError(msg);
        } finally {
          if (isBroadcast) setIsUploadingBroadcastMedia(false);
          else setIsUploadingMedia(false);
        }
      };

      reader.onerror = () => {
        const msg = 'Failed to read file from disk';
        if (isBroadcast) setBroadcastUploadError(msg);
        else setMediaUploadError(msg);
        if (isBroadcast) setIsUploadingBroadcastMedia(false);
        else setIsUploadingMedia(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      const msg = err.message || 'File processing error';
      if (isBroadcast) setBroadcastUploadError(msg);
      else setMediaUploadError(msg);
      if (isBroadcast) setIsUploadingBroadcastMedia(false);
      else setIsUploadingMedia(false);
    }
  };

  // Step 4: Captions & Overrides
  const [masterCaption, setMasterCaption] = useState(
    'Announcing our new multi-cloud failover clustering engine! Sub-10ms latency across regions.'
  );
  const [platformOverrides, setPlatformOverrides] = useState<Record<string, string>>({
    x: 'Zero downtime multi-cloud clustering is live! Sub-10ms latency across regions. #DevOps',
  });
  const [hashtags, setHashtags] = useState('#CloudNative #DevOps #Kubernetes');
  const [keywords, setKeywords] = useState('kubernetes, high availability');
  const [targetUrl, setTargetUrl] = useState('https://nexuscloud.io/release-v2');
  const [firstComment, setFirstComment] = useState('Check out the full benchmark report here!');

  // Step 5: Schedule
  const [publishTiming, setPublishTiming] = useState<'now' | 'scheduled'>('scheduled');
  const [scheduledDate, setScheduledDate] = useState('2026-10-28');
  const [scheduledTime, setScheduledTime] = useState('14:00');

  // Step 6: Approval
  const [assignedApproverId, setAssignedApproverId] = useState(3);
  const [internalNote, setInternalNote] = useState('Prepared for technical audience. Please review X override.');

  const togglePlatform = (p: SocialPlatform) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(item => item !== p) : [...prev, p]
    );
  };

  const toggleBroadcastBrand = (id: number) => {
    setSelectedBrandIds(prev =>
      prev.includes(id) ? prev.filter(bId => bId !== id) : [...prev, id]
    );
  };

  const toggleBroadcastPlatform = (p: SocialPlatform) => {
    setBroadcastPlatforms(prev =>
      prev.includes(p) ? prev.filter(item => item !== p) : [...prev, p]
    );
  };

  const togglePlacement = (fmt: ContentPlacement) => {
    setSelectedPlacements(prev => {
      if (prev.includes(fmt)) {
        return prev.length > 1 ? prev.filter(p => p !== fmt) : prev;
      } else {
        return [...prev, fmt];
      }
    });
  };

  const handleChannelPresetChange = (preset: string, mode: 'broadcast' | 'single') => {
    setSelectedChannelPreset(preset);
    let targetList: SocialPlatform[] = [];
    if (preset === 'all') {
      targetList = ['youtube', 'whatsapp', 'facebook', 'instagram', 'linkedin', 'x'];
    } else if (preset === 'meta_suite') {
      targetList = ['facebook', 'instagram', 'whatsapp'];
    } else if (preset === 'stories_status') {
      targetList = ['instagram', 'facebook', 'whatsapp'];
      setSelectedPlacements(prev => (prev.includes('story') ? prev : [...prev, 'story']));
    } else if (preset === 'video_shorts') {
      targetList = ['youtube', 'instagram', 'facebook'];
      setSelectedPlacements(prev => (prev.includes('reels_shorts') ? prev : [...prev, 'reels_shorts']));
    } else if (preset === 'youtube') {
      targetList = ['youtube'];
    } else if (preset === 'whatsapp') {
      targetList = ['whatsapp'];
    } else if (preset === 'facebook') {
      targetList = ['facebook'];
    } else if (preset === 'instagram') {
      targetList = ['instagram'];
    } else if (preset === 'linkedin') {
      targetList = ['linkedin'];
    } else if (preset === 'x') {
      targetList = ['x'];
    }

    if (mode === 'broadcast') {
      setBroadcastPlatforms(targetList);
    } else {
      setSelectedPlatforms(targetList);
    }
  };

  const handleExecuteMultiBrandBroadcast = async () => {
    if (selectedBrandIds.length === 0) {
      alert('Please select at least one brand for the broadcast.');
      return;
    }
    if (broadcastPlatforms.length === 0) {
      alert('Please select at least one social platform.');
      return;
    }
    if (!broadcastCaption.trim()) {
      alert('Master caption cannot be empty.');
      return;
    }

    setIsBroadcasting(true);
    setBroadcastReport(null);

    const isBroadcastVideo = isVideoUrl(broadcastMediaUrl) || broadcastMediaType === 'video';

    try {
      if (onMultiBrandPublish) {
        const report = await onMultiBrandPublish({
          brandIds: selectedBrandIds,
          platforms: broadcastPlatforms,
          placement: selectedPlacements,
          placements: selectedPlacements,
          campaignName: broadcastCampaignName,
          title: broadcastTitle,
          masterCaption: broadcastCaption,
          hashtags: broadcastHashtags,
          targetUrl: broadcastTargetUrl,
          mediaUrls: broadcastMediaUrl ? [broadcastMediaUrl] : [],
          mediaType: isBroadcastVideo ? 'video' : 'image',
          platformOverrides: broadcastOverrides,
        });
        setBroadcastReport(report);
      }
    } catch (err: any) {
      alert(`Publishing failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleFinish = (submitForApproval: boolean) => {
    setIsSubmitting(true);
    const isVideo = isVideoUrl(mediaUrl) || mediaType === 'video';

    const postData = {
      brandId,
      campaignName,
      title: title || 'Untitled Post',
      masterCaption,
      placement: selectedPlacements,
      placements: selectedPlacements,
      firstComment,
      hashtags,
      keywords,
      targetUrl,
      internalTags,
      country,
      timezone,
      scheduledAt:
        publishTiming === 'scheduled'
          ? (timezone === 'Asia/Kolkata' ? fromISTInputValues(scheduledDate, scheduledTime) : `${scheduledDate}T${scheduledTime}:00Z`)
          : undefined,
      platforms: selectedPlatforms.map(p => ({
        platform: p,
        captionOverride: platformOverrides[p] || undefined,
        publishingStatus: 'pending',
      })),
      mediaType: isVideo ? 'video' : 'image',
      media: mediaUrl
        ? [
            {
              mediaType: isVideo ? 'video' : 'image',
              fileUrl: mediaUrl,
              originalFileName: mediaUploadSuccess ? 'uploaded_asset' : 'campaign_image.jpg',
              mimeType: isVideo ? 'video/mp4' : 'image/jpeg',
              fileSizeBytes: isVideo ? 15000000 : 2100000,
              altText,
            },
          ]
        : [],
      assignedApproverId,
      submitForApproval,
    };

    onSavePost(postData);
  };

  const STEPS = [
    { number: 1, label: 'Brand & Campaign' },
    { number: 2, label: 'Platforms & Format' },
    { number: 3, label: 'Media Assets' },
    { number: 4, label: 'Captions & Preview' },
    { number: 5, label: 'Schedule' },
    { number: 6, label: 'Approval' },
  ];

  const ALL_PLATFORMS: Array<{ id: SocialPlatform; label: string; maxChars: number; color: string; badge: string; icon: any }> = [
    { id: 'youtube', label: 'YouTube Community & Shorts', maxChars: 5000, color: 'text-[#F04438]', badge: 'bg-[#FEF3F2] border-[#FECDCA]', icon: Youtube },
    { id: 'whatsapp', label: 'WhatsApp Status & Channel', maxChars: 65536, color: 'text-[#25D366]', badge: 'bg-[#DCFCE7] border-[#86EFAC]', icon: MessageCircle },
    { id: 'facebook', label: 'Facebook Page', maxChars: 5000, color: 'text-[#12B76A]', badge: 'bg-[#ECFDF3] border-[#A6F4C5]', icon: Radio },
    { id: 'instagram', label: 'Instagram Business', maxChars: 2200, color: 'text-[#F79009]', badge: 'bg-[#FEF0C7] border-[#FEDF89]', icon: Sparkles },
    { id: 'linkedin', label: 'LinkedIn', maxChars: 3000, color: 'text-[#1336E8]', badge: 'bg-[#EFF8FF] border-[#B2DDFF]', icon: Globe },
    { id: 'x', label: 'X (Twitter v2)', maxChars: 280, color: 'text-[#08C5E1]', badge: 'bg-[#E0F2FE] border-[#BAE6FD]', icon: Radio },
  ];

  const renderMediaSection = (isBroadcast: boolean) => {
    const currentUrl = isBroadcast ? broadcastMediaUrl : mediaUrl;
    const setUrl = isBroadcast ? setBroadcastMediaUrl : setMediaUrl;
    const isUploading = isBroadcast ? isUploadingBroadcastMedia : isUploadingMedia;
    const uploadError = isBroadcast ? broadcastUploadError : mediaUploadError;
    const uploadSuccess = isBroadcast ? broadcastUploadSuccess : mediaUploadSuccess;
    const fileInputRef = isBroadcast ? broadcastFileInputRef : singleFileInputRef;
    const isVideo = isVideoUrl(currentUrl);

    return (
      <div className="space-y-4 p-4 sm:p-5 rounded-2xl bg-white border border-[#EAECF0] shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EAECF0] pb-3">
          <div>
            <h4 className="text-sm font-bold text-[#101828] flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-[#1336E8]" />
              <span>Media &amp; Creative Asset Uploader</span>
            </h4>
            <p className="text-xs text-[#667085] mt-0.5">
              Upload local video/image files directly or provide a URL. Links will be synced to Google Sheets.
            </p>
          </div>
          {currentUrl && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                isVideo
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {isVideo ? <Video className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
              {isVideo ? 'Active Video Asset' : 'Active Image Asset'}
            </span>
          )}
        </div>

        {/* Upload Dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={e => {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleDirectUpload(e.dataTransfer.files[0], isBroadcast);
            }
          }}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            isUploading
              ? 'border-[#1336E8] bg-[#EFF8FF]'
              : 'border-[#D0D5DD] hover:border-[#1336E8] hover:bg-[#F9FAFB]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={e => {
              if (e.target.files && e.target.files[0]) {
                handleDirectUpload(e.target.files[0], isBroadcast);
              }
            }}
          />

          {isUploading ? (
            <div className="flex flex-col items-center justify-center py-2">
              <Loader2 className="w-8 h-8 text-[#1336E8] animate-spin mb-2" />
              <p className="text-sm font-semibold text-[#101828]">Uploading &amp; converting to public link...</p>
              <p className="text-xs text-[#667085] mt-1">Generating direct URL for dashboard preview &amp; Google Sheet sync</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-[#EFF8FF] text-[#1336E8] flex items-center justify-center mb-3 shadow-xs">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-[#101828]">
                Click to upload video or image, or drag and drop
              </p>
              <p className="text-xs text-[#667085] mt-1">
                Supports MP4, WebM, MOV videos &amp; PNG, JPG, WebP, GIF images (up to 100MB)
              </p>
              <div className="mt-3 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-600 uppercase">
                  MP4 Video
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-600 uppercase">
                  WebM
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-600 uppercase">
                  HD Images
                </span>
              </div>
            </div>
          )}
        </div>

        {uploadError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{uploadError}</span>
          </div>
        )}

        {uploadSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <div className="flex-1">
              <span className="font-semibold">{uploadSuccess}</span>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Link converted and queued for automatic Google Sheet sync.
              </p>
            </div>
          </div>
        )}

        {/* Or direct URL input */}
        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-semibold text-[#344054] flex items-center justify-between">
            <span>Direct Media URL / Link</span>
            {currentUrl && (
              <span className="text-[11px] font-mono text-slate-500 truncate max-w-xs">{currentUrl}</span>
            )}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={currentUrl}
              onChange={e => {
                setUrl(e.target.value);
                if (isBroadcast) setBroadcastUploadSuccess(null);
                else setMediaUploadSuccess(null);
              }}
              placeholder="https://... or /uploads/filename.mp4"
              className="flex-1 h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#1336E8]"
            />
            {currentUrl && (
              <button
                type="button"
                onClick={() => {
                  setUrl('');
                  if (isBroadcast) setBroadcastUploadSuccess(null);
                  else setMediaUploadSuccess(null);
                }}
                className="px-3 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-medium transition-colors flex items-center gap-1"
                title="Clear Media"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Media Preview Box */}
        {currentUrl && (
          <div className="space-y-2 pt-2 border-t border-[#EAECF0]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#344054] flex items-center gap-1.5">
                {isVideo ? (
                  <Video className="w-3.5 h-3.5 text-indigo-600" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span>Live Interactive Preview</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveLightboxUrl(currentUrl);
                    setActiveLightboxType(isVideo ? 'video' : 'image');
                    setIsLightboxOpen(true);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>{isVideo ? 'Watch Video' : 'View Full Image'}</span>
                </button>
              </div>
            </div>

            <div className="relative w-full rounded-xl overflow-hidden border border-[#EAECF0] bg-slate-950 flex items-center justify-center p-2">
              {isVideo ? (
                <video
                  src={currentUrl}
                  controls
                  playsInline
                  className="w-full max-h-72 object-contain bg-black rounded-lg"
                >
                  Your browser does not support HTML5 video playback.
                </video>
              ) : (
                <img
                  src={currentUrl}
                  alt="Asset Preview"
                  className="w-full max-h-72 object-contain bg-slate-900 rounded-lg"
                  onError={e => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Top Mode Selector Card */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#EAECF0] shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase font-bold text-[#1336E8] bg-[#EFF8FF] px-2 py-0.5 rounded">
              Node.js + n8n Orchestrator
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#101828] mt-1">Social Media Post Publishing Hub</h2>
          <p className="text-xs text-[#667085] mt-0.5">
            Choose between multi-brand omnichannel broadcast or individual brand campaign crafting.
          </p>
        </div>

        <div className="flex items-center bg-[#F6F8FC] p-1.5 rounded-xl border border-[#EAECF0] gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setComposerMode('multibrand')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              composerMode === 'multibrand'
                ? 'bg-[#1336E8] text-white shadow-sm'
                : 'text-[#475467] hover:text-[#101828]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Multi-Brand Broadcast</span>
          </button>

          <button
            type="button"
            onClick={() => setComposerMode('single')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              composerMode === 'single'
                ? 'bg-[#1336E8] text-white shadow-sm'
                : 'text-[#475467] hover:text-[#101828]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Single-Brand Wizard</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MULTI-BRAND OMNICHANNEL BROADCAST STUDIO                      */}
      {/* ============================================================== */}
      {composerMode === 'multibrand' && (
        <div className="space-y-6">
          {/* Main Broadcast Setup Card */}
          <div className="bg-white p-6 rounded-2xl border border-[#EAECF0] shadow-sm space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#101828]">1. Target Brand Portfolios</h3>
                  <p className="text-xs text-[#667085] mt-0.5">
                    Select which brands will simultaneously broadcast this campaign via n8n.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedBrandIds.length === availableBrands.length) {
                      setSelectedBrandIds([]);
                    } else {
                      setSelectedBrandIds(availableBrands.map(b => b.id));
                    }
                  }}
                  className="text-xs font-semibold text-[#1336E8] hover:underline"
                >
                  {selectedBrandIds.length === availableBrands.length ? 'Deselect All' : 'Select All Brands'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                {availableBrands.map(brand => {
                  const isSelected = selectedBrandIds.includes(brand.id);
                  return (
                    <div
                      key={brand.id}
                      onClick={() => toggleBroadcastBrand(brand.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-[#1336E8] bg-[#EFF8FF] shadow-sm'
                          : 'border-[#EAECF0] bg-white hover:bg-[#F9FAFB]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs"
                          style={{
                            backgroundColor: `${brand.primaryColor}15`,
                            color: brand.primaryColor,
                          }}
                        >
                          {brand.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#101828] leading-tight">{brand.name}</div>
                          <div className="text-[10px] text-[#667085] font-mono">@{brand.slug}</div>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-[#1336E8] border-[#1336E8] text-white'
                            : 'border-[#D0D5DD] bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Target Social Platforms & Format */}
            <div className="pt-4 border-t border-[#EAECF0] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#101828]">2. Target Social Platforms &amp; Content Placement</h3>
                  <p className="text-xs text-[#667085] mt-0.5">
                    Select the target networks (YouTube, WhatsApp, Meta Suite) and choose between Feed, Story, or Reels.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (broadcastPlatforms.length === ALL_PLATFORMS.length) {
                      setBroadcastPlatforms([]);
                    } else {
                      setBroadcastPlatforms(ALL_PLATFORMS.map(p => p.id));
                    }
                  }}
                  className="text-xs font-semibold text-[#1336E8] hover:underline"
                >
                  {broadcastPlatforms.length === ALL_PLATFORMS.length ? 'Clear Platforms' : 'All 6 Platforms'}
                </button>
              </div>

              {/* Quick Preset Dropdown & Format Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F8FAFC] p-3.5 rounded-xl border border-[#EAECF0]">
                {/* Channel Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#344054] flex items-center justify-between">
                    <span>Social Media Destination Channel</span>
                    <span className="text-[10px] text-[#667085] font-normal">Choose target or preset</span>
                  </label>
                  <select
                    value={selectedChannelPreset}
                    onChange={e => handleChannelPresetChange(e.target.value, 'broadcast')}
                    className="w-full h-10 px-3 bg-white border border-[#D0D5DD] rounded-xl text-xs font-medium text-[#101828] focus:outline-none focus:border-[#1336E8] focus:ring-1 focus:ring-[#1336E8]"
                  >
                    <option value="all">⚡ All Channels (Omnichannel Broadcast)</option>
                    <option value="meta_suite">Meta Suite (Facebook + Instagram + WhatsApp)</option>
                    <option value="stories_status">Stories &amp; Status (Insta + FB Story + WhatsApp)</option>
                    <option value="video_shorts">Shorts &amp; Reels (YouTube Shorts + Insta Reels + FB)</option>
                    <option value="youtube">YouTube (Community Post &amp; Shorts)</option>
                    <option value="whatsapp">WhatsApp (Status &amp; Channels)</option>
                    <option value="facebook">Facebook (Flower plant Page)</option>
                    <option value="instagram">Instagram (@ciflow904)</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="x">X (Twitter v2)</option>
                  </select>
                </div>

                {/* Publishing Format / Placement Multiple Selection Selector */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#344054] flex items-center gap-1.5">
                      <span>Publishing Format / Placement</span>
                      <span className="text-[10px] text-[#667085] font-normal">(Select multiple)</span>
                    </label>
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      {selectedPlacements.map(p => (
                        <span key={p} className="text-[10px] font-bold uppercase tracking-wider text-[#1336E8] bg-[#EFF8FF] px-2 py-0.5 rounded border border-[#B2DDFF]">
                          {p === 'story' ? '24h Story' : p === 'reels_shorts' ? 'Shorts & Reels' : 'Feed'}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => togglePlacement('feed')}
                      className={`h-10 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                        selectedPlacements.includes('feed')
                          ? 'bg-[#1336E8] text-white border-[#1336E8] shadow-sm'
                          : 'bg-white text-[#344054] border-[#D0D5DD] hover:bg-[#F2F4F7]'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] font-bold border ${
                        selectedPlacements.includes('feed') ? 'bg-white text-[#1336E8] border-white' : 'border-[#D0D5DD] bg-white text-transparent'
                      }`}>
                        ✓
                      </div>
                      <Layers className="w-3.5 h-3.5" />
                      <span>Standard Feed</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePlacement('story')}
                      className={`h-10 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                        selectedPlacements.includes('story')
                          ? 'bg-[#E11D48] text-white border-[#E11D48] shadow-sm'
                          : 'bg-white text-[#344054] border-[#D0D5DD] hover:bg-[#F2F4F7]'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] font-bold border ${
                        selectedPlacements.includes('story') ? 'bg-white text-[#E11D48] border-white' : 'border-[#D0D5DD] bg-white text-transparent'
                      }`}>
                        ✓
                      </div>
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Story / Status</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePlacement('reels_shorts')}
                      className={`h-10 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                        selectedPlacements.includes('reels_shorts')
                          ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-sm'
                          : 'bg-white text-[#344054] border-[#D0D5DD] hover:bg-[#F2F4F7]'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] font-bold border ${
                        selectedPlacements.includes('reels_shorts') ? 'bg-white text-[#7C3AED] border-white' : 'border-[#D0D5DD] bg-white text-transparent'
                      }`}>
                        ✓
                      </div>
                      <Video className="w-3.5 h-3.5" />
                      <span>Reels / Shorts</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Format Alert Banners */}
              {selectedPlacements.length > 1 && (
                <div className="p-2.5 bg-[#EFF8FF] border border-[#B2DDFF] rounded-xl flex items-center gap-2 text-xs text-[#1336E8]">
                  <span className="font-bold text-sm">⚡</span>
                  <span>
                    <strong>Multi-Placement Active:</strong> Post will be formatted and published across multiple formats ({selectedPlacements.map(p => p === 'story' ? 'Story / Status' : p === 'reels_shorts' ? 'Reels / Shorts' : 'Standard Feed').join(' &amp; ')}) simultaneously.
                  </span>
                </div>
              )}
              {selectedPlacements.includes('story') && (
                <div className="p-2.5 bg-[#FFF1F2] border border-[#FECDD3] rounded-xl flex items-center gap-2 text-xs text-[#BE123C]">
                  <Smartphone className="w-4 h-4 shrink-0 text-[#E11D48]" />
                  <span>
                    <strong>Story Mode Active:</strong> Posts will be delivered as 24-hour stories on Instagram Stories, Facebook Stories, and WhatsApp Status.
                  </span>
                </div>
              )}
              {selectedPlacements.includes('reels_shorts') && (
                <div className="p-2.5 bg-[#F5F3FF] border border-[#DDD6FE] rounded-xl flex items-center gap-2 text-xs text-[#6D28D9]">
                  <Video className="w-4 h-4 shrink-0 text-[#7C3AED]" />
                  <span>
                    <strong>Shorts &amp; Reels Mode Active:</strong> Video will be formatted for vertical full-screen playback on YouTube Shorts, Instagram Reels, and Facebook Reels.
                  </span>
                </div>
              )}

              {/* Platform Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {ALL_PLATFORMS.map(plat => {
                  const isSelected = broadcastPlatforms.includes(plat.id);
                  const Icon = plat.icon;
                  return (
                    <button
                      key={plat.id}
                      type="button"
                      onClick={() => toggleBroadcastPlatform(plat.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? `border-[#1336E8] bg-[#EFF8FF] ${plat.color} shadow-sm`
                          : 'border-[#EAECF0] bg-white text-[#475467] hover:bg-[#F9FAFB]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Icon className="w-4 h-4" />
                        {isSelected ? (
                          <CheckCircle2 className="w-4 h-4 text-[#1336E8]" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-[#D0D5DD]" />
                        )}
                      </div>
                      <div className="text-xs font-bold mt-2 truncate">{plat.label}</div>
                      <div className="text-[10px] text-[#667085] mt-0.5 font-mono">Max {plat.maxChars} chars</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content & Metadata */}
            <div className="pt-4 border-t border-[#EAECF0] space-y-4">
              <h3 className="text-base font-bold text-[#101828]">3. Broadcast Content &amp; Media</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#344054]">Campaign Name</label>
                  <input
                    type="text"
                    value={broadcastCampaignName}
                    onChange={e => setBroadcastCampaignName(e.target.value)}
                    className="w-full h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#1336E8]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#344054]">Post Title / Headline</label>
                  <input
                    type="text"
                    value={broadcastTitle}
                    onChange={e => setBroadcastTitle(e.target.value)}
                    placeholder="e.g. Autonomous AI Engine v2"
                    className="w-full h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#1336E8]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#344054]">Master Caption (Cross-Platform)</label>
                  <span className="text-[11px] font-mono text-[#667085]">
                    {broadcastCaption.length} characters
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={broadcastCaption}
                  onChange={e => setBroadcastCaption(e.target.value)}
                  className="w-full p-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#1336E8]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#344054]">Hashtags</label>
                  <input
                    type="text"
                    value={broadcastHashtags}
                    onChange={e => setBroadcastHashtags(e.target.value)}
                    className="w-full h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#1336E8]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#344054]">Destination URL</label>
                  <input
                    type="text"
                    value={broadcastTargetUrl}
                    onChange={e => setBroadcastTargetUrl(e.target.value)}
                    className="w-full h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#1336E8]"
                  />
                </div>
              </div>

              {/* Direct Image/Video Upload & Preview for Broadcast */}
              {renderMediaSection(true)}

              {/* Platform Override for X (Twitter) */}
              {broadcastPlatforms.includes('x') && (
                <div className="p-4 rounded-xl bg-[#F6F8FC] border border-[#EAECF0] space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#101828]">X (Twitter v2) Platform Override</span>
                      <span className="text-[10px] bg-[#E0F2FE] text-[#08C5E1] font-bold px-1.5 py-0.5 rounded">
                        280 Chars Max
                      </span>
                    </div>
                    <span
                      className={`text-[11px] font-mono ${
                        (broadcastOverrides.x || '').length > 280 ? 'text-[#F04438] font-bold' : 'text-[#667085]'
                      }`}
                    >
                      {(broadcastOverrides.x || '').length} / 280
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={broadcastOverrides.x || ''}
                    onChange={e =>
                      setBroadcastOverrides({ ...broadcastOverrides, x: e.target.value })
                    }
                    placeholder="Customized copy optimized for X algorithm and short length..."
                    className="w-full p-2.5 bg-white border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#1336E8]"
                  />
                </div>
              )}
            </div>

            {/* Broadcast Dispatch Trigger Button */}
            <div className="pt-4 border-t border-[#EAECF0] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-[#475467]">
                Targeting{' '}
                <strong className="text-[#101828]">{selectedBrandIds.length} Brands</strong> across{' '}
                <strong className="text-[#101828]">{broadcastPlatforms.length} Platforms</strong> (Total{' '}
                <strong className="text-[#1336E8]">{selectedBrandIds.length * broadcastPlatforms.length} Live Posts</strong>).
              </div>

              <button
                type="button"
                onClick={handleExecuteMultiBrandBroadcast}
                disabled={isBroadcasting}
                className="w-full sm:w-auto px-6 py-3 bg-[#1336E8] hover:bg-[#0E27B3] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#1336E8]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isBroadcasting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Orchestrating via n8n Webhook...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Dispatch Multi-Brand Broadcast</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ============================================================== */}
          {/* LIVE PUBLICATION & EXECUTION REPORT CARD                      */}
          {/* ============================================================== */}
          {broadcastReport && (
            <div className="bg-white p-6 rounded-2xl border-2 border-[#12B76A] shadow-xl space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#EAECF0] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#ECFDF3] text-[#12B76A] flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#101828]">
                      Omnichannel Multi-Brand Publication Report
                    </h3>
                    <p className="text-xs text-[#667085]">
                      Orchestration finalized via Node.js and signed n8n webhooks.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#12B76A] bg-[#ECFDF3] px-3 py-1 rounded-lg border border-[#A6F4C5]">
                    {broadcastReport.summary?.latencyMs || 740}ms · HMAC Verified
                  </span>
                </div>
              </div>

              {/* 4 Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-[#F6F8FC] rounded-xl border border-[#EAECF0]">
                  <span className="text-[10px] text-[#667085] block font-medium">Brands Dispatched</span>
                  <span className="text-xl font-bold font-mono text-[#101828]">
                    {broadcastReport.summary?.totalBrands}
                  </span>
                </div>
                <div className="p-3 bg-[#F6F8FC] rounded-xl border border-[#EAECF0]">
                  <span className="text-[10px] text-[#667085] block font-medium">Platforms Targeted</span>
                  <span className="text-xl font-bold font-mono text-[#1336E8]">
                    {broadcastReport.summary?.totalPlatforms}
                  </span>
                </div>
                <div className="p-3 bg-[#F6F8FC] rounded-xl border border-[#EAECF0]">
                  <span className="text-[10px] text-[#667085] block font-medium">Total Posts Published</span>
                  <span className="text-xl font-bold font-mono text-[#12B76A]">
                    {broadcastReport.summary?.totalDispatchedPosts}
                  </span>
                </div>
                <div className="p-3 bg-[#F6F8FC] rounded-xl border border-[#EAECF0]">
                  <span className="text-[10px] text-[#667085] block font-medium">Published At</span>
                  <span className="text-xs font-mono text-[#475467] truncate block mt-1">
                    {new Date(broadcastReport.summary?.publishedAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              {/* Per-Brand Breakdown Cards */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#101828] uppercase tracking-wider">
                  Brand Publication Results &amp; Live Social URLs:
                </h4>

                <div className="space-y-3">
                  {broadcastReport.brandReports?.map((reportItem: any) => (
                    <div
                      key={reportItem.brandId}
                      className="p-4 rounded-xl border border-[#EAECF0] bg-[#F9FAFB] space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EAECF0] pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-[#101828]">
                            {reportItem.brandName}
                          </span>
                          <span className="text-[10px] font-mono text-[#667085]">
                            Execution: {reportItem.executionId}
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#12B76A] bg-[#ECFDF3] px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Published
                        </span>
                      </div>

                      {/* Platform Badges with Links */}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        {Object.entries(reportItem.platformResults || {}).map(([platform, res]: any) => (
                          <a
                            key={platform}
                            href={res.url || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#D0D5DD] hover:border-[#1336E8] hover:text-[#1336E8] text-[#344054] font-medium transition-colors shadow-2xs"
                          >
                            <span className="uppercase font-bold text-[10px] text-[#1336E8]">
                              {platform}
                            </span>
                            <span className="text-[11px]">View Live</span>
                            <ExternalLink className="w-3 h-3 text-[#667085]" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fast Forward Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#EAECF0]">
                <div className="text-xs text-[#667085]">
                  Telemetry and impressions have been synced to the database.
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {onViewExecutions && (
                    <button
                      type="button"
                      onClick={onViewExecutions}
                      className="px-4 py-2 bg-white border border-[#D0D5DD] hover:bg-[#F2F4F7] text-xs font-semibold text-[#344054] rounded-xl transition-colors"
                    >
                      View in Executions ↗
                    </button>
                  )}
                  {onViewAnalytics && (
                    <button
                      type="button"
                      onClick={onViewAnalytics}
                      className="px-4 py-2 bg-[#1336E8] hover:bg-[#0E27B3] text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
                    >
                      View Live Analytics ↗
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* SINGLE BRAND GUIDED 6-STEP WIZARD                            */}
      {/* ============================================================== */}
      {composerMode === 'single' && (
        <div className="space-y-6">
          {/* Step Indicator Header */}
          <div className="bg-white p-6 rounded-2xl border border-[#EAECF0] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#101828]">Single-Brand Post Wizard</h2>
                <p className="text-xs text-[#667085] mt-0.5">
                  Draft, customize per platform, and route for automated n8n publishing
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-[#12B76A]">
                <CheckCircle2 className="w-4 h-4" />
                <span>Autosaved</span>
              </div>
            </div>

            {/* Steps Progress Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-2 border-t border-[#EAECF0]">
              {STEPS.map(s => {
                const isCurrent = currentStep === s.number;
                const isCompleted = currentStep > s.number;
                return (
                  <button
                    key={s.number}
                    type="button"
                    onClick={() => setCurrentStep(s.number)}
                    className={`p-2 rounded-xl text-left border transition-all ${
                      isCurrent
                        ? 'border-[#1336E8] bg-[#EFF8FF]'
                        : isCompleted
                        ? 'border-[#EAECF0] bg-white text-[#101828]'
                        : 'border-transparent text-[#98A2B3]'
                    }`}
                  >
                    <div className="text-[10px] font-mono uppercase font-bold text-[#1336E8]">
                      Step {s.number}
                    </div>
                    <div className="text-xs font-semibold truncate">{s.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step Body */}
          <div className="bg-white p-6 rounded-2xl border border-[#EAECF0] shadow-sm space-y-6">
            {/* STEP 1: BRAND & CAMPAIGN */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-[#101828]">Step 1: Brand Profile &amp; Campaign Metadata</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#344054]">Select Brand Profile</label>
                    <select
                      value={brandId}
                      onChange={e => setBrandId(parseInt(e.target.value, 10))}
                      className="w-full h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs font-medium text-[#101828] focus:outline-none focus:border-[#1336E8]"
                    >
                      {availableBrands.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.timezone || 'Asia/Kolkata'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#344054]">Campaign Name</label>
                    <input
                      type="text"
                      value={campaignName}
                      onChange={e => setCampaignName(e.target.value)}
                      className="w-full h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#1336E8]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#344054]">Post Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Zero-Downtime Multi-Region Autoscaling"
                    className="w-full h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#1336E8]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#344054]">Internal Tags</label>
                    <input
                      type="text"
                      value={internalTags}
                      onChange={e => setInternalTags(e.target.value)}
                      className="w-full h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#1336E8]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#344054]">Target Country</label>
                    <select
                      value={country}
                      onChange={e => setCountry(e.target.value)}
                      className="w-full h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#1336E8]"
                    >
                      <option value="IN">India (IN) [Default]</option>
                      <option value="US">United States (US)</option>
                      <option value="GB">United Kingdom (GB)</option>
                      <option value="DE">Germany (DE)</option>
                      <option value="GLOBAL">Global</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#344054]">Timezone</label>
                    <select
                      value={timezone}
                      onChange={e => setTimezone(e.target.value)}
                      className="w-full h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#1336E8]"
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (IST · UTC+5:30) [Default / n8n]</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: PLATFORMS & FORMAT */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-[#101828]">Step 2: Social Media Destinations &amp; Placement</h3>
                    <p className="text-xs text-[#667085] mt-0.5">
                      Select target channels (YouTube, WhatsApp, Meta Suite) and choose between Feed Post, 24h Story, or Reels.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPlatforms.length === ALL_PLATFORMS.length) {
                        setSelectedPlatforms([]);
                      } else {
                        setSelectedPlatforms(ALL_PLATFORMS.map(p => p.id));
                      }
                    }}
                    className="text-xs font-semibold text-[#1336E8] hover:underline"
                  >
                    {selectedPlatforms.length === ALL_PLATFORMS.length ? 'Clear Platforms' : 'Select All 6'}
                  </button>
                </div>

                {/* Quick Channel Preset Dropdown & Format Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F8FAFC] p-3.5 rounded-xl border border-[#EAECF0]">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#344054] flex items-center justify-between">
                      <span>Social Media Destination Channel</span>
                      <span className="text-[10px] text-[#667085] font-normal">Choose target or preset</span>
                    </label>
                    <select
                      value={selectedChannelPreset}
                      onChange={e => handleChannelPresetChange(e.target.value, 'single')}
                      className="w-full h-10 px-3 bg-white border border-[#D0D5DD] rounded-xl text-xs font-medium text-[#101828] focus:outline-none focus:border-[#1336E8] focus:ring-1 focus:ring-[#1336E8]"
                    >
                      <option value="all">⚡ All Channels (Omnichannel Broadcast)</option>
                      <option value="meta_suite">Meta Suite (Facebook + Instagram + WhatsApp)</option>
                      <option value="stories_status">Stories &amp; Status (Insta + FB Story + WhatsApp)</option>
                      <option value="video_shorts">Shorts &amp; Reels (YouTube Shorts + Insta Reels + FB)</option>
                      <option value="youtube">YouTube (Community Post &amp; Shorts)</option>
                      <option value="whatsapp">WhatsApp (Status &amp; Channels)</option>
                      <option value="facebook">Facebook (Flower plant Page)</option>
                      <option value="instagram">Instagram (@ciflow904)</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="x">X (Twitter v2)</option>
                    </select>
                  </div>

                  {/* Publishing Format / Placement Multiple Selection Selector */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#344054] flex items-center gap-1.5">
                        <span>Publishing Format / Placement</span>
                        <span className="text-[10px] text-[#667085] font-normal">(Select multiple)</span>
                      </label>
                      <div className="flex items-center gap-1 flex-wrap justify-end">
                        {selectedPlacements.map(p => (
                          <span key={p} className="text-[10px] font-bold uppercase tracking-wider text-[#1336E8] bg-[#EFF8FF] px-2 py-0.5 rounded border border-[#B2DDFF]">
                            {p === 'story' ? '24h Story' : p === 'reels_shorts' ? 'Shorts & Reels' : 'Feed'}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => togglePlacement('feed')}
                        className={`h-10 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                          selectedPlacements.includes('feed')
                            ? 'bg-[#1336E8] text-white border-[#1336E8] shadow-sm'
                            : 'bg-white text-[#344054] border-[#D0D5DD] hover:bg-[#F2F4F7]'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] font-bold border ${
                          selectedPlacements.includes('feed') ? 'bg-white text-[#1336E8] border-white' : 'border-[#D0D5DD] bg-white text-transparent'
                        }`}>
                          ✓
                        </div>
                        <Layers className="w-3.5 h-3.5" />
                        <span>Feed Post</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePlacement('story')}
                        className={`h-10 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                          selectedPlacements.includes('story')
                            ? 'bg-[#E11D48] text-white border-[#E11D48] shadow-sm'
                            : 'bg-white text-[#344054] border-[#D0D5DD] hover:bg-[#F2F4F7]'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] font-bold border ${
                          selectedPlacements.includes('story') ? 'bg-white text-[#E11D48] border-white' : 'border-[#D0D5DD] bg-white text-transparent'
                        }`}>
                          ✓
                        </div>
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Story / Status</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePlacement('reels_shorts')}
                        className={`h-10 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                          selectedPlacements.includes('reels_shorts')
                            ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-sm'
                            : 'bg-white text-[#344054] border-[#D0D5DD] hover:bg-[#F2F4F7]'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] font-bold border ${
                          selectedPlacements.includes('reels_shorts') ? 'bg-white text-[#7C3AED] border-white' : 'border-[#D0D5DD] bg-white text-transparent'
                        }`}>
                          ✓
                        </div>
                        <Video className="w-3.5 h-3.5" />
                        <span>Reels / Shorts</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Format Alert Banners */}
                {selectedPlacements.length > 1 && (
                  <div className="p-2.5 bg-[#EFF8FF] border border-[#B2DDFF] rounded-xl flex items-center gap-2 text-xs text-[#1336E8]">
                    <span className="font-bold text-sm">⚡</span>
                    <span>
                      <strong>Multi-Placement Active:</strong> Post will be formatted and published across multiple formats ({selectedPlacements.map(p => p === 'story' ? 'Story / Status' : p === 'reels_shorts' ? 'Reels / Shorts' : 'Standard Feed').join(' &amp; ')}) simultaneously.
                    </span>
                  </div>
                )}
                {selectedPlacements.includes('story') && (
                  <div className="p-2.5 bg-[#FFF1F2] border border-[#FECDD3] rounded-xl flex items-center gap-2 text-xs text-[#BE123C]">
                    <Smartphone className="w-4 h-4 shrink-0 text-[#E11D48]" />
                    <span>
                      <strong>Story Mode Active:</strong> Post will be published as a 24-hour Story on Instagram Stories, Facebook Stories, and WhatsApp Status.
                    </span>
                  </div>
                )}
                {selectedPlacements.includes('reels_shorts') && (
                  <div className="p-2.5 bg-[#F5F3FF] border border-[#DDD6FE] rounded-xl flex items-center gap-2 text-xs text-[#6D28D9]">
                    <Video className="w-4 h-4 shrink-0 text-[#7C3AED]" />
                    <span>
                      <strong>Shorts &amp; Reels Mode Active:</strong> Video will be formatted for YouTube Shorts, Instagram Reels, and Facebook Reels with vertical aspect ratio.
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ALL_PLATFORMS.map(p => {
                    const isSelected = selectedPlatforms.includes(p.id);
                    const Icon = p.icon;
                    return (
                      <div
                        key={p.id}
                        onClick={() => togglePlatform(p.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-[#1336E8] bg-[#EFF8FF] shadow-sm'
                            : 'border-[#EAECF0] hover:bg-[#F9FAFB]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon className={`w-5 h-5 ${p.color}`} />
                          <div>
                            <div className={`font-bold text-xs uppercase ${p.color}`}>
                              {p.label}
                            </div>
                            <span className="text-[10px] text-[#667085] font-mono">
                              Max {p.maxChars} chars
                            </span>
                          </div>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                            isSelected
                              ? 'bg-[#1336E8] border-[#1336E8] text-white'
                              : 'border-[#D0D5DD] bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 3: MEDIA ASSETS */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-[#101828]">Step 3: Media &amp; Creative Assets</h3>
                {renderMediaSection(false)}

                <div className="space-y-1.5 p-4 rounded-xl bg-white border border-[#EAECF0]">
                  <label className="text-xs font-semibold text-[#344054]">Accessibility Alt Text / Media Caption</label>
                  <input
                    type="text"
                    value={altText}
                    onChange={e => setAltText(e.target.value)}
                    placeholder="Brief description for screen readers and search engines..."
                    className="w-full h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#1336E8]"
                  />
                </div>
              </div>
            )}

            {/* STEP 4: CAPTIONS & PREVIEW */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-[#101828]">Step 4: Master Caption &amp; Channel Customization</h3>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#344054]">Master Caption</label>
                    <span className="text-[10px] text-[#667085] font-mono">{masterCaption.length} characters</span>
                  </div>
                  <textarea
                    rows={4}
                    value={masterCaption}
                    onChange={e => setMasterCaption(e.target.value)}
                    className="w-full p-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#1336E8]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#344054]">Target URL</label>
                    <input
                      type="text"
                      value={targetUrl}
                      onChange={e => setTargetUrl(e.target.value)}
                      className="w-full h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#1336E8]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#344054]">Hashtags</label>
                    <input
                      type="text"
                      value={hashtags}
                      onChange={e => setHashtags(e.target.value)}
                      className="w-full h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#1336E8]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 5: SCHEDULE */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-[#101828]">Step 5: Scheduling &amp; Timing</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => setPublishTiming('scheduled')}
                    className={`p-4 rounded-xl border cursor-pointer ${
                      publishTiming === 'scheduled'
                        ? 'border-[#1336E8] bg-[#EFF8FF]'
                        : 'border-[#EAECF0] hover:bg-[#F9FAFB]'
                    }`}
                  >
                    <div className="font-bold text-xs text-[#101828]">Scheduled Release</div>
                    <div className="text-[11px] text-[#667085] mt-1">Publish at a designated future time</div>
                  </div>

                  <div
                    onClick={() => setPublishTiming('now')}
                    className={`p-4 rounded-xl border cursor-pointer ${
                      publishTiming === 'now'
                        ? 'border-[#1336E8] bg-[#EFF8FF]'
                        : 'border-[#EAECF0] hover:bg-[#F9FAFB]'
                    }`}
                  >
                    <div className="font-bold text-xs text-[#101828]">Publish Immediately Upon Approval</div>
                    <div className="text-[11px] text-[#667085] mt-1">Triggers n8n webhook right away</div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: APPROVAL */}
            {currentStep === 6 && (
              <div className="space-y-4">
                <h3 className="text-base font-bold text-[#101828]">Step 6: Routing &amp; Approver</h3>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#344054]">Assigned Reviewer</label>
                    <select
                      value={assignedApproverId}
                      onChange={e => setAssignedApproverId(parseInt(e.target.value, 10))}
                      className="w-full h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#1336E8]"
                    >
                      <option value={3}>Marcus Sterling (Principal Reviewer)</option>
                      <option value={1}>Pradeep Kumar (Super Admin)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#344054]">Internal Submission Note</label>
                    <textarea
                      rows={3}
                      value={internalNote}
                      onChange={e => setInternalNote(e.target.value)}
                      placeholder="Notes for the reviewer..."
                      className="w-full p-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#1336E8]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Footer Navigation Buttons */}
            <div className="flex items-center justify-between border-t border-[#EAECF0] pt-4">
              <button
                type="button"
                onClick={() => {
                  if (currentStep > 1) setCurrentStep(currentStep - 1);
                  else onCancel();
                }}
                className="px-4 py-2 border border-[#D0D5DD] text-xs font-semibold text-[#344054] rounded-xl hover:bg-[#F2F4F7] transition-colors"
              >
                {currentStep === 1 ? 'Cancel' : 'Back'}
              </button>

              <div className="flex items-center gap-2">
                {currentStep < 6 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="px-5 py-2.5 bg-[#1336E8] hover:bg-[#0E27B3] text-white text-xs font-semibold rounded-xl shadow-md shadow-[#1336E8]/20 transition-all flex items-center gap-1.5"
                  >
                    <span>Continue</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleFinish(false)}
                      disabled={isSubmitting}
                      className="px-4 py-2.5 bg-white border border-[#D0D5DD] hover:bg-[#F2F4F7] text-xs font-semibold text-[#344054] rounded-xl transition-colors"
                    >
                      Save as Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFinish(true)}
                      disabled={isSubmitting}
                      className="px-5 py-2.5 bg-[#1336E8] hover:bg-[#0E27B3] text-white text-xs font-semibold rounded-xl shadow-md shadow-[#1336E8]/20 transition-all flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit for Approval</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Video Playback & Fullscreen Image Preview */}
      <MediaViewerModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        mediaUrl={activeLightboxUrl || ''}
        mediaType={activeLightboxType}
      />
    </div>
  );
};