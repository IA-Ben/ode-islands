"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

export interface SlideshowMedia {
  type: "image" | "video";
  url: string;
  alt?: string;
  duration?: number; // Duration in ms (for images) or auto-detect for videos
}

interface SlideshowCardProps {
  media: SlideshowMedia[];
  title: string;
  subtitle?: string;
  description?: string;
  autoplay?: boolean;
  interval?: number; // Default interval for images in ms
  onAction?: (action: string) => void;
}

export function SlideshowCard({
  media,
  title,
  subtitle,
  description,
  autoplay = true,
  interval = 5000,
  onAction,
}: SlideshowCardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentMedia = media[currentIndex];
  const isVideo = currentMedia?.type === "video";

  useEffect(() => {
    if (!isPlaying || isVideo) return;

    const duration = currentMedia?.duration || interval;
    timerRef.current = setTimeout(() => {
      goToNext();
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, isPlaying, isVideo, currentMedia, interval]);

  useEffect(() => {
    if (isVideo && videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {
          // Auto-play prevented, user needs to interact
          setIsPlaying(false);
        });
      } else {
        videoRef.current.pause();
      }
    }
  }, [isVideo, isPlaying, currentIndex]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? media.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === media.length - 1 ? 0 : prev + 1));
  };

  const handleVideoEnd = () => {
    goToNext();
  };

  const togglePlayPause = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleClick = () => {
    if (onAction) {
      onAction("view");
    }
  };

  if (!media || media.length === 0) {
    return null;
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 hover:border-fuchsia-500/30 shadow-xl hover:shadow-2xl transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/0 to-fuchsia-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      {/* Media Display */}
      <div className="relative w-full h-64 overflow-hidden bg-slate-950">
        {isVideo ? (
          <video
            ref={videoRef}
            src={currentMedia.url}
            className="w-full h-full object-cover"
            onEnded={handleVideoEnd}
            loop={false}
            muted
            playsInline
          />
        ) : (
          <img
            src={currentMedia.url}
            alt={currentMedia.alt || title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
        
        {/* Navigation Controls */}
        {media.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-900 border border-white/20 hover:border-fuchsia-500/50 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-900 border border-white/20 hover:border-fuchsia-500/50 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </>
        )}
        
        {/* Play/Pause Control */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            togglePlayPause();
          }}
          className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-900 border border-white/20 hover:border-fuchsia-500/50 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-white" />
          ) : (
            <Play className="w-5 h-5 text-white ml-0.5" />
          )}
        </button>
        
        {/* Slide Indicators */}
        {media.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            {media.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? "bg-fuchsia-500 w-6"
                    : "bg-white/40 hover:bg-white/60"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Content */}
      <button
        onClick={handleClick}
        className="relative p-5 space-y-3 text-left w-full"
      >
        {subtitle && (
          <div className="text-xs font-medium text-fuchsia-400 uppercase tracking-wide">
            {subtitle}
          </div>
        )}
        
        <h3 className="text-xl font-bold text-white group-hover:text-fuchsia-300 transition-colors leading-tight">
          {title}
        </h3>
        
        {description && (
          <p className="text-sm text-slate-300 line-clamp-2">
            {description}
          </p>
        )}
      </button>
    </div>
  );
}
