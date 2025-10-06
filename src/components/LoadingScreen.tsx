"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface LoadingScreenProps {
  logoSrc?: string;
  brandText?: string;
  fadeOut?: boolean;
  onFadeComplete?: () => void;
}

export default function LoadingScreen({ 
  logoSrc, 
  brandText = "Ode Islands",
  fadeOut = false,
  onFadeComplete 
}: LoadingScreenProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (fadeOut && onFadeComplete) {
      const timeout = setTimeout(onFadeComplete, 500);
      return () => clearTimeout(timeout);
    }
  }, [fadeOut, onFadeComplete]);

  return (
    <div 
      className={`fixed inset-0 z-50 bg-gradient-to-br from-slate-950 via-fuchsia-950/20 to-slate-950 flex items-center justify-center transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="text-center space-y-8">
        {/* Logo/Image Container */}
        <div className={`transition-all duration-700 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          {logoSrc ? (
            <div className="relative w-32 h-32 mx-auto">
              <Image
                src={logoSrc}
                alt={brandText}
                fill
                className="object-contain"
                priority
              />
            </div>
          ) : (
            <div className="w-32 h-32 mx-auto rounded-3xl bg-gradient-to-br from-fuchsia-500 to-rose-500 flex items-center justify-center">
              <div className="text-4xl font-bold text-white">OI</div>
            </div>
          )}
        </div>

        {/* Brand Text */}
        <div className={`transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <h1 className="text-2xl font-bold text-white tracking-wide">
            {brandText}
          </h1>
        </div>

        {/* Animated Loading Indicator */}
        <div className={`transition-all duration-700 delay-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-fuchsia-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-fuchsia-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-fuchsia-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
        </div>

        {/* Optional Progress Spinner */}
        <div className={`transition-all duration-700 delay-400 ${mounted ? 'opacity-60' : 'opacity-0'}`}>
          <svg 
            className="w-8 h-8 mx-auto text-fuchsia-400 animate-spin" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
