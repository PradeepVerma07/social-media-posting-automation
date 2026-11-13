import React, { useEffect, useRef, useState } from 'react';
import {
  Film,
  Image as ImageIcon,
  Monitor,
  ArrowRight,
  RefreshCw,
  Loader2,
  Sparkles,
  Layers,
  Smile,
  Hash,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Play,
  Zap,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { api } from '../../api/client';
import { CreationPanel } from './CreationPanel';
import { SocialDestinationSelect } from './SocialDestinationSelect';
import type { Brand, SocialAccount } from '../../../server/src/types';

const field =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';

export type ContentFormat = 'reels' | 'story' | 'feed' | 'carousel';

interface CarouselSlide {
  id: string;
  slideNumber: number;
  title: string;
  prompt: string;
  imageUrl?: string;
  isGenerating?: boolean;
  error?: string;
}

export function CreatorStudio({
  brands,
  onOpenDesk,
}: {
  brands: Brand[];
  onOpenDesk: (id?: string) => void;
}) {
  const [format, setFormat] = useState<ContentFormat>('reels');
  const [kind, setKind] = useState<'video' | 'post'>('video');
  const [brandId, setBrandId] = useState(brands[0]?.id || 0);

  // Content state
  const [title, setTitle] = useState('');
  const [brief, setBrief] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [language, setLanguage] = useState('English');
  const [aspect, setAspect] = useState('9:16');
  const [duration, setDuration] = useState(30);

  // Status and accounts
  const [status, setStatus] = useState<any>(null);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [accountIds, setAccountIds] = useState<string[]>([]);
  const [showTrash, setShowTrash] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const trashRef = useRef(false);
  const refreshing = useRef<Promise<void> | null>(null);
  trashRef.current = showTrash;

  const [jobs, setJobs] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [busy, setBusy] = useState(false);
  const brandRef = useRef(brandId);
  brandRef.current = brandId;
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const requestId = useRef<string | null>(null);

  // Carousel specific state
  const [carouselSlideCount, setCarouselSlideCount] = useState<number>(4);
  const [carouselSlides, setCarouselSlides] = useState<CarouselSlide[]>([
    { id: '1', slideNumber: 1, title: 'Hook / Headline', prompt: 'Eye-catching visual with bold typography for the cover slide.' },
    { id: '2', slideNumber: 2, title: 'The Problem / Context', prompt: 'Clear graphic explaining the main challenge or question.' },
    { id: '3', slideNumber: 3, title: 'The Solution / Insight', prompt: 'Detailed breakdown of the core solution or features.' },
    { id: '4', slideNumber: 4, title: 'Call to Action', prompt: 'Engaging closing slide with follow, like and visit link cues.' },
  ]);
  const [isGeneratingCarousel, setIsGeneratingCarousel] = useState(false);
  const [carouselProgress, setCarouselProgress] = useState('');
  const carouselFileInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    if (refreshing.current) return refreshing.current;
    const requestedBrand = brandRef.current,
      trash = trashRef.current;
    const task = (async () => {
      const [state, data, rows] = await Promise.all([
        api.getVideoAutomationStatus(),
        api.getVideoJobs(trash),
        requestedBrand ? api.getSocialAccounts(requestedBrand) : Promise.resolve([]),
      ]);
      setStatus(state);
      if (trash === trashRef.current)
        setJobs(data.jobs.filter(j => j.workflow === 'creator'));
      if (requestedBrand === brandRef.current) setAccounts(rows);
      setLoadError('');
    })();
    refreshing.current = task;
    void task
      .finally(() => {
        refreshing.current = null;
      })
      .catch(() => {});
    return task;
  };

  useEffect(() => {
    void refresh().catch(e => setLoadError(e.message));
  }, []);

  const hasActive = jobs.some(job =>
    ['QUEUED', 'GENERATING', 'READY'].includes(job.status)
  );

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible')
        void refresh().catch(e => setLoadError(e.message));
    }, hasActive ? 5000 : 15000);
    return () => clearInterval(timer);
  }, [hasActive]);

  useEffect(() => {
    setSelectedId('');
    setJobs([]);
    void (async () => {
      await refreshing.current?.catch(() => {});
      await refresh();
    })().catch(e => setLoadError(e.message));
  }, [showTrash]);

  useEffect(() => {
    if (!brands.some(b => b.id === brandId)) setBrandId(brands[0]?.id || 0);
  }, [brands, brandId]);

  useEffect(() => {
    setAccountIds([]);
    setAccounts([]);
    if (brandId) void refresh().catch(e => setLoadError(e.message));
  }, [brandId]);

  // Synchronize format mode with kind, aspect ratio, and duration
  const handleFormatChange = (newFormat: ContentFormat) => {
    setFormat(newFormat);
    setAccountIds([]);
    setError('');
    setNotice('');

    if (newFormat === 'reels') {
      setKind('video');
      setAspect('9:16');
      setDuration(30);
    } else if (newFormat === 'story') {
      setKind('video');
      setAspect('9:16');
      setDuration(15);
    } else if (newFormat === 'feed') {
      setKind('post');
      setAspect('1:1');
    } else if (newFormat === 'carousel') {
      setKind('post');
      setAspect('1:1');
    }
  };

  useEffect(() => {
    requestId.current = null;
  }, [format, kind, brandId, title, brief, caption, hashtags, language, aspect, duration, accountIds]);

  // Eligible accounts for current format
  const isVideoFormat = format === 'reels' || (format === 'story' && kind === 'video');
  const placementTarget = format === 'reels' ? 'reels_shorts' : 'feed';
  const mediaTypeTarget = isVideoFormat ? 'video' : 'image';

  const eligible = accounts.filter(
    account =>
      account.connectionStatus === 'connected' &&
      status?.capabilities?.[account.platform]?.placements?.[placementTarget]?.includes(mediaTypeTarget)
  );

  const selected = jobs.find(j => j.id === selectedId) || jobs[0];

  // Emoji and Hashtag Quick Actions
  const emojis = ['🔥', '✨', '🚀', '💡', '🌿', '🎯', '📢', '💬', '🌟', '📈'];
  const popularHashtags = [
    '#trending',
    '#viral',
    '#reels',
    '#business',
    '#innovation',
    '#growth',
    '#marketing',
    '#newpost',
  ];

  const handleInsertEmoji = (emoji: string) => {
    setCaption(prev => (prev ? prev + ' ' + emoji : emoji));
  };

  const handleToggleHashtag = (tag: string) => {
    const tags = hashtags ? hashtags.split(/[\s,]+/).filter(Boolean) : [];
    if (tags.includes(tag)) {
      setHashtags(tags.filter(t => t !== tag).join(' '));
    } else {
      setHashtags([...tags, tag].join(' '));
    }
  };

  // Carousel Slide Count Change
  const handleSlideCountChange = (count: number) => {
    setCarouselSlideCount(count);
    setCarouselSlides(prev => {
      const next: CarouselSlide[] = [];
      for (let i = 1; i <= count; i++) {
        const existing = prev.find(s => s.slideNumber === i);
        if (existing) {
          next.push(existing);
        } else {
          next.push({
            id: String(i),
            slideNumber: i,
            title: i === 1 ? 'Cover / Hook' : i === count ? 'Call to Action' : `Slide ${i} Point`,
            prompt: `Visual concept and content for slide ${i} of the carousel.`,
          });
        }
      }
      return next;
    });
  };

  // Generate All Carousel Slides using Gemini / Studio AI
  const handleGenerateCarousel = async () => {
    if (!brandId) {
      setError('Select a brand before generating carousel slides.');
      return;
    }
    const brand = brands.find(b => b.id === brandId);
    setIsGeneratingCarousel(true);
    setError('');
    setNotice('');

    try {
      const updatedSlides = [...carouselSlides];
      for (let i = 0; i < updatedSlides.length; i++) {
        const slide = updatedSlides[i];
        setCarouselProgress(`Generating Slide ${i + 1} of ${updatedSlides.length}: ${slide.title}...`);

        const promptText = `Brand: ${brand?.name || 'Brand'}. Topic: ${title || brief || 'Social Media Carousel'}. Slide ${i + 1} of ${updatedSlides.length}: ${slide.title}. Details: ${slide.prompt || brief}. Style: Professional modern typography, high contrast graphics, vibrant brand colors, clean social media carousel card.`;

        try {
          const res = await api.generateStudio({
            brandId,
            task: 'image',
            prompt: promptText,
            platform: 'instagram',
            tone: 'professional',
            language: language || 'English',
            aspectRatio: (['1:1', '4:5', '9:16', '16:9'].includes(aspect) ? aspect : '1:1') as any,
          });

          if (res && res.imageUrl) {
            updatedSlides[i] = { ...slide, imageUrl: res.imageUrl, error: undefined };
            setCarouselSlides([...updatedSlides]);
          }
        } catch (slideErr: any) {
          console.warn(`Slide ${i + 1} generation failed:`, slideErr);
          updatedSlides[i] = { ...slide, error: slideErr.message || 'Generation failed' };
          setCarouselSlides([...updatedSlides]);
        }
      }

      setNotice(`Carousel generation complete! ${updatedSlides.filter(s => s.imageUrl).length} slide(s) generated.`);
    } catch (err: any) {
      setError(err.message || 'Failed to complete carousel generation.');
    } finally {
      setIsGeneratingCarousel(false);
      setCarouselProgress('');
    }
  };

  // Upload custom carousel image
  const handleUploadSlideImage = async (e: React.ChangeEvent<HTMLInputElement>, slideIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
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
        setCarouselSlides(prev =>
          prev.map((s, idx) => (idx === slideIndex ? { ...s, imageUrl: res.url, error: undefined } : s))
        );
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload slide image.');
    }
  };

  // Direct Publish Carousel (Zero Approval)
  const handlePublishCarouselDirect = async () => {
    const images = carouselSlides.map(s => s.imageUrl).filter(Boolean) as string[];
    if (images.length < 2) {
      setError('Carousel posts require at least 2 slide images. Generate or upload more slides.');
      return;
    }
    if (!accountIds.length) {
      setError('Select at least one connected social account to publish to.');
      return;
    }

    setBusy(true);
    setError('');
    setNotice('');

    try {
      const postCaption = caption.trim()
        ? `${caption.trim()}${hashtags.trim() ? '\n\n' + hashtags.trim() : ''}`
        : `${title.trim()}\n\nSwipe through to see the full breakdown! 👉\n\n${hashtags.trim()}`;

      await api.createPost({
        brandId,
        title: title.trim() || 'Carousel Post',
        masterCaption: postCaption,
        caption: postCaption,
        hashtags: hashtags ? hashtags.split(/[\s,]+/).filter(Boolean) : [],
        mediaUrls: images,
        media: images.map(url => ({ fileUrl: url, mediaType: 'image' })),
        mediaType: 'carousel',
        placement: 'feed',
        placements: ['feed'],
        publishNow: true,
        publishImmediately: true,
        submitForApproval: false,
        accountIds,
      });

      setNotice('🚀 Carousel published live to connected brand accounts instantly! No approval wait required.');
    } catch (err: any) {
      setError(err.message || 'Failed to publish carousel directly.');
    } finally {
      setBusy(false);
    }
  };

  // Form Submission for Video / Post Brief
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');

    // Ensure caption is NEVER the raw internal script/brief!
    const effectiveCaption = caption.trim()
      ? `${caption.trim()}${hashtags.trim() ? '\n\n' + hashtags.trim() : ''}`
      : `${title.trim()}${hashtags.trim() ? '\n\n' + hashtags.trim() : '\n\n#trending #viral'}`;

    try {
      requestId.current ||= crypto.randomUUID();
      const result = await api.createVideoJob({
        workflow: 'creator',
        kind,
        requestId: requestId.current,
        brandId,
        accountIds,
        title,
        topic: brief,
        caption: effectiveCaption,
        language,
        aspectRatio: aspect,
        durationSeconds: duration,
        autoPublish: false,
      });

      setShowTrash(false);
      trashRef.current = false;
      setJobs(previous => [result.job, ...previous.filter(j => j.id !== result.job.id)]);
      setSelectedId(result.job.id);
      setNotice(
        'Creative brief accepted! Creation will execute on your PC; the completed result with your post caption will arrive in Social Media Desk for final scheduling and approval.'
      );
      requestId.current = null;
      await refresh().catch(e => setLoadError(e.message));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (action: () => Promise<any>, message: string) => {
    if (actionBusy) return;
    setActionBusy(true);
    setError('');
    try {
      const result = await action();
      if (result.job && !result.job.deletedAt) setSelectedId(result.job.id);
      setNotice(message);
      await refresh().catch(e => setLoadError(e.message));
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setActionBusy(false);
    }
  };

  const retry = async (job: any) => {
    await runAction(
      () => api.retryCreation(job.id),
      'Retry queued. A separate creation will return through scheduling and approval.'
    );
  };
  const restore = async (job: any) => {
    await runAction(
      () => api.restoreCreation(job.id),
      'Creation restored. Review its schedule before submitting it for approval.'
    );
  };
  const trash = async (job: any) => {
    await runAction(
      () => api.trashCreation(job.id, job.postVersion),
      'Creation moved to Trash. You can restore it from View Trash.'
    );
  };

  const handleRegenerate = async (job: any, data: { instructions: string; referenceImageUrl?: string }) => {
    setActionBusy(true);
    setError('');
    setNotice('');
    try {
      const topicBase = job.topic || job.title;
      const refPart = data.referenceImageUrl ? `\n\n[REFERENCE IMAGE ASSET]: ${data.referenceImageUrl}` : '';
      const instrPart = `\n\n[REGENERATION CHANGE INSTRUCTIONS]: ${data.instructions}`;
      const newTopic = `${topicBase}${refPart}${instrPart}`;

      const res = await api.createVideoJob({
        workflow: 'creator',
        kind: job.kind || 'video',
        requestId: crypto.randomUUID(),
        brandId: job.brandId || brandId,
        accountIds: job.accountIds && job.accountIds.length > 0 ? job.accountIds : accountIds,
        title: job.title.includes('(Rev') ? `${job.title}` : `${job.title} (Revision)`,
        topic: newTopic,
        caption: job.caption || job.title,
        language: job.language || language || 'English',
        aspectRatio: job.aspectRatio || aspect || '9:16',
        durationSeconds: job.durationSeconds || duration || 30,
        referenceImageUrl: data.referenceImageUrl,
        autoPublish: false,
      });

      setShowTrash(false);
      trashRef.current = false;
      setJobs(previous => [res.job, ...previous.filter(j => j.id !== res.job.id)]);
      setSelectedId(res.job.id);
      setNotice('🚀 Video regeneration queued with your reference image & instructions! Local worker will render the new version.');
      await refresh().catch(e => setLoadError(e.message));
    } catch (err: any) {
      setError(err.message || 'Failed to start video regeneration.');
      throw err;
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] w-full space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <header className="flex flex-wrap justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
            Create → Schedule → Approve / Direct Publish
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            Creator Studio
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Generate high-impact Reels, Stories, Single Posts, or Multi-Slide Carousels with clean social captions and direct publishing.
          </p>
        </div>
        <span
          className={`inline-flex h-fit items-center gap-2 rounded-full px-3 py-2 text-xs font-medium ${
            status?.workerOnline
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-900'
          }`}
        >
          <Monitor size={15} />
          {status?.workerOnline ? 'Creation PC Online' : 'Creation PC Offline · Briefs will wait'}
        </span>
      </header>

      {/* Progress Steps */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          '1 · Select Format & Write Creative Brief',
          '2 · Set Post Caption & Social Channels',
          '3 · Review Result & Approve / Publish',
        ].map(text => (
          <div
            key={text}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-xs"
          >
            {text}
          </div>
        ))}
      </div>

      {(error || loadError) && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
          {error || loadError}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          {notice}
        </p>
      )}

      {/* Main Grid */}
      <div className="grid items-start gap-6 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-5 space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {/* Format Selector Pills */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Select Content Format
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-100 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => handleFormatChange('reels')}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  format === 'reels'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Film size={15} /> 🎬 Reel / Short
              </button>
              <button
                type="button"
                onClick={() => handleFormatChange('story')}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  format === 'story'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Film size={15} /> ⏱️ 24h Story
              </button>
              <button
                type="button"
                onClick={() => handleFormatChange('feed')}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  format === 'feed'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ImageIcon size={15} /> 📱 Feed Post
              </button>
              <button
                type="button"
                onClick={() => handleFormatChange('carousel')}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  format === 'carousel'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers size={15} /> 📚 Carousel Post
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-4">
            <fieldset disabled={busy || (!status?.canGenerate && format !== 'carousel')} className="space-y-4">
              {/* Brand Selector */}
              <label className="block space-y-1.5 text-sm font-semibold text-slate-800">
                <span>Brand</span>
                <select
                  required
                  className={field}
                  value={brandId}
                  onChange={e => setBrandId(Number(e.target.value))}
                >
                  <option value={0} disabled>
                    Select a brand
                  </option>
                  {brands.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} {!b.isActive ? '(Inactive)' : ''}
                    </option>
                  ))}
                </select>
              </label>

              {/* Working Title */}
              <label className="block space-y-1.5 text-sm font-semibold text-slate-800">
                <span>Working Title</span>
                <input
                  required
                  maxLength={160}
                  className={field}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g., WORDPRESS MANPOWER WEBSITE AD REEL"
                />
              </label>

              {/* Description / Creative Script */}
              <label className="block space-y-1.5 text-sm font-semibold text-slate-800">
                <div className="flex items-center justify-between">
                  <span>
                    {format === 'reels'
                      ? 'Detailed Video Script & Storyboard'
                      : format === 'story'
                      ? 'Story Visual Concept & Script'
                      : format === 'carousel'
                      ? 'Carousel Overall Concept & Theme'
                      : 'Detailed Visual Brief'}
                  </span>
                  <span className="text-xs text-slate-400 font-normal">
                    AI generation prompt (not published to viewers)
                  </span>
                </div>
                <textarea
                  required
                  minLength={10}
                  maxLength={12000}
                  rows={6}
                  className={field}
                  value={brief}
                  onChange={e => setBrief(e.target.value)}
                  placeholder={
                    format === 'reels' || format === 'story'
                      ? 'Paste the script, scene descriptions, visual style, voiceover lines, captions, and call to action...'
                      : 'Paste your post brief, key message, visual direction, brand colours, and call to action...'
                  }
                />
              </label>

              {/* Real Post Caption */}
              <div className="space-y-2 rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <span>Post Caption</span>
                    <span className="text-xs text-indigo-600 font-semibold">
                      (Appears live on Instagram, Facebook & channels)
                    </span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    {caption.length} / 5,000
                  </span>
                </div>

                <textarea
                  maxLength={5000}
                  rows={3}
                  className={field}
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  placeholder="Write the actual post caption viewers will read (e.g. Build stunning, responsive WordPress websites for your manpower business! Tap the link in bio to start today 👇)"
                />

                {/* Emoji quick-insert pills */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Smile size={13} /> Add Emoji:
                  </span>
                  {emojis.map(e => (
                    <button
                      type="button"
                      key={e}
                      onClick={() => handleInsertEmoji(e)}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-xs flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
                    >
                      {e}
                    </button>
                  ))}
                </div>

                {/* Hashtags Input & Pills */}
                <div className="pt-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Hash size={13} className="text-blue-600" /> Hashtags
                    </label>
                    <span className="text-[10px] text-slate-400">Appended to caption</span>
                  </div>
                  <input
                    className={field}
                    value={hashtags}
                    onChange={e => setHashtags(e.target.value)}
                    placeholder="#wordpress #webdesign #manpower #reels #business"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {popularHashtags.map(tag => (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => handleToggleHashtag(tag)}
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                          hashtags.includes(tag)
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Format Details Grid */}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5 text-sm font-semibold text-slate-800">
                  <span>Language</span>
                  <input
                    required
                    maxLength={50}
                    className={field}
                    value={language}
                    onChange={e => setLanguage(e.target.value)}
                  />
                </label>
                <label className="block space-y-1.5 text-sm font-semibold text-slate-800">
                  <span>Aspect Ratio</span>
                  <select
                    className={field}
                    value={aspect}
                    onChange={e => setAspect(e.target.value)}
                  >
                    {(format === 'reels' || format === 'story'
                      ? ['9:16', '16:9', '1:1']
                      : ['1:1', '4:5', '9:16', '16:9']
                    ).map(a => (
                      <option key={a}>{a}</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Video Length for Reels/Story */}
              {isVideoFormat && (
                <label className="block space-y-1.5 text-sm font-semibold text-slate-800">
                  <span>Video Duration (seconds)</span>
                  <input
                    className={field}
                    type="number"
                    required
                    min={5}
                    max={180}
                    value={duration}
                    onChange={e => setDuration(Number(e.target.value))}
                  />
                </label>
              )}

              {/* Social Destination Selector */}
              <SocialDestinationSelect
                key={`${brandId}:${format}:${kind}`}
                options={eligible.map(account => ({
                  id: String((account as any).accountId),
                  name: account.accountName || account.accountHandle || account.platform,
                  platform: account.platform,
                }))}
                value={accountIds}
                onChange={setAccountIds}
                disabled={busy}
              />
              {!eligible.length && (
                <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                  Connect a supported Facebook or Instagram account in the Social Accounts tab to publish this content format.
                </p>
              )}
            </fieldset>

            {/* Carousel Multi-Image Generator Section */}
            {format === 'carousel' && (
              <div className="mt-6 rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/40 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-base">
                    <Layers size={18} className="text-indigo-600" />
                    Multi-Image Carousel Studio
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 font-medium">Slides:</span>
                    <select
                      value={carouselSlideCount}
                      onChange={e => handleSlideCountChange(Number(e.target.value))}
                      className="h-8 rounded-lg border border-indigo-300 bg-white px-2 text-xs font-bold text-indigo-900"
                    >
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                        <option key={n} value={n}>
                          {n} Slides
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <p className="text-xs text-slate-600">
                  Generate high-converting carousel cards automatically with AI or upload custom graphics for each slide.
                </p>

                {/* Slides Grid Preview */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {carouselSlides.map((slide, idx) => (
                    <div
                      key={slide.id}
                      className="relative rounded-xl border border-slate-200 bg-white p-3 space-y-2 shadow-xs group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-extrabold">
                          Slide {idx + 1}
                        </span>
                        <label className="text-[10px] text-blue-600 hover:underline cursor-pointer font-semibold">
                          Upload
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => handleUploadSlideImage(e, idx)}
                          />
                        </label>
                      </div>

                      {slide.imageUrl ? (
                        <div className="aspect-square rounded-lg overflow-hidden border border-slate-100 bg-slate-100">
                          <img
                            src={slide.imageUrl}
                            alt={`Slide ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="aspect-square rounded-lg border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center p-2 text-center">
                          {slide.isGenerating ? (
                            <Loader2 size={18} className="animate-spin text-indigo-600" />
                          ) : (
                            <>
                              <ImageIcon size={20} className="text-slate-400 mb-1" />
                              <span className="text-[10px] font-medium text-slate-500">
                                {slide.title}
                              </span>
                            </>
                          )}
                        </div>
                      )}

                      <input
                        className="w-full text-[11px] font-semibold border-b border-slate-200 outline-none pb-0.5 truncate"
                        value={slide.title}
                        onChange={e => {
                          const val = e.target.value;
                          setCarouselSlides(prev =>
                            prev.map((s, i) => (i === idx ? { ...s, title: val } : s))
                          );
                        }}
                        placeholder={`Slide ${idx + 1} Title`}
                      />

                      {slide.error && (
                        <p className="text-[10px] text-red-600 truncate">{slide.error}</p>
                      )}
                    </div>
                  ))}
                </div>

                {carouselProgress && (
                  <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5 animate-pulse">
                    <Loader2 size={13} className="animate-spin" />
                    {carouselProgress}
                  </p>
                )}

                {/* Carousel Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={isGeneratingCarousel}
                    onClick={handleGenerateCarousel}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {isGeneratingCarousel ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    ✨ Generate All {carouselSlideCount} Carousel Slides with AI
                  </button>

                  <button
                    type="button"
                    disabled={
                      busy ||
                      !accountIds.length ||
                      carouselSlides.filter(s => s.imageUrl).length < 2
                    }
                    onClick={handlePublishCarouselDirect}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <Zap size={14} className="fill-yellow-300 text-yellow-300" />
                    🚀 Publish Carousel Instantly (No Approval Needed)
                  </button>
                </div>
              </div>
            )}

            {/* Standard Create Video / Post Button */}
            {format !== 'carousel' && (
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={
                    busy ||
                    !status?.configured ||
                    !status?.canGenerate ||
                    !accountIds.length
                  }
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {busy ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Sparkles size={18} />
                  )}
                  Create {format === 'reels' ? 'Reel / Short Video' : format === 'story' ? 'Story Video' : 'Image Post'}
                </button>
                <p className="mt-2 text-xs text-slate-500 text-center">
                  Created content stays as a draft until its schedule is set and approved.
                </p>
              </div>
            )}
          </form>
        </div>

        {/* Creation Preview & Queue Panel */}
        <div className="lg:col-span-7 sticky top-6">
          <CreationPanel
            jobs={jobs}
            selected={selected}
            onSelect={setSelectedId}
            onRefresh={() => void refresh().catch(e => setLoadError(e.message))}
            onOpenDesk={onOpenDesk}
            onTrash={trash}
            onRestore={job => restore(job).catch(() => {})}
            onRetry={retry}
            onRegenerate={handleRegenerate}
            showTrash={showTrash}
            onToggleTrash={() => setShowTrash(value => !value)}
            canManage={!!status?.canGenerate}
            busy={actionBusy}
            workerOnline={!!status?.workerOnline}
          />
        </div>
      </div>
    </div>
  );
}
