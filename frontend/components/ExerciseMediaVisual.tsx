'use client';

import { useState } from 'react';

interface ExerciseMediaVisualProps {
  name: string;
  videoUrl?: string;
  gifUrl?: string;
  posterUrl?: string;
  biomechanicalCue?: string;
  showCueOverlay?: boolean;
  onExpand?: () => void;
  className?: string;
}

export default function ExerciseMediaVisual({
  name,
  videoUrl,
  gifUrl,
  posterUrl,
  biomechanicalCue,
  showCueOverlay = true,
  onExpand,
  className = '',
}: ExerciseMediaVisualProps) {
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [hasVideoError, setHasVideoError] = useState<boolean>(false);

  const activeMedia = !hasVideoError && videoUrl ? videoUrl : (gifUrl || posterUrl || '');

  return (
    <div
      onClick={onExpand}
      className={`relative w-full aspect-video rounded-xl overflow-hidden bg-[#0a0e17] border border-[#262a34] cursor-pointer group select-none shadow-md ${className}`}
    >
      {/* Skeleton Shimmer Loading Placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-r from-[#181b25] via-[#262a34] to-[#181b25] animate-pulse">
          <span className="material-symbols-outlined text-[32px] text-[#4edea3]/40 animate-bounce">
            fitness_center
          </span>
          <span className="font-metric text-[10px] text-[#86948a] tracking-widest uppercase mt-2">
            Loading Form Guide...
          </span>
        </div>
      )}

      {/* Looping Media Demonstration */}
      {videoUrl && !hasVideoError && videoUrl.endsWith('.mp4') ? (
        <video
          src={videoUrl}
          poster={posterUrl || gifUrl}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          onLoadedData={() => setIsLoaded(true)}
          onError={() => {
            setHasVideoError(true);
            setIsLoaded(false);
          }}
          className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={activeMedia}
          alt={name}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* Top Right Badges */}
      <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5 bg-[#0f131c]/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-white/90 group-hover:border-[#4edea3]/50 transition-all shadow-sm">
        <span className="material-symbols-outlined text-[14px] text-[#4edea3]">zoom_in</span>
        <span className="font-metric text-[10px] uppercase tracking-wider font-semibold">Form & Cue</span>
      </div>

      {/* Live Biomechanical Cue Overlay at Bottom */}
      {showCueOverlay && biomechanicalCue && (
        <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#0a0e17] via-[#0a0e17]/85 to-transparent p-3 pt-6 flex items-start gap-2">
          <span className="material-symbols-outlined text-[#ffb95f] text-[16px] shrink-0 mt-0.5 drop-shadow">
            lightbulb
          </span>
          <p className="font-body text-[12px] text-[#dfe2ef] line-clamp-2 leading-tight drop-shadow-md">
            <strong className="text-[#ffb95f] font-semibold">Jeff Nippard Cue:</strong> &ldquo;{biomechanicalCue}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
