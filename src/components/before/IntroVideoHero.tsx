"use client";

import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, X } from "lucide-react";

interface IntroVideoHeroProps {
  videoUrl: string;
  posterImage: string;
  loop?: boolean;
  muteDefault?: boolean;
  captionsVTT?: string;
  title: string;
  subTitle?: string;
  ctaPrimary: {
    label: string;
    deeplink: string;
  };
  ctaSecondary?: {
    label: string;
    deeplink: string;
  };
  fallbackImage?: string;
  reduceMotionFallback?: "posterImage" | "stillFrame";
  onDismiss: () => void;
  onNavigate: (deeplink: string) => void;
}

export default function IntroVideoHero({
  videoUrl,
  posterImage,
  loop = true,
  muteDefault = true,
  captionsVTT,
  title,
  subTitle,
  ctaPrimary,
  ctaSecondary,
  fallbackImage,
  reduceMotionFallback = "posterImage",
  onDismiss,
  onNavigate
}: IntroVideoHeroProps) {
  const [isMuted, setIsMuted] = useState(muteDefault);
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    // Fade in animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300); // Wait for fade out
  };

  const handlePrimaryClick = () => {
    handleDismiss();
    setTimeout(() => onNavigate(ctaPrimary.deeplink), 300);
  };

  const handleSecondaryClick = () => {
    if (ctaSecondary) {
      handleDismiss();
      setTimeout(() => onNavigate(ctaSecondary.deeplink), 300);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[99] bg-black transition-opacity duration-500 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Video Background or Static Image for Reduced Motion */}
      <div className="absolute inset-0">
        {prefersReducedMotion ? (
          // Show static image for reduced motion
          <img
            src={reduceMotionFallback === "posterImage" ? posterImage : (fallbackImage || posterImage)}
            alt="Intro background"
            className="w-full h-full object-cover"
          />
        ) : (
          // Show video for normal motion
          <video
            ref={videoRef}
            src={videoUrl}
            poster={posterImage}
            autoPlay
            loop={loop}
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover"
          >
            {captionsVTT && (
              <track
                kind="captions"
                src={captionsVTT}
                srcLang="en"
                label="English"
                default
              />
            )}
          </video>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      </div>

      {/* Close Button */}
      <button
        onClick={handleDismiss}
        className="absolute top-6 right-6 z-10 p-3 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm border border-white/20 text-white transition-all duration-300"
        aria-label="Close intro"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Mute Toggle */}
      <button
        onClick={toggleMute}
        className="absolute top-6 right-24 z-10 p-3 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm border border-white/20 text-white transition-all duration-300"
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
      </button>

      {/* Content Overlay */}
      <div className="absolute inset-0 flex items-end justify-center pb-16 md:pb-24">
        <div
          className={`max-w-4xl w-full px-6 text-center transition-all duration-700 delay-300 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Logo */}
          <div className="mb-6">
            <div className="inline-block w-16 h-16 rounded-full bg-gradient-to-br from-fuchsia-500 to-fuchsia-600 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">OI</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-2xl">
            {title}
          </h1>

          {/* Subtitle */}
          {subTitle && (
            <p className="text-xl md:text-2xl text-white/90 mb-8 drop-shadow-xl">
              {subTitle}
            </p>
          )}

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Primary CTA */}
            <button
              onClick={handlePrimaryClick}
              className="px-8 py-4 rounded-full bg-gradient-to-r from-fuchsia-600 to-fuchsia-500 text-white font-bold text-lg hover:from-fuchsia-500 hover:to-fuchsia-400 transition-all duration-300 shadow-2xl shadow-fuchsia-500/50 hover:shadow-fuchsia-500/70 hover:scale-105 w-full sm:w-auto"
            >
              {ctaPrimary.label}
            </button>

            {/* Secondary CTA */}
            {ctaSecondary && (
              <button
                onClick={handleSecondaryClick}
                className="px-8 py-4 rounded-full bg-white/10 backdrop-blur-sm border-2 border-white/30 text-white font-bold text-lg hover:bg-white/20 transition-all duration-300 w-full sm:w-auto"
              >
                {ctaSecondary.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
