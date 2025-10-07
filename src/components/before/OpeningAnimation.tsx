"use client";

import { useEffect, useState } from "react";

interface OpeningAnimationProps {
  type: "video" | "lottie" | "image-sequence";
  assetUrl: string;
  durationCapSec?: number;
  skippable?: boolean;
  caption?: string;
  onComplete: () => void;
}

export default function OpeningAnimation({
  type,
  assetUrl,
  durationCapSec,
  skippable = true,
  caption,
  onComplete
}: OpeningAnimationProps) {
  const [progress, setProgress] = useState(0);
  const [showSkip, setShowSkip] = useState(false);

  useEffect(() => {
    // Show skip button after 2 seconds if skippable
    if (skippable) {
      const timer = setTimeout(() => setShowSkip(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [skippable]);

  useEffect(() => {
    if (type === "video") return; // Video handles its own progress
    
    // For image-sequence or lottie, simulate progress
    const duration = (durationCapSec || 5) * 1000;
    const interval = 50;
    const steps = duration / interval;
    let current = 0;

    const timer = setInterval(() => {
      current += 1;
      setProgress((current / steps) * 100);
      
      if (current >= steps) {
        clearInterval(timer);
        onComplete();
      }
    }, interval);

    return () => clearInterval(timer);
  }, [type, durationCapSec, onComplete]);

  const handleSkip = () => {
    if (skippable) {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center">
      {/* Animation Content */}
      {type === "video" && (
        <video
          src={assetUrl}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
          onEnded={onComplete}
          onTimeUpdate={(e) => {
            const video = e.currentTarget;
            setProgress((video.currentTime / video.duration) * 100);
          }}
        />
      )}

      {type === "image-sequence" && (
        <div className="relative w-full h-full flex items-center justify-center">
          <img
            src={assetUrl}
            alt="Opening"
            className="max-w-full max-h-full object-contain animate-pulse"
          />
        </div>
      )}

      {type === "lottie" && (
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Placeholder for Lottie - would use @lottiefiles/react-lottie-player */}
          <div className="text-white text-2xl">Loading animation...</div>
        </div>
      )}

      {/* Caption */}
      {caption && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 max-w-2xl px-6">
          <div className="bg-black/80 backdrop-blur-sm rounded-lg px-6 py-3 border border-white/20">
            <p className="text-white text-center text-sm">{caption}</p>
          </div>
        </div>
      )}

      {/* Skip Button */}
      {skippable && showSkip && (
        <button
          onClick={handleSkip}
          className="absolute top-8 right-8 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white font-medium transition-all duration-300"
        >
          Skip
        </button>
      )}

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
        <div
          className="h-full bg-fuchsia-500 transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
