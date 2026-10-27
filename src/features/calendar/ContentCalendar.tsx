import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  AlertTriangle,
  Send,
  Eye,
  CheckCircle2,
  Trash2,
  Share2,
  Sparkles,
  ExternalLink,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
  Youtube,
  Image as ImageIcon,
  Check,
  X,
  Layers,
  ArrowRight,
  Edit2,
  Save,
  MessageCircle,
  Zap,
  Film,
  UploadCloud,
  Loader2,
  Play,
  Video,
  Maximize2,
  Link,
  UserPlus,
  Tag,
  AtSign
} from 'lucide-react';
import { Post, Brand, SocialPlatform } from '../../../server/src/types';
import { api } from '../../api/client';
import { MediaViewerModal } from '../../components/media/MediaViewerModal';
import {
  formatISTTime,
  formatISTDateTime,
  formatISTDate,
  formatISTShort,
  toISTInputValues,
  fromISTInputValues
} from '../../utils/timezone';

interface ContentCalendarProps {
  posts: Post[];
  brands: Brand[];
  onSelectPost: (post: Post) => void;
  onCreatePost?: (postData?: any) => void;
  onSchedulePost?: (postData: any) => Promise<void> | void;
  onUpdatePost?: (postId: number, updates: Partial<Post>) => Promise<void> | void;
  onPublishNow?: (postId: number) => void;
  onDeletePost?: (postId: number) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const CALENDAR_MEDIA_PRESETS = [
  {
    category: '🎬 High-Performance Videos (MP4 for Reels & Shorts)',
    items: [
      {
        id: 'video_nature_reel',
        label: '🎥 Flower Plant Nature Reel (Vertical 9:16 MP4)',
        url: 'https://videos.pexels.com/video-files/39046146/16615054_2160_3840_25fps.mp4',
        type: 'video',
      },
      {
        id: 'video_breeze_leaves',
        label: '🌿 Foliage & Leaves in Breeze (MP4 Video)',
        url: 'https://assets.mixkit.co/videos/preview/mixkit-tree-branches-in-the-breeze-1188-large.mp4',
        type: 'video',
      },
      {
        id: 'video_aerial_forest',
        label: '🌲 Aerial Botanical Forest Canopy (MP4 Video)',
        url: 'https://assets.mixkit.co/videos/preview/mixkit-aerial-view-of-a-dense-forest-tree-canopy-41846-large.mp4',
        type: 'video',
      },
    ],
  },
  {
    category: '🖼️ High-Resolution Images (Feed & Stories)',
    items: [
      {
        id: 'preset_flower_1',
        label: '🌱 Flower Plant Succulent Routine (HD)',
        url: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=1200&q=80',
        type: 'image',
      },
      {
        id: 'preset_flower_2',
        label: '🪴 Indoor Botanical Desk Garden (HD)',
        url: 'https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&w=1200&q=80',
        type: 'image',
      },
      {
        id: 'preset_flower_3',
        label: '🍃 Modern Greenhouse Planter (HD)',
        url: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&q=80',
        type: 'image',
      },
      {
        id: 'preset_flower_4',
        label: '🌿 Organic Botanical Soil & Nutrition (HD)',
        url: 'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?auto=format&fit=crop&w=1200&q=80',
        type: 'image',
      },
    ],
  },
];

export const ContentCalendar: React.FC<ContentCalendarProps> = ({
  posts,
  brands,
  onSelectPost,
  onCreatePost,
  onSchedulePost,
  onUpdatePost,
  onPublishNow,
  onDeletePost,
}) => {
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month');

  // Real-time dynamic date state (Defaults to Current System Date: October 2026)
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear() || 2026);
  const [currentMonthIndex, setCurrentMonthIndex] = useState<number>(today.getMonth() !== undefined ? today.getMonth() : 9); // 0-indexed

  // Modal State for Clicking on a Date
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState<string>(''); // YYYY-MM-DD
  const [scheduleTime, setScheduleTime] = useState<string>('22:30'); // Default 10:30 PM
  const [selectedBrandId, setSelectedBrandId] = useState<number>(brands[0]?.id || 1);
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>(['facebook', 'instagram']);
  const [selectedPlacements, setSelectedPlacements] = useState<('feed' | 'story' | 'reels_shorts')[]>(['feed']);
  const [postTitle, setPostTitle] = useState<string>('');
  const [caption, setCaption] = useState<string>('');
  const [hashtags, setHashtags] = useState<string>('');
  const [mediaUrl, setMediaUrl] = useState<string>(
    'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=1200&q=80'
  );
  const [targetUrl, setTargetUrl] = useState<string>('');

  // Instagram User Tagging State for Calendar Scheduler
  const [calendarTaggedUsers, setCalendarTaggedUsers] = useState<string[]>([]);
  const [calendarTagInput, setCalendarTagInput] = useState<string>('');

  const handleAddCalendarTag = (rawTag?: string) => {
    const val = (rawTag || calendarTagInput).trim().replace(/^@/, '');
    if (!val) return;
    if (!calendarTaggedUsers.includes(val)) {
      setCalendarTaggedUsers(prev => [...prev, val]);
    }
    setCalendarTagInput('');
  };

  const handleRemoveCalendarTag = (username: string) => {
    setCalendarTaggedUsers(prev => prev.filter(u => u !== username));
  };

  // Professional Media Upload & Preset Dropdown State
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [selectedMediaPreset, setSelectedMediaPreset] = useState<string>('preset_flower_1');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  // Calendar Lightbox Modal
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState('');
  const [lightboxType, setLightboxType] = useState<'image' | 'video'>('image');

  const scheduleFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const isVideoMedia = (url?: string | null) => {
    if (!url) return false;
    return (
      url.endsWith('.mp4') ||
      url.endsWith('.webm') ||
      url.endsWith('.mov') ||
      (url.includes('/uploads/') && /\.(mp4|webm|mov)/i.test(url)) ||
      url.includes('.mp4?') ||
      /(?:youtube\.com|youtu\.be)/i.test(url) ||
      selectedPlacements.includes('reels_shorts')
    );
  };

