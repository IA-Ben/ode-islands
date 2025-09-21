"use client";

import React, { useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { CardData } from '@/@typings';
import { useDeviceCapabilities, useShouldLoadFeature } from '@/hooks/useDeviceCapabilities';
import { prefetchOnIntent, prefetchOnIntersection, loadPlayCanvas } from '@/utils/lazyModules';

// Loading component for PlayCanvas viewer
const PlayCanvasLoadingFallback = () => (
  <div className="w-full h-full bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p className="text-white/80 text-sm">Loading 3D Experience...</p>
      <p className="text-white/60 text-xs mt-1">Initializing WebGL</p>
    </div>
  </div>
);

// Dynamic import of the actual PlayCanvas viewer with SSR disabled
const LazyPlayCanvasViewer = dynamic(
  () => import('./PlayCanvasViewer'),
  {
    ssr: false,
    loading: PlayCanvasLoadingFallback,
  }
);

interface DynamicPlayCanvasViewerProps {
  card: CardData;
  onAssetLoad?: (progress: number) => void;
  className?: string;
}

const DynamicPlayCanvasViewer: React.FC<DynamicPlayCanvasViewerProps> = ({
  card,
  onAssetLoad,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { shouldLoad, reason } = useShouldLoadFeature('playcanvas');
  const { canUse3D, isLoading, shouldRespectDataSaver, hasSlowConnection } = useDeviceCapabilities();

  // Prefetch PlayCanvas on user intent (hover/focus/viewport)
  useEffect(() => {
    if (!shouldLoad || !containerRef.current) return;

    const element = containerRef.current;
    let cleanupFunctions: (() => void)[] = [];

    // Add intent-based prefetching
    const prefetchOptions = {
      respectDataSaver: shouldRespectDataSaver,
      connectionThreshold: hasSlowConnection ? 'slow' as const : 'fast' as const,
    };

    // Prefetch on hover/focus
    const cleanupIntent = prefetchOnIntent(element, loadPlayCanvas, prefetchOptions);
    if (cleanupIntent) cleanupFunctions.push(cleanupIntent);

    // Prefetch when entering viewport
    const cleanupIntersection = prefetchOnIntersection(element, loadPlayCanvas, prefetchOptions);
    if (cleanupIntersection) cleanupFunctions.push(cleanupIntersection);

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [shouldLoad, shouldRespectDataSaver, hasSlowConnection]);

  // Show different states based on capabilities
  if (isLoading) {
    return (
      <div ref={containerRef} className={`w-full h-full ${className}`}>
        <div className="w-full h-full bg-slate-800/50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="animate-pulse h-4 w-4 bg-blue-500 rounded-full mx-auto mb-2"></div>
            <p className="text-white/60 text-xs">Checking device capabilities...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!shouldLoad) {
    return (
      <div ref={containerRef} className={`w-full h-full ${className}`}>
        <div className="w-full h-full bg-gradient-to-br from-red-900/20 to-orange-900/20 rounded-lg flex items-center justify-center backdrop-blur-sm border border-red-500/20">
          <div className="text-center p-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-white/90 font-semibold mb-2">3D Content Unavailable</h3>
            <p className="text-white/60 text-sm mb-3">{reason}</p>
            {!canUse3D && (
              <p className="text-white/50 text-xs">
                This device doesn't support WebGL, which is required for 3D experiences.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Capability check passed, render the dynamic component
  return (
    <div ref={containerRef} className={`w-full h-full ${className}`}>
      <LazyPlayCanvasViewer
        card={card}
        onAssetLoad={onAssetLoad}
      />
    </div>
  );
};

export default DynamicPlayCanvasViewer;