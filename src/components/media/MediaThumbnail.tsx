import React, { useState } from 'react';
import { Play, Video, Image as ImageIcon, Eye } from 'lucide-react';
import { MediaViewerModal } from './MediaViewerModal';

interface MediaThumbnailProps {
  src?: string | null;
  alt?: string;
  mediaType?: 'image' | 'video' | 'document';
  className?: string;
  containerClassName?: string;
  showPlayBadge?: boolean;
  allowLightbox?: boolean;
  onClick?: () => void;
}

export const MediaThumbnail: React.FC<MediaThumbnailProps> = ({
  src,
  alt = 'Media preview',
  mediaType,
  className = 'w-full h-full object-cover',
  containerClassName = 'relative w-12 h-12 rounded-lg overflow-hidden bg-slate-800 border border-slate-700/60 flex-shrink-0 cursor-pointer group',
  showPlayBadge = true,
  allowLightbox = true,
  onClick,
}) => {
  const [hasError, setHasError] = useState(false);
  const [showModal, setShowModal] = useState(false);

  if (!src) {
    return (
      <div className={`${containerClassName} flex items-center justify-center bg-slate-800/80 text-slate-500`}>
        <ImageIcon className="w-5 h-5 opacity-40" />
      </div>
    );
  }

  const isVideo =
    mediaType === 'video' ||
    /\.(mp4|webm|mov|mkv|avi)(\?.*)?$/i.test(src) ||
    src.includes('/uploads/') && /\.(mp4|webm|mov)/i.test(src) ||
    /(?:youtube\.com|youtu\.be)/i.test(src);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    } else if (allowLightbox) {
      setShowModal(true);
    }
  };

  return (
    <>
      <div
        className={`${containerClassName}`}
        onClick={handleClick}
        title={isVideo ? 'Click to play video' : 'Click to preview image'}
      >
        {hasError ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-slate-400 p-1">
            {isVideo ? <Video className="w-5 h-5 text-indigo-400" /> : <ImageIcon className="w-5 h-5 text-slate-400" />}
            <span className="text-[9px] font-medium text-slate-500 mt-0.5 uppercase tracking-wider">
              {isVideo ? 'Video' : 'Media'}
            </span>
          </div>
        ) : isVideo ? (
          <div className="w-full h-full relative flex items-center justify-center bg-slate-900">
            {/* If video element can render first frame */}
            <video
              src={src}
              className={`${className} pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity`}
              muted
              preload="metadata"
              onError={() => setHasError(true)}
            />
            {/* Play badge overlay */}
            {showPlayBadge && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
                <div className="w-6 h-6 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-indigo-500 transition-transform">
                  <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />
                </div>
              </div>
            )}
            <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/75 text-[9px] font-bold text-white tracking-wider uppercase backdrop-blur-sm">
              MP4
            </span>
          </div>
        ) : (
          <div className="w-full h-full relative">
            <img
              src={src}
              alt={alt}
              onError={() => setHasError(true)}
              className={`${className} group-hover:scale-105 transition-transform duration-200`}
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
              <Eye className="w-4 h-4 text-white drop-shadow" />
            </div>
          </div>
        )}
      </div>

      {allowLightbox && (
        <MediaViewerModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          mediaUrl={src}
          mediaType={isVideo ? 'video' : 'image'}
          title={alt}
        />
      )}
    </>
  );
};