  const handleDirectUpload = async (file: File) => {
    setIsUploadingMedia(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const reader = new FileReader();
      reader.onload = async e => {
        try {
          const dataUrl = e.target?.result as string;
          const uploadRes = await api.uploadMedia({
            filename: file.name,
            fileData: dataUrl,
            mimeType: file.type,
          });

          setMediaUrl(uploadRes.url);
          setUploadedFileName(file.name);
          setSelectedMediaPreset('custom_uploaded');
          setUploadSuccess(`Uploaded "${file.name}" (${(file.size / 1024 / 1024).toFixed(2)} MB) - Ready to schedule!`);
        } catch (err: any) {
          setUploadError(err.message || 'Failed to upload media file');
        } finally {
          setIsUploadingMedia(false);
        }
      };

      reader.onerror = () => {
        setUploadError('Failed to read file from disk');
        setIsUploadingMedia(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setUploadError(err.message || 'File processing error');
      setIsUploadingMedia(false);
    }
  };

  // Fallback brand profiles guaranteeing non-empty dropdown
  const availableBrands = brands && brands.length > 0 ? brands : [
    {
      id: 1,
      brandId: 'BR-001',
      name: 'Flower Plant',
      clientId: 'CL-001',
      timezone: 'Asia/Kolkata',
      country: 'IN',
      defaultApproverId: 3,
      defaultHashtags: '#flowerplant #nature #blooms',
      tokens: { facebookPageId: '1454740611044963' }
    }
  ];

  React.useEffect(() => {
    if (availableBrands.length > 0 && (!selectedBrandId || !availableBrands.some(b => b.id === selectedBrandId))) {
      setSelectedBrandId(availableBrands[0].id);
    }
  }, [brands]);

  // Selected Post Details Inspector & Inline Edit Modal State
  const [inspectingPost, setInspectingPost] = useState<Post | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const startEditing = (post: Post) => {
    setEditTitle(post.title || '');
    setEditCaption(post.masterCaption || '');
    const { date, time } = toISTInputValues(post.scheduledAt);
    setEditDate(date);
    setEditTime(time);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!inspectingPost) return;
    try {
      const scheduledAtIso = fromISTInputValues(editDate, editTime);
      const updates = {
        title: editTitle,
        masterCaption: editCaption,
        scheduledAt: scheduledAtIso,
      };

      if (onUpdatePost) {
        await onUpdatePost(inspectingPost.id, updates);
      }

      setInspectingPost({
        ...inspectingPost,
        ...updates,
      });
      setIsEditing(false);
      showNotification('Post updated successfully!');
    } catch (err) {
      console.error('Failed saving post edits:', err);
      showNotification('Failed to update post.');
    }
  };

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Month Navigation
  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentMonthIndex(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonthIndex(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentMonthIndex(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonthIndex(prev => prev + 1);
    }
  };

  const handleGoToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonthIndex(now.getMonth());
  };

  // Days Calculation for Month View
  const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonthIndex, 1).getDay(); // 0 = Sun
  const daysInPrevMonth = new Date(currentYear, currentMonthIndex, 0).getDate();
  const totalCells = firstDayOfWeek + daysInMonth;
  const totalWeeks = Math.ceil(totalCells / 7);
  const nextMonthOverflow = totalWeeks * 7 - totalCells;

  // Selected Brand Details
  const selectedBrand = availableBrands.find(b => b.id === selectedBrandId) || availableBrands[0];

  // When clicking on ANY day cell:
  const handleDayClick = (dayNumber: number) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateFormatted = `${currentYear}-${pad(currentMonthIndex + 1)}-${pad(dayNumber)}`;
    setSelectedDateStr(dateFormatted);
    setScheduleTime('22:30'); // Default to 10:30 PM (22:30)

