"use client";

import { useState, useEffect } from "react";

interface DiscoverCollageHeaderProps {
  image: string;
  alt: string;
  tagline?: string;
  overlayScrim?: "light" | "dark" | "none";
}

export default function DiscoverCollageHeader({
  image,
  alt,
  tagline,
  overlayScrim = "dark"
}: DiscoverCollageHeaderProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const scrimClasses = {
    light: "bg-gradient-to-b from-transparent via-white/30 to-slate-900",
    dark: "bg-gradient-to-b from-transparent via-black/50 to-slate-900",
    none: ""
  };

  return (
    <div className="relative w-full h-[60vh] md:h-[70vh] overflow-hidden">
      {/* Collage Image */}
      <div
        className={`absolute inset-0 transition-all duration-1000 ${
          isVisible ? "opacity-100 scale-100" : "opacity-0 scale-105"
        }`}
      >
        <img
          src={image}
          alt={alt}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Overlay Scrim */}
      {overlayScrim !== "none" && (
        <div className={`absolute inset-0 ${scrimClasses[overlayScrim]}`} />
      )}

      {/* Tagline */}
      {tagline && (
        <div className="absolute bottom-0 left-0 right-0 pb-12 px-6">
          <div
            className={`max-w-4xl mx-auto text-center transition-all duration-1000 delay-300 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white drop-shadow-2xl">
              {tagline}
            </h2>
          </div>
        </div>
      )}

      {/* Scroll Indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <div className="flex flex-col items-center gap-2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/40 flex items-start justify-center p-2">
            <div className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
