import React, { useEffect } from 'react';
import { X, ExternalLink, Copy, Check, Video, Image as ImageIcon, Volume2 } from 'lucide-react';

interface MediaViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType?: 'image' | 'video';
  title?: string;
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  isOpen,
  onClose,
  mediaUrl,
  mediaType,
  title,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  useEffect(() => {
    setHasError(false);
    setCopied(false);
  }, [mediaUrl]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mediaUrl) return null;

  // Determine if it's a video
  const isDirectVideo =
    mediaType === 'video' ||
    /\.(mp4|webm|mov|mkv|avi)(\?.*)?$/i.test(mediaUrl) ||
    mediaUrl.includes('/uploads/') && /\.(mp4|webm|mov)/i.test(mediaUrl);

  const isYouTube = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)/i.test(mediaUrl);

  const getYouTubeEmbedUrl = (url: string) => {
    try {
      if (url.includes('youtu.be/')) {
        const id = url.split('youtu.be/')[1].split('?')[0];
        return `https://www.youtube.com/embed/${id}?autoplay=1`;
      }
      if (url.includes('watch?v=')) {
        const id = new URL(url).searchParams.get('v');
        return `https://www.youtube.com/embed/${id}?autoplay=1`;
      }
      if (url.includes('/shorts/')) {
        const id = url.split('/shorts/')[1].split('?')[0];
        return `https://www.youtube.com/embed/${id}?autoplay=1`;
      }
      return url;
    } catch {
      return url;
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(mediaUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            {isDirectVideo || isYouTube ? (
              <span className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                <Video className="w-5 h-5" />
              </span>
            ) : (
              <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                <ImageIcon className="w-5 h-5" />
              </span>
            )}
            <div>
              <h3 className="text-base font-semibold text-white">
                {title || (isDirectVideo || isYouTube ? 'Video Player' : 'Image Viewer')}
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-md">{mediaUrl}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              title="Copy Media URL"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <a
              href={mediaUrl}
              target="_blank"
              rel="noreferrer"
              title="Open full size in new tab"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media Content */}
        <div className="flex-1 flex items-center justify-center bg-black/60 min-h-[350px] max-h-[75vh] p-4 overflow-hidden relative">
          {hasError ? (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center mb-3 text-rose-400">
                <ImageIcon className="w-8 h-8" />
              </div>
              <p className="text-sm font-medium text-slate-200">Unable to load media preview</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                The file URL may be inaccessible, blocked by CORS, or expired.
              </p>
              <a
                href={mediaUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Direct Link
              </a>
            </div>
          ) : isYouTube ? (
            <div className="w-full aspect-video max-w-3xl rounded-lg overflow-hidden shadow-lg border border-slate-800">
              <iframe
                src={getYouTubeEmbedUrl(mediaUrl)}
                title="YouTube Video"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : isDirectVideo ? (
            <video
              src={mediaUrl}
              controls
              autoPlay
              playsInline
              onError={() => setHasError(true)}
              className="max-h-[70vh] max-w-full rounded-lg shadow-2xl object-contain outline-none"
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <img
              src={mediaUrl}
              alt={title || 'Media preview'}
              onError={() => setHasError(true)}
              className="max-h-[70vh] max-w-full rounded-lg shadow-2xl object-contain"
            />
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-6 py-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Interactive Media Lightbox</span>
          </div>
          <span className="text-slate-500">Press ESC to close</span>
        </div>
      </div>
    </div>
  );
};