    // Pre-fill fields with selected brand
    if (selectedBrand) {
      setHashtags(selectedBrand.defaultHashtags || '#FlowerPlant #IndoorPlants #GreenLife');
      setTargetUrl(`https://facebook.com/${selectedBrand.tokens?.facebookPageId || '1454740611044963'}`);
    }
    setPostTitle(`New Update - ${MONTH_NAMES[currentMonthIndex].substring(0, 3)} ${dayNumber}`);
    setCaption(
      `Exciting updates from ${selectedBrand?.name || 'Flower Plant'}! Discover botanical freshness, indoor succulent routines, and organic plant care tips. Elevate your space today! 🪴✨`
    );
    setCalendarTaggedUsers([]);
    setCalendarTagInput('');
    setIsScheduleModalOpen(true);
  };

  // Toggle platform selection
  const togglePlatform = (p: SocialPlatform) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(item => item !== p) : [...prev, p]
    );
  };

  // Submit Schedule Form
  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDateStr || !postTitle.trim() || !caption.trim() || selectedPlatforms.length === 0) {
      alert('Please fill out post title, caption, and select at least one social platform.');
      return;
    }

    const brand = availableBrands.find(b => b.id === selectedBrandId) || availableBrands[0];
    const tz = brand?.timezone || 'Asia/Kolkata';

    const scheduledAtIso =
      tz === 'Asia/Kolkata'
        ? fromISTInputValues(selectedDateStr, scheduleTime)
        : new Date(`${selectedDateStr}T${scheduleTime}:00Z`).toISOString();

    const isVideo = isVideoMedia(mediaUrl);

    const newPostPayload = {
      brandId: brand.id,
      brandName: brand.name,
      title: postTitle.trim(),
      masterCaption: caption.trim(),
      scheduleDate: selectedDateStr,
      scheduleTime: scheduleTime.length === 5 ? `${scheduleTime}:00` : scheduleTime,
      hashtags: hashtags.trim(),
      targetUrl: targetUrl.trim(),
      taggedUsers: calendarTaggedUsers,
      timezone: tz,
      country: brand.country || 'IN',
      scheduledAt: scheduledAtIso,
      approvalStatus: 'approved',
      publishingStatus: 'scheduled',
      source: 'calendar',
      placement: selectedPlacements,
      placements: selectedPlacements,
      mediaType: isVideo ? 'video' : 'image',
      platforms: selectedPlatforms.map(p => ({
        platform: p,
        publishingStatus: 'pending',
      })),
      media: mediaUrl.trim()
        ? [
            {
              id: Date.now(),
              postId: 0,
              mediaType: (isVideo ? 'video' : 'image') as any,
              fileUrl: mediaUrl.trim(),
              originalFileName: uploadedFileName || (isVideo ? 'scheduled_video.mp4' : 'scheduled_image.jpg'),
              mimeType: isVideo ? 'video/mp4' : 'image/jpeg',
              fileSizeBytes: isVideo ? 5400000 : 1540000,
            },
          ]
        : [],
    };

    if (onSchedulePost) {
      await onSchedulePost(newPostPayload);
    } else if (onCreatePost) {
      onCreatePost(newPostPayload);
    }

    // Seamlessly route into CI360 AI Neural Studio for pre-flight scoring & optimization
    api.interceptPost({
      caption: postCaption.trim(),
      mediaUrl: mediaUrl.trim() || undefined,
      scheduledAt: scheduledAtIso,
      platform: selectedPlatforms[0] || 'instagram',
      mode: 'copilot',
    }).catch(err => console.warn('[AI Studio Intercept] Pre-flight recording skipped:', err));

    setIsScheduleModalOpen(false);
    showNotification(`Post "${postTitle.trim()}" saved and scheduled for ${selectedDateStr} at ${scheduleTime} (${tz})!`);
  };

  // Find posts scheduled for a specific day in the current viewed month
  const getPostsForDay = (day: number) => {
    return posts.filter(p => {
      const dateSource = p.scheduledAt || p.publishedAt;
      if (!dateSource) return false;

      // 1. Check using IST timezone input values (Asia/Kolkata)
      try {
        const istValues = toISTInputValues(dateSource);
        if (istValues?.date) {
          const [y, m, d] = istValues.date.split('-').map(Number);
          if (y === currentYear && m === (currentMonthIndex + 1) && d === day) {
            return true;
          }
        }
      } catch {}

      // 2. Fallback check using local/UTC date
      const d = new Date(dateSource);
      return (
        (d.getDate() === day && d.getMonth() === currentMonthIndex && d.getFullYear() === currentYear) ||
        (d.getUTCDate() === day && d.getUTCMonth() === currentMonthIndex && d.getUTCFullYear() === currentYear)
      );
    });
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook':
        return <Facebook className="w-3 h-3 text-blue-600" />;
      case 'instagram':
        return <Instagram className="w-3 h-3 text-pink-600" />;
      case 'linkedin':
        return <Linkedin className="w-3 h-3 text-sky-600" />;
      case 'x':
        return <Twitter className="w-3 h-3 text-slate-800" />;
      case 'youtube':
        return <Youtube className="w-3 h-3 text-rose-600" />;
      case 'whatsapp':
        return <MessageCircle className="w-3 h-3 text-emerald-600" />;
      default:
        return <Share2 className="w-3 h-3 text-emerald-600" />;
    }
  };

  return (
    <div className="h-full max-h-full flex flex-col p-3 sm:p-4 lg:p-5 space-y-3 overflow-hidden select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 bg-[#101828] text-white rounded-xl shadow-2xl border border-slate-700 text-xs animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Calendar Header - Compact Single Screen Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white px-4 py-2.5 sm:py-3 rounded-2xl border border-[#EAECF0] shadow-2xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EFF8FF] text-[#1336E8] border border-[#B2DDFF] flex items-center justify-center font-bold shrink-0 shadow-xs">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-[#101828] leading-tight">
                {MONTH_NAMES[currentMonthIndex]} {currentYear}
              </h2>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-full">
                LIVE REAL-TIME
              </span>
            </div>
            <p className="text-[11px] text-[#667085] mt-0.5 truncate">
              Click on any date to schedule a post · Timezone: <strong>{selectedBrand?.timezone || 'Asia/Kolkata'}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          {/* Month Prev/Today/Next Navigation */}
          <div className="flex items-center bg-[#F2F4F7] p-0.5 rounded-xl border border-[#EAECF0]">
            <button
              onClick={handlePrevMonth}
              className="p-1 hover:bg-white rounded-lg transition-colors text-[#344054]"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleGoToday}
              className="px-2.5 py-1 text-xs font-semibold text-[#101828] hover:bg-white rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1 hover:bg-white rounded-lg transition-colors text-[#344054]"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center p-0.5 bg-[#F2F4F7] rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                viewMode === 'month' ? 'bg-white text-[#101828] shadow-sm' : 'text-[#667085]'
              }`}
            >
              Month View
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                viewMode === 'agenda' ? 'bg-white text-[#101828] shadow-sm' : 'text-[#667085]'
              }`}
            >
              Agenda ({posts.length})
            </button>
          </div>

          {/* Schedule Button */}
          <button
            onClick={() => handleDayClick(today.getDate())}
            className="px-3.5 py-1.5 bg-[#1336E8] hover:bg-[#0E27B3] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule Post</span>
          </button>
        </div>
      </div>

      {/* MONTH VIEW - Single Screen Responsive Height Grid */}
      {viewMode === 'month' && (
        <div className="flex-1 min-h-0 bg-white rounded-2xl border border-[#EAECF0] shadow-sm flex flex-col overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-[#EAECF0] bg-[#F8FAFC] text-center text-xs font-bold text-[#475467] py-2 shrink-0 uppercase tracking-wider">
            <div className="text-rose-600">Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div className="text-blue-600">Sat</div>
          </div>

          {/* Day Cells Grid - Dynamically fills 100% of available viewport space without outer scroll */}
          <div
            className="flex-1 grid grid-cols-7 divide-x divide-y divide-[#EAECF0] min-h-0"
            style={{ gridTemplateRows: `repeat(${totalWeeks}, minmax(0, 1fr))` }}
          >
            {/* Previous month overflow days */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => {
              const dayNum = daysInPrevMonth - firstDayOfWeek + i + 1;
              return (
                <div
                  key={`prev-${i}`}
                  className="bg-[#FAFAFA] p-1.5 sm:p-2 text-slate-300 select-none flex flex-col justify-between min-h-0 overflow-hidden"
                >
                  <span className="text-xs font-mono">{dayNum}</span>
                </div>
              );
            })}

            {/* Days of Current Month */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayPosts = getPostsForDay(day);
              const isCurrentDay =
                day === today.getDate() &&
                currentMonthIndex === today.getMonth() &&
                currentYear === today.getFullYear();

              return (
                <div
                  key={`day-${day}`}
                  onClick={() => handleDayClick(day)}
                  className={`p-1.5 sm:p-2 flex flex-col justify-between transition-all group cursor-pointer relative overflow-hidden min-h-0 ${
                    isCurrentDay ? 'bg-[#EFF8FF]/40 border-2 border-[#1336E8]/40' : 'hover:bg-[#F8FAFC]'
                  }`}
                >
                  {/* Top Bar of Day */}
                  <div className="flex items-center justify-between pointer-events-none shrink-0">
                    <span
                      className={`text-xs font-mono font-bold w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-all ${
                        isCurrentDay
                          ? 'bg-[#1336E8] text-white shadow-xs'
                          : 'text-[#344054] group-hover:bg-[#EAECF0]'
                      }`}
                    >
                      {day}
                    </span>

                    <div className="flex items-center gap-1">
                      {isCurrentDay && (
                        <span className="text-[9px] font-bold text-[#1336E8] uppercase tracking-wider hidden sm:inline">
                          TODAY
                        </span>
                      )}
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-[#1336E8] font-bold flex items-center gap-0.5 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-200">
                        <Plus className="w-2.5 h-2.5" /> Post
                      </span>
                    </div>
                  </div>

                  {/* Scheduled Posts on this Day */}
                  <div className="flex-1 min-h-0 overflow-y-auto space-y-1 my-0.5 pr-0.5 scrollbar-thin">
                    {dayPosts.map(p => {
                      const isSuccess = p.publishingStatus === 'published';
                      const isScheduled = p.publishingStatus === 'scheduled';
                      const platform = p.platforms?.[0]?.platform || 'facebook';

                      return (
                        <div
                          key={p.id}
                          onClick={e => {
                            e.stopPropagation();
                            setInspectingPost(p);
                          }}
                          className={`p-1 sm:p-1.5 rounded-lg border text-[10px] sm:text-[11px] font-semibold truncate transition-all flex items-center justify-between gap-1 shadow-2xs hover:shadow-sm cursor-pointer ${
                            isSuccess
                              ? 'bg-[#ECFDF3] border-[#A6F4C5] text-[#027A48] hover:bg-[#D1FADF]'
                              : isScheduled
                              ? 'bg-[#EFF8FF] border-[#B2DDFF] text-[#175CD3] hover:bg-[#D1E9FF]'
                              : 'bg-[#F2F4F7] border-[#EAECF0] text-[#344054]'
                          }`}
                          title={`${p.title} - Click to inspect`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            {getPlatformIcon(platform)}
                            <span className="truncate">{p.title}</span>
                          </div>
                          <span className="text-[9px] font-mono shrink-0 px-1 py-0.2 rounded bg-white/60">
                            {p.scheduledAt ? formatISTTime(p.scheduledAt, false) : '22:30'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Bottom Hint */}
                  <div className="text-[9px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity truncate shrink-0">
                    Click date to schedule
                  </div>
                </div>
              );
            })}

            {/* Next month overflow days to complete the rectangle */}
            {Array.from({ length: nextMonthOverflow }).map((_, i) => (
              <div
                key={`next-${i}`}
                className="bg-[#FAFAFA] p-1.5 sm:p-2 text-slate-300 select-none flex flex-col justify-between min-h-0 overflow-hidden"
              >
                <span className="text-xs font-mono">{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AGENDA VIEW */}
      {viewMode === 'agenda' && (
        <div className="flex-1 min-h-0 bg-white rounded-2xl border border-[#EAECF0] shadow-sm divide-y divide-[#EAECF0] overflow-y-auto">
          <div className="p-4 bg-[#F8FAFC] border-b border-[#EAECF0] flex items-center justify-between text-xs text-[#475467] font-semibold sticky top-0 z-10">
            <span>Scheduled Auto-Publishing Queue ({posts.length} Posts)</span>
            <span>Sorted by Scheduled Execution Time</span>
          </div>

          {posts.map(post => {
            const { date: istDateStr } = toISTInputValues(post.scheduledAt);
            const [, dtMonth, dtDay] = (istDateStr || '').split('-').map(Number);
            const monthLabel = MONTH_NAMES[((dtMonth || 10) - 1)]?.substring(0, 3) || 'OCT';
            const dayLabel = dtDay || 25;
            const platform = post.platforms?.[0]?.platform || 'facebook';

            return (
              <div
                key={post.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#F8FAFC] transition-colors"
              >
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#EFF8FF] border border-[#B2DDFF] flex flex-col items-center justify-center font-mono shrink-0">
                    <span className="text-[10px] text-[#1336E8] font-bold uppercase">
                      {monthLabel}
                    </span>
                    <span className="text-lg font-bold text-[#101828] leading-none">
                      {dayLabel}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-[#EFF8FF] text-[#1336E8] text-[10px] font-bold uppercase">
                        {post.brandName}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-[#344054]">
                        {getPlatformIcon(platform)}
                        <span className="uppercase">{platform}</span>
                      </div>
                      <span className="text-xs font-mono text-[#667085] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {post.scheduledAt ? formatISTTime(post.scheduledAt, false) : '--:--'} (IST · Asia/Kolkata)
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#D1E9FF] text-[#175CD3]">
                        {post.publishingStatus}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[#101828]">{post.title}</h4>
                    <p className="text-xs text-[#667085] line-clamp-1">{post.masterCaption}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setInspectingPost(post)}
                    className="px-3.5 py-2 bg-white border border-[#D0D5DD] hover:bg-[#F2F4F7] text-xs font-semibold text-[#344054] rounded-xl transition-colors"
                  >
                    Inspect
                  </button>
                  {onPublishNow && (
                    <button
                      onClick={() => onPublishNow(post.id)}
                      className="px-3.5 py-2 bg-[#12B76A] hover:bg-[#027A48] text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-sm transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      <span>Publish Now</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SCHEDULE POST ON CLICKED DATE MODAL */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#EAECF0] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1336E8] text-[10px] font-bold border border-blue-200">
                    CALENDAR DATE SCHEDULER
                  </span>
                  <span className="text-xs font-mono text-[#667085]">
                    {selectedDateStr}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-[#101828] mt-1">
                  Schedule Post for {selectedDateStr}
                </h3>
                <p className="text-xs text-[#667085]">
                  Automate publishing to Meta Facebook, Instagram &amp; other networks at this exact date and time.
                </p>
              </div>
              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleScheduleSubmit} className="space-y-6 text-xs">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Post Details, Target Channels & Schedule (7 Cols) */}
                <div className="lg:col-span-7 space-y-4">
                  {/* Date & Time Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-[#F8FAFC] border border-[#EAECF0] rounded-2xl">
                    <div>
                      <label className="font-semibold text-[#344054] block mb-1">
                        Target Schedule Date
                      </label>
                      <input
                        type="date"
                        value={selectedDateStr}
                        onChange={e => setSelectedDateStr(e.target.value)}
                        className="w-full h-10 px-3 bg-white border border-[#D0D5DD] rounded-xl text-xs font-mono font-bold text-[#101828] focus:ring-2 focus:ring-[#1336E8]"
                        required
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-[#344054] block mb-1">
                        Schedule Time (24h)
                      </label>
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={e => setScheduleTime(e.target.value)}
                        className="w-full h-10 px-3 bg-white border border-[#D0D5DD] rounded-xl text-xs font-mono font-bold text-[#101828] focus:ring-2 focus:ring-[#1336E8]"
                        required
                      />
                      <span className="text-[10px] text-[#667085] mt-1 block">
                        Timezone: <strong>{selectedBrand?.timezone || 'Asia/Kolkata'}</strong>
                      </span>
                    </div>
                  </div>

              {/* Brand Selection */}
              <div>
                <label className="font-semibold text-[#344054] block mb-1">
                  Brand Profile
                </label>
                <select
                  value={selectedBrandId}
                  onChange={e => {
                    const bId = Number(e.target.value);
                    setSelectedBrandId(bId);
                    const b = availableBrands.find(item => item.id === bId);
                    if (b?.defaultHashtags) setHashtags(b.defaultHashtags);
                  }}
                  className="w-full h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1336E8]"
                >
                  {availableBrands.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.timezone || 'Asia/Kolkata'}) - {b.tokens?.facebookPageId || b.id === 1 ? 'Meta Connected' : 'Ready'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Social Media Selection Dropdown & Multi-Selector */}
              <div>
                <label className="font-semibold text-[#344054] block mb-1">
                  Social Media Channels (Select dropdown or toggle buttons)
                </label>
                <select
                  defaultValue=""
                  onChange={e => {
                    const val = e.target.value;
                    if (!val) return;
                    if (val === 'all') {
                      setSelectedPlatforms(['facebook', 'instagram', 'youtube', 'whatsapp', 'linkedin', 'x']);
                    } else if (val === 'meta') {
                      setSelectedPlatforms(['facebook', 'instagram']);
                    } else if (val === 'stories') {
                      setSelectedPlatforms(['instagram', 'facebook', 'whatsapp']);
                      if (!selectedPlacements.includes('story')) {
                        setSelectedPlacements(prev => [...prev, 'story']);
                      }
                    } else if (val === 'shorts') {
                      setSelectedPlatforms(['youtube', 'instagram', 'facebook']);
                      if (!selectedPlacements.includes('reels_shorts')) {
                        setSelectedPlacements(prev => [...prev, 'reels_shorts']);
                      }
                    } else {
                      const p = val as SocialPlatform;
                      if (!selectedPlatforms.includes(p)) {
                        setSelectedPlatforms([...selectedPlatforms, p]);
                      }
                    }
                    e.target.value = '';
                  }}
                  className="w-full h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#1336E8] mb-2"
                >
                  <option value="">➕ Choose Channel or Preset Dropdown...</option>
                  <option value="youtube">▶️ YouTube (Community Post, Video, Shorts)</option>
                  <option value="instagram">📸 Instagram Business</option>
                  <option value="facebook">📘 Facebook Page</option>
                  <option value="whatsapp">💬 WhatsApp (Channel &amp; Status)</option>
                  <option value="linkedin">💼 LinkedIn</option>
                  <option value="x">🐦 X (Twitter)</option>
                  <option value="all">🌐 All 6 Channels (Omnichannel Broadcast)</option>
                  <option value="meta">Meta Suite (Facebook Page + Instagram)</option>
                  <option value="stories">⚡ Story Package (Instagram + Facebook + WhatsApp)</option>
                  <option value="shorts">🎬 Shorts &amp; Reels (YouTube + Instagram + Facebook)</option>
                </select>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => togglePlatform('facebook')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                      selectedPlatforms.includes('facebook')
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-[#F6F8FC] text-[#475467] border-[#D0D5DD] hover:bg-[#EEF2F6]'
                    }`}
                  >
                    <Facebook className="w-3.5 h-3.5" />
                    <span>Facebook Page</span>
                    {selectedPlatforms.includes('facebook') && <Check className="w-3 h-3 ml-1" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePlatform('instagram')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                      selectedPlatforms.includes('instagram')
                        ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                        : 'bg-[#F6F8FC] text-[#475467] border-[#D0D5DD] hover:bg-[#EEF2F6]'
                    }`}
                  >
                    <Instagram className="w-3.5 h-3.5" />
                    <span>Instagram Business</span>
                    {selectedPlatforms.includes('instagram') && <Check className="w-3 h-3 ml-1" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePlatform('youtube')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                      selectedPlatforms.includes('youtube')
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-[#F6F8FC] text-[#475467] border-[#D0D5DD] hover:bg-[#EEF2F6]'
                    }`}
                  >
                    <Youtube className="w-3.5 h-3.5" />
                    <span>YouTube</span>
                    {selectedPlatforms.includes('youtube') && <Check className="w-3 h-3 ml-1" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePlatform('whatsapp')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                      selectedPlatforms.includes('whatsapp')
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-[#F6F8FC] text-[#475467] border-[#D0D5DD] hover:bg-[#EEF2F6]'
                    }`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                    {selectedPlatforms.includes('whatsapp') && <Check className="w-3 h-3 ml-1" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePlatform('linkedin')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                      selectedPlatforms.includes('linkedin')
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : 'bg-[#F6F8FC] text-[#475467] border-[#D0D5DD] hover:bg-[#EEF2F6]'
                    }`}
                  >
                    <Linkedin className="w-3.5 h-3.5" />
                    <span>LinkedIn</span>
                    {selectedPlatforms.includes('linkedin') && <Check className="w-3 h-3 ml-1" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePlatform('x')}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                      selectedPlatforms.includes('x')
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-[#F6F8FC] text-[#475467] border-[#D0D5DD] hover:bg-[#EEF2F6]'
                    }`}
                  >
                    <Twitter className="w-3.5 h-3.5" />
                    <span>X (Twitter)</span>
                    {selectedPlatforms.includes('x') && <Check className="w-3 h-3 ml-1" />}
                  </button>
                </div>
              </div>

              {/* Publishing Format / Placement (Multi-Select: Feed, Story, Reels/Shorts) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-[#344054] flex items-center gap-1.5">
                    <span>Publishing Format / Placement</span>
                    <span className="text-[10px] text-[#667085] font-normal">(Select multiple)</span>
                  </label>
                  <div className="flex items-center gap-1 flex-wrap justify-end">
                    {selectedPlacements.map(p => (
                      <span key={p} className="text-[10px] font-bold uppercase tracking-wider text-[#1336E8] bg-[#EFF8FF] px-2 py-0.5 rounded border border-[#B2DDFF]">
                        {p === 'story' ? '24h Story' : p === 'reels_shorts' ? 'Shorts & Reels' : 'Feed Post'}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlacements(prev =>
                        prev.includes('feed')
                          ? (prev.length > 1 ? prev.filter(p => p !== 'feed') : prev)
                          : [...prev, 'feed']
                      );
                    }}
                    className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                      selectedPlacements.includes('feed')
                        ? 'bg-[#1336E8] text-white border-[#1336E8] shadow-xs'
                        : 'bg-[#F6F8FC] text-[#475467] border-[#D0D5DD] hover:bg-[#EEF2F6]'
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
                    onClick={() => {
                      setSelectedPlacements(prev =>
                        prev.includes('story')
                          ? (prev.length > 1 ? prev.filter(p => p !== 'story') : prev)
                          : [...prev, 'story']
                      );
                    }}
                    className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                      selectedPlacements.includes('story')
                        ? 'bg-gradient-to-r from-amber-500 via-rose-500 to-pink-500 text-white border-transparent shadow-xs'
                        : 'bg-[#F6F8FC] text-[#475467] border-[#D0D5DD] hover:bg-[#EEF2F6]'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] font-bold border ${
                      selectedPlacements.includes('story') ? 'bg-white text-rose-600 border-white' : 'border-[#D0D5DD] bg-white text-transparent'
                    }`}>
                      ✓
                    </div>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Story / Status</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlacements(prev => {
                        const next = prev.includes('reels_shorts')
                          ? (prev.length > 1 ? prev.filter(p => p !== 'reels_shorts') : prev)
                          : [...prev, 'reels_shorts'];
                        if (next.includes('reels_shorts') && (!mediaUrl || mediaUrl.includes('unsplash.com'))) {
                          setMediaUrl('https://videos.pexels.com/video-files/39046146/16615054_2160_3840_25fps.mp4');
                        }
                        return next;
                      });
                    }}
                    className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                      selectedPlacements.includes('reels_shorts')
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-[#F6F8FC] text-[#475467] border-[#D0D5DD] hover:bg-[#EEF2F6]'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] font-bold border ${
                      selectedPlacements.includes('reels_shorts') ? 'bg-white text-rose-600 border-white' : 'border-[#D0D5DD] bg-white text-transparent'
                    }`}>
                      ✓
                    </div>
                    <Film className="w-3.5 h-3.5" />
                    <span>Reels / Shorts</span>
                  </button>
                </div>

                {selectedPlacements.length > 1 && (
                  <p className="text-[11px] text-[#1336E8] font-medium mt-1.5 bg-[#EFF8FF] p-2 rounded-lg border border-[#B2DDFF] flex items-center gap-1">
                    <span>⚡</span>
                    <span>Multi-Placement Active: Publishing simultaneously across {selectedPlacements.map(p => p === 'story' ? 'Story' : p === 'reels_shorts' ? 'Reels/Shorts' : 'Feed').join(' &amp; ')}.</span>
                  </p>
                )}

                {selectedPlacements.includes('story') && (
                  <p className="text-[11px] text-pink-600 font-medium mt-1.5 bg-pink-50 p-2 rounded-lg border border-pink-100 flex items-center gap-1">
                    <span>✨</span>
                    <span>Posts as a 24-hour Story on Instagram, Facebook Story &amp; WhatsApp Status.</span>
                  </p>
                )}
                {selectedPlacements.includes('reels_shorts') && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1.5 bg-rose-50 p-2 rounded-lg border border-rose-100 flex items-center gap-1">
                    <span>🎬</span>
                    <span>Optimized for YouTube Shorts, Instagram Reels &amp; Facebook Reels.</span>
                  </p>
                )}
              </div>

              {/* Post Title */}
              <div>
                <label className="font-semibold text-[#344054] block mb-1">
                  Post Title *
                </label>
                <input
                  type="text"
                  value={postTitle}
                  onChange={e => setPostTitle(e.target.value)}
                  placeholder="e.g. Succulent Care & Fresh Botanical Tips"
                  className="w-full h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs focus:ring-2 focus:ring-[#1336E8] focus:bg-white"
                  required
                />
              </div>

              {/* Caption */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-[#344054]">
                    Master Caption / Content *
                  </label>
                  <span className="text-[11px] text-[#667085] font-mono">
                    {caption.length} chars
                  </span>
                </div>
                <textarea
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  rows={4}
                  placeholder="Write post content..."
                  className="w-full p-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs focus:ring-2 focus:ring-[#1336E8] focus:bg-white leading-relaxed"
                  required
                />
              </div>

              {/* Hashtags */}
              <div>
                <label className="font-semibold text-[#344054] block mb-1">
                  Hashtags
                </label>
                <input
                  type="text"
                  value={hashtags}
                  onChange={e => setHashtags(e.target.value)}
                  placeholder="#FlowerPlant #IndoorPlants #GreenLife"
                  className="w-full h-10 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs"
                />
              </div>

              {/* Instagram Tag People (Dynamic when Instagram channel selected) */}
              {selectedPlatforms.includes('instagram') && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50/70 via-rose-50/50 to-purple-50/60 border border-amber-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-xs">
                        <UserPlus className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          Tag People on Instagram
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          Meta Graph API will attach these user tags directly to the published media
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-white text-rose-600 border border-rose-200 shadow-2xs">
                      {calendarTaggedUsers.length} Tagged
                    </span>
                  </div>

                  {/* Tag Input */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-xs font-bold">@</span>
                      <input
                        type="text"
                        value={calendarTagInput}
                        onChange={e => setCalendarTagInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCalendarTag();
                          }
                        }}
                        placeholder="Instagram handle (e.g. webtrionix, techpartner)"
                        className="w-full h-9 pl-7 pr-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#1336E8] shadow-2xs font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddCalendarTag()}
                      className="px-3.5 h-9 rounded-xl bg-[#1336E8] hover:bg-[#0E27B3] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Tag</span>
                    </button>
                  </div>

                  {/* Quick Tag Suggestions */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-500 font-medium">Quick tag:</span>
                    {['webtrionix', 'meta', 'instagram', 'creators'].map(preset => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleAddCalendarTag(preset)}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-white/80 hover:bg-white text-slate-700 border border-slate-200 font-mono hover:text-[#1336E8] transition-colors"
                      >
                        +{preset}
                      </button>
                    ))}
                  </div>

                  {/* Tagged Chips */}
                  {calendarTaggedUsers.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {calendarTaggedUsers.map(handle => (
                        <span
                          key={handle}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-mono font-semibold shadow-2xs animate-in zoom-in-95 duration-100"
                        >
                          <span className="text-rose-500">@</span>
                          <span>{handle}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCalendarTag(handle)}
                            className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition-colors cursor-pointer"
                            title={`Remove @${handle}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">No people tagged yet. Type a username above to tag.</p>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Direct Upload Photo/Video or Link Studio (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Professional Media Studio Box */}
              <div className="space-y-3 p-4 bg-[#F8FAFC] border border-[#EAECF0] rounded-2xl">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-[#101828] flex items-center gap-1.5 text-xs">
                    {isVideoMedia(mediaUrl) ? (
                      <Video className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-emerald-600" />
                    )}
                    <span>Media &amp; Creative Asset</span>
                  </label>
                  {mediaUrl && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isVideoMedia(mediaUrl)
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {isVideoMedia(mediaUrl) ? '🎬 Video (MP4)' : '🖼️ Image (HD)'}
                    </span>
                  )}
                </div>

                {/* 1. Media Link Preset Dropdown */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#344054] flex items-center gap-1">
                    <Link className="w-3.5 h-3.5 text-[#1336E8]" />
                    <span>Select Media Link from Dropdown:</span>
                  </label>
                  <select
                    value={selectedMediaPreset}
                    onChange={e => {
                      const val = e.target.value;
                      setSelectedMediaPreset(val);
                      if (val === 'custom') {
                        // User will enter custom URL
                      } else if (val === 'custom_uploaded') {
                        // Keeps uploaded URL
                      } else {
                        // Look up preset
                        for (const group of CALENDAR_MEDIA_PRESETS) {
                          const found = group.items.find(item => item.id === val);
                          if (found) {
                            setMediaUrl(found.url);
                            setUploadSuccess(null);
                            break;
                          }
                        }
                      }
                    }}
                    className="w-full h-10 px-3 bg-white border border-[#D0D5DD] rounded-xl text-xs font-semibold text-[#101828] focus:ring-2 focus:ring-[#1336E8] focus:outline-none"
                  >
                    <option value="custom">🔗 Enter Custom Direct Link / URL...</option>
                    {uploadedFileName && (
                      <option value="custom_uploaded">
                        ⭐ Uploaded File: {uploadedFileName} (Ready for Sheets)
                      </option>
                    )}
                    {CALENDAR_MEDIA_PRESETS.map(group => (
                      <optgroup key={group.category} label={group.category}>
                        {group.items.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* 2. Direct File Upload Dropzone / Button */}
                <div>
                  <input
                    ref={scheduleFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                    className="hidden"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        handleDirectUpload(e.target.files[0]);
                      }
                    }}
                  />

                  <div
                    onClick={() => scheduleFileInputRef.current?.click()}
                    onDragOver={e => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleDirectUpload(e.dataTransfer.files[0]);
                      }
                    }}
                    className={`border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition-all ${
                      isUploadingMedia
                        ? 'border-[#1336E8] bg-[#EFF8FF]'
                        : 'border-[#D0D5DD] bg-white hover:border-[#1336E8] hover:bg-[#F9FAFB]'
                    }`}
                  >
                    {isUploadingMedia ? (
                      <div className="flex items-center justify-center gap-2 py-1">
                        <Loader2 className="w-5 h-5 text-[#1336E8] animate-spin" />
                        <span className="text-xs font-semibold text-[#101828]">
                          Uploading &amp; converting to persistent link for Google Sheets...
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 text-left">
                          <div className="w-9 h-9 rounded-xl bg-[#EFF8FF] text-[#1336E8] flex items-center justify-center shrink-0">
                            <UploadCloud className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[#101828]">
                              Direct Image &amp; Video Upload
                            </p>
                            <p className="text-[10px] text-[#667085]">
                              Click or drag MP4, WebM, MOV or PNG, JPG, WebP (up to 100MB)
                            </p>
                          </div>
                        </div>
                        <span className="px-3 py-1.5 bg-[#1336E8] text-white font-semibold text-xs rounded-lg shadow-xs hover:bg-[#0E27B3] transition-colors whitespace-nowrap">
                          Browse File
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {uploadError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {uploadSuccess && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <div className="flex-1">
                      <span className="font-semibold">{uploadSuccess}</span>
                      <p className="text-[10px] text-emerald-700">
                        Link converted and saved for Google Sheets synchronization.
                      </p>
                    </div>
                  </div>
                )}

                {/* 3. Direct Link URL Input */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-[#344054]">
                      Direct Media Link / Active URL
                    </label>
                    {mediaUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setMediaUrl('');
                          setSelectedMediaPreset('custom');
                          setUploadSuccess(null);
                        }}
                        className="text-[10px] text-rose-600 hover:underline font-semibold"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={e => {
                      setMediaUrl(e.target.value);
                      setSelectedMediaPreset('custom');
                      setUploadSuccess(null);
                    }}
                    placeholder="https://... or /uploads/video.mp4"
                    className="w-full h-10 px-3 bg-white border border-[#D0D5DD] rounded-xl text-xs font-mono text-[#101828] focus:ring-2 focus:ring-[#1336E8] focus:outline-none"
                  />
                </div>

                {/* 4. Live Interactive Preview Card */}
                {mediaUrl && (
                  <div className="pt-2 border-t border-[#EAECF0] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#344054] flex items-center gap-1.5">
                        {isVideoMedia(mediaUrl) ? (
                          <Video className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                        <span>Live Preview (Click to watch / enlarge)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setLightboxUrl(mediaUrl);
                          setLightboxType(isVideoMedia(mediaUrl) ? 'video' : 'image');
                          setIsLightboxOpen(true);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1336E8] hover:underline"
                      >
                        <Maximize2 className="w-3 h-3" />
                        <span>{isVideoMedia(mediaUrl) ? 'Watch in Video Player' : 'View Full Image'}</span>
                      </button>
                    </div>

                    <div className="relative w-full rounded-xl overflow-hidden border border-[#EAECF0] bg-slate-950 flex items-center justify-center p-1 shadow-inner">
                      {isVideoMedia(mediaUrl) ? (
                        <video
                          src={mediaUrl}
                          controls
                          playsInline
                          className="w-full max-h-56 object-contain bg-black rounded-lg"
                        >
                          Your browser does not support HTML5 video.
                        </video>
                      ) : (
                        <img
                          src={mediaUrl}
                          alt="Preview"
                          className="w-full max-h-56 object-contain bg-slate-900 rounded-lg cursor-pointer"
                          onClick={() => {
                            setLightboxUrl(mediaUrl);
                            setLightboxType('image');
                            setIsLightboxOpen(true);
                          }}
                          onError={e => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-[#EAECF0]">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2.5 border border-[#D0D5DD] hover:bg-[#F2F4F7] rounded-xl text-xs font-semibold text-[#344054] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#1336E8] hover:bg-[#0E27B3] text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-2 transition-all"
                >
                  <CalendarIcon className="w-4 h-4" />
                  <span>Schedule for {selectedDateStr} at {scheduleTime}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECT & EDIT EXISTING POST MODAL */}
      {inspectingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-5xl w-full p-6 sm:p-8 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-[#EAECF0] pb-4">
              <div className="flex-1 mr-4">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    inspectingPost.publishingStatus === 'published' ? 'bg-[#ECFDF3] text-[#027A48]' :
                    inspectingPost.publishingStatus === 'publishing' ? 'bg-[#FEF0C7] text-[#B54708]' :
                    inspectingPost.publishingStatus === 'failed' ? 'bg-[#FEF3F2] text-[#B42318]' :
                    'bg-[#D1E9FF] text-[#175CD3]'
                  }`}>
                    {inspectingPost.publishingStatus === 'published' ? 'Live Published' : inspectingPost.publishingStatus}
                  </span>
                  <span className="text-xs font-mono text-[#667085] bg-slate-100 px-2 py-0.5 rounded-md">
                    {(inspectingPost.internalTags && inspectingPost.internalTags[0]) || `POST-${inspectingPost.id}`}
                  </span>
                </div>
                {isEditing ? (
                  <div className="mt-2 space-y-1">
                    <label className="text-[11px] font-semibold text-[#344054]">Post Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-1.5 border border-[#D0D5DD] rounded-xl text-sm font-bold text-[#101828] focus:ring-2 focus:ring-[#1336E8]/20 focus:outline-none"
                    />
                  </div>
                ) : (
                  <h3 className="text-lg font-bold text-[#101828] mt-1">{inspectingPost.title}</h3>
                )}
              </div>
              <button
                onClick={() => {
                  setInspectingPost(null);
                  setIsEditing(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#344054]">Schedule Date</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D0D5DD] rounded-xl text-xs text-[#101828] font-mono focus:ring-2 focus:ring-[#1336E8]/20 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#344054]">Schedule Time (IST)</label>
                    <input
                      type="time"
                      value={editTime}
                      onChange={(e) => setEditTime(e.target.value)}
                      className="w-full px-3 py-2 border border-[#D0D5DD] rounded-xl text-xs text-[#101828] font-mono focus:ring-2 focus:ring-[#1336E8]/20 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#344054]">Master Caption / Content</label>
                  <textarea
                    rows={4}
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value)}
                    className="w-full p-3 border border-[#D0D5DD] rounded-xl text-xs text-[#344054] leading-relaxed focus:ring-2 focus:ring-[#1336E8]/20 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Media Preview & Player (5 Cols) */}
                <div className="lg:col-span-5 space-y-4">
                  {inspectingPost.media?.[0]?.fileUrl ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#344054] uppercase tracking-wider flex items-center gap-1.5">
                          {isVideoMedia(inspectingPost.media[0].fileUrl) ? (
                            <Video className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-emerald-600" />
                          )}
                          <span>{isVideoMedia(inspectingPost.media[0].fileUrl) ? 'Attached Video Asset' : 'Attached Photo Asset'}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setLightboxUrl(inspectingPost.media[0].fileUrl);
                            setLightboxType(isVideoMedia(inspectingPost.media[0].fileUrl) ? 'video' : 'image');
                            setIsLightboxOpen(true);
                          }}
                          className="text-[11px] font-semibold text-[#1336E8] hover:underline flex items-center gap-1"
                        >
                          <Maximize2 className="w-3 h-3" />
                          <span>{isVideoMedia(inspectingPost.media[0].fileUrl) ? 'Watch Fullscreen' : 'Enlarge Photo'}</span>
                        </button>
                      </div>

                      <div className="rounded-2xl overflow-hidden border border-[#EAECF0] bg-black shadow-lg flex items-center justify-center p-1">
                        {isVideoMedia(inspectingPost.media[0].fileUrl) ? (
                          <video
                            src={inspectingPost.media[0].fileUrl}
                            controls
                            playsInline
                            className="w-full max-h-[380px] object-contain bg-black rounded-xl"
                          >
                            Your browser does not support HTML5 video.
                          </video>
                        ) : (
                          <img
                            src={inspectingPost.media[0].fileUrl}
                            alt={inspectingPost.title}
                            className="w-full max-h-[380px] object-cover bg-slate-900 rounded-xl cursor-pointer"
                            onClick={() => {
                              setLightboxUrl(inspectingPost.media[0].fileUrl);
                              setLightboxType('image');
                              setIsLightboxOpen(true);
                            }}
                            onError={e => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 text-xs">
                      No media asset attached
                    </div>
                  )}

                  {/* Brand & Schedule Details Card */}
                  <div className="p-4 bg-[#F8FAFC] border border-[#EAECF0] rounded-2xl space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#667085]">Brand Profile:</span>
                      <span className="font-bold text-[#101828]">{inspectingPost.brandName}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-[#EAECF0] pt-2">
                      <span className="text-[#667085]">Scheduled At (IST):</span>
                      <span className="font-mono font-semibold text-[#101828]">
                        {inspectingPost.scheduledAt ? formatISTDateTime(inspectingPost.scheduledAt) : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Title, Caption, Hashtags & Delivery Matrix (7 Cols) */}
                <div className="lg:col-span-7 space-y-4">
                  <div>
                    <span className="text-xs font-semibold text-[#344054] block mb-1">Master Caption / Content:</span>
                    <div className="p-4 bg-[#F8FAFC] border border-[#EAECF0] rounded-xl text-xs text-[#101828] leading-relaxed">
                      {inspectingPost.masterCaption}
                    </div>
                  </div>

                  {inspectingPost.hashtags && (
                    <div className="text-xs font-mono text-[#1336E8] bg-blue-50/60 p-2.5 rounded-xl border border-blue-100">
                      {Array.isArray(inspectingPost.hashtags) ? inspectingPost.hashtags.join(' ') : inspectingPost.hashtags}
                    </div>
                  )}

                  {/* Tagged Instagram Accounts Display */}
                  {inspectingPost.taggedUsers && inspectingPost.taggedUsers.length > 0 && (
                    <div className="p-3 bg-gradient-to-r from-amber-50/70 via-rose-50/50 to-purple-50/60 border border-amber-200/80 rounded-xl space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <UserPlus className="w-3.5 h-3.5 text-rose-500" />
                        <span>Tagged Instagram Accounts ({inspectingPost.taggedUsers.length}):</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {inspectingPost.taggedUsers.map((handle: string) => (
                          <span
                            key={handle}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white border border-rose-200 text-xs font-mono font-semibold text-rose-700 shadow-2xs"
                          >
                            <span>@</span>
                            <span>{handle}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Multi-Platform Delivery Matrix & Links */}
                  <div className="space-y-2 pt-2 border-t border-[#EAECF0]">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#344054] block">
                      Platform Delivery Matrix &amp; Live Post Links:
                    </span>
                    <div className="space-y-2.5">
                      {inspectingPost.platforms?.map((plat, idx) => {
                        const urls = plat.publishedUrl ? plat.publishedUrl.split(' | ') : [];
                        return (
                          <div key={idx} className="p-3 rounded-xl bg-[#F8FAFC] border border-[#EAECF0] space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-[#EFF8FF] text-[#175CD3] font-semibold text-xs capitalize">
                                  {plat.platform}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                  plat.publishingStatus === 'Posted' ? 'bg-[#ECFDF3] text-[#027A48]' :
                                  plat.publishingStatus === 'NeedsVerification' ? 'bg-[#FEF0C7] text-[#B54708]' :
                                  plat.publishingStatus === 'Failed' ? 'bg-[#FEF3F2] text-[#B42318]' :
                                  'bg-[#D1E9FF] text-[#175CD3]'
                                }`}>
                                  {plat.publishingStatus}
                                </span>
                              </div>
                              {plat.platformPostId && (
                                <span className="text-[10px] font-mono text-[#667085]">
                                  ID: {plat.platformPostId}
                                </span>
                              )}
                            </div>

                            {urls.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                {urls.map((u, uIdx) => {
                                  const isStory = u.includes('/stories/');
                                  const isReel = u.includes('/reel') || u.includes('/watch');
                                  const label = isStory ? 'Story' : isReel ? 'Reel / Video' : 'Feed Post';
                                  const isFb = plat.platform.toLowerCase() === 'facebook';
                                  const isIg = plat.platform.toLowerCase() === 'instagram';
                                  return (
                                    <a
                                      key={uIdx}
                                      href={u}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border shadow-xs transition-all ${
                                        isFb
                                          ? 'bg-blue-50/80 hover:bg-blue-100 text-blue-700 border-blue-200'
                                          : isIg
                                          ? 'bg-pink-50/80 hover:bg-pink-100 text-pink-700 border-pink-200'
                                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                                      }`}
                                    >
                                      {isFb && <Facebook className="w-3.5 h-3.5 text-blue-600" />}
                                      {isIg && <Instagram className="w-3.5 h-3.5 text-pink-600" />}
                                      <span>{plat.platform ? `${plat.platform} ${label}` : label}</span>
                                      <ExternalLink className="w-3 h-3 opacity-70" />
                                    </a>
                                  );
                                })}
                              </div>
                            )}

                            {plat.errorMessage && (
                              <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-700 leading-snug">
                                <span className="font-bold">Error: </span>{plat.errorMessage}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Overall Error Callout */}
                  {(inspectingPost as any).errorMessage && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                      <span className="font-bold block">Meta &amp; n8n Verification Note:</span>
                      <p className="text-[11px] leading-relaxed font-mono">{(inspectingPost as any).errorMessage}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[#EAECF0]">
              <div>
                {isEditing ? (
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold"
                  >
                    Cancel Editing
                  </button>
                ) : (
                  onDeletePost && (
                    <button
                      type="button"
                      onClick={() => {
                        onDeletePost(inspectingPost.id);
                        setInspectingPost(null);
                        showNotification('Post removed from calendar queue');
                      }}
                      className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )
                )}
              </div>

              <div className="flex items-center gap-2">
                {isEditing ? (
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="px-5 py-2 bg-[#1336E8] hover:bg-[#0E27B3] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-[#1336E8]/20 transition-all"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => startEditing(inspectingPost)}
                      className="px-4 py-2 border border-[#D0D5DD] hover:bg-[#F2F4F7] text-[#344054] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#1336E8]" />
                      <span>Edit Post</span>
                    </button>
                    {onPublishNow && (
                      <button
                        type="button"
                        onClick={() => {
                          onPublishNow(inspectingPost.id);
                          setInspectingPost(null);
                          showNotification('Dispatched to n8n publish engine!');
                        }}
                        className="px-4 py-2 bg-[#12B76A] hover:bg-[#027A48] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Publish Now</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Video Player Modal */}
      <MediaViewerModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        mediaUrl={lightboxUrl}
        mediaType={lightboxType}
        title={postTitle}
      />
    </div>
  );
};
