"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { CardData } from '@/@typings';
import { loadHLS, prefetchOnIntersection } from '@/utils/lazyModules';

// Loading component for video player
const PlayerLoadingFallback = () => (
  <div className="w-full h-full bg-black/80 rounded-lg flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/50 mx-auto mb-3"></div>
      <p className="text-white/70 text-sm">Loading video player...</p>
    </div>
  </div>
);

// Dynamic import of the actual Player with SSR disabled
const LazyPlayer = dynamic(
  () => import('./Player'),
  {
    ssr: false,
    loading: PlayerLoadingFallback,
  }
);

interface DynamicPlayerProps {
  card: CardData;
  onVideoEnd?: () => void;
  onVideoStart?: () => void;
  autoPlay?: boolean;
  muted?: boolean;
  immersive?: boolean;
  className?: string;
}

const DynamicPlayer: React.FC<DynamicPlayerProps> = ({
  card,
  onVideoEnd,
  onVideoStart,
  autoPlay = true,
  muted = true,
  immersive = false,
  className = "",
}) => {
  const [shouldLoadHLS, setShouldLoadHLS] = useState(false);
  const [hlsLoaded, setHlsLoaded] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { shouldLoad: shouldLoadVideo, reason: videoLoadReason } = useShouldLoadFeature('hls');
  const { shouldRespectDataSaver, hasSlowConnection } = useDeviceCapabilities();

  // Detect if video source requires HLS
  const requiresHLS = useCallback(() => {
    if (!card.video) return false;
    
    const videoUrl = card.video.url || card.video;
    if (typeof videoUrl !== 'string') return false;
    
    // Check if it's an HLS stream (.m3u8)
    return videoUrl.includes('.m3u8') || videoUrl.includes('hls');
  }, [card.video]);

  // Setup HLS loading with proper capability gating and efficient prefetching
  useEffect(() => {
    if (!requiresHLS() || !shouldLoadVideo) {
      // No HLS required or capabilities don't support it
      return;
    }

    setShouldLoadHLS(true);

    // Add intent-based prefetching for HLS when container enters viewport
    if (containerRef.current) {
      const element = containerRef.current;
      
      // Prefetch HLS when video container enters viewport with capability checks
      const cleanup = prefetchOnIntersection(element, loadHLS, {
        respectDataSaver: shouldRespectDataSaver,
        connectionThreshold: hasSlowConnection ? 'slow' as const : 'fast' as const,
      });
      
      return cleanup;
    }
  }, [requiresHLS, shouldLoadVideo, shouldRespectDataSaver, hasSlowConnection]);

  // Load HLS when actually needed (when video is about to play)
  const loadHLSWhenNeeded = useCallback(async () => {
    if (!requiresHLS() || hlsLoaded || loadingError) return;

    try {
      await loadHLS();
      setHlsLoaded(true);
      console.log('HLS.js loaded for video streaming');
    } catch (error) {
      console.error('Failed to load HLS.js:', error);
      setLoadingError('Failed to load video streaming library');
    }
  }, [requiresHLS, hlsLoaded, loadingError]);

  // Show capability check failed state
  if (!shouldLoadVideo) {
    return (
      <div ref={containerRef} className={`w-full h-full ${className}`}>
        <div className="w-full h-full bg-gradient-to-br from-gray-900/20 to-slate-900/20 rounded-lg flex items-center justify-center border border-gray-500/20">
          <div className="text-center p-4">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-500/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-white/80 font-medium mb-1">Video Unavailable</h3>
            <p className="text-white/50 text-xs">{videoLoadReason}</p>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while HLS is loading
  if (requiresHLS() && shouldLoadHLS && !hlsLoaded && !loadingError) {
    return (
      <div ref={containerRef} className={`w-full h-full ${className}`}>
        <div className="w-full h-full bg-black/80 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
            <p className="text-white/70 text-sm">Loading video streaming...</p>
            <p className="text-white/50 text-xs mt-1">Initializing HLS</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if HLS failed to load
  if (loadingError) {
    return (
      <div ref={containerRef} className={`w-full h-full ${className}`}>
        <div className="w-full h-full bg-gradient-to-br from-red-900/20 to-orange-900/20 rounded-lg flex items-center justify-center border border-red-500/20">
          <div className="text-center p-6">
            <div className="w-12 h-12 mx-auto mb-3 bg-red-500/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-white/90 font-semibold mb-2">Video Unavailable</h3>
            <p className="text-white/60 text-sm">{loadingError}</p>
          </div>
        </div>
      </div>
    );
  }

  // Either no HLS required, or HLS has loaded successfully
  return (
    <div ref={containerRef} className={`w-full h-full ${className}`}>
      <LazyPlayer
        card={card}
        onVideoEnd={onVideoEnd}
        onVideoStart={() => {
          // Load HLS when video actually starts if needed
          if (requiresHLS() && !hlsLoaded) {
            loadHLSWhenNeeded();
          }
          if (onVideoStart) onVideoStart();
        }}
        autoPlay={autoPlay}
        muted={muted}
        immersive={immersive}
      />
    </div>
  );
};

export default DynamicPlayer;