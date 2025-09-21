"use client";

import React, { useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { CardData } from '@/@typings';
import { useDeviceCapabilities, useShouldLoadFeature } from '@/hooks/useDeviceCapabilities';
import { prefetchOnIntent, prefetchOnIntersection, loadARLibraries } from '@/utils/lazyModules';

// Loading component for AR experience
const ARLoadingFallback = () => (
  <div className="w-full h-full bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
    <div className="text-center">
      <div className="animate-pulse rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
      <p className="text-white/80 text-sm">Loading AR Experience...</p>
      <p className="text-white/60 text-xs mt-1">Initializing camera and AR libraries</p>
    </div>
  </div>
);

// Dynamic import of the actual AR orchestrator with SSR disabled
const LazyAROrchestrator = dynamic(
  () => import('./AROrchestrator'),
  {
    ssr: false,
    loading: ARLoadingFallback,
  }
);

interface DynamicAROrchestratorProps {
  ar: NonNullable<CardData['ar']>;
  isOpen: boolean;
  onClose: () => void;
  onVideoStateChange: (playing: boolean) => void;
}

const DynamicAROrchestrator: React.FC<DynamicAROrchestratorProps> = ({
  ar,
  isOpen,
  onClose,
  onVideoStateChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { shouldLoad, reason } = useShouldLoadFeature('ar');
  const { canUseAR, canUseCamera, isLoading, shouldRespectDataSaver, hasSlowConnection } = useDeviceCapabilities();

  // Prefetch AR libraries on user intent when component becomes visible
  useEffect(() => {
    if (!shouldLoad || !containerRef.current || !isOpen) return;

    const element = containerRef.current;
    let cleanupFunctions: (() => void)[] = [];

    // Add intent-based prefetching
    const prefetchOptions = {
      respectDataSaver: shouldRespectDataSaver,
      connectionThreshold: hasSlowConnection ? 'slow' as const : 'fast' as const,
    };

    // Prefetch immediately when AR modal opens
    const prefetchPromise = loadARLibraries();
    prefetchPromise.catch(console.warn);

    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }, [shouldLoad, isOpen, shouldRespectDataSaver, hasSlowConnection]);

  // Show different states based on capabilities
  if (isLoading) {
    return (
      <div ref={containerRef} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-slate-800/90 rounded-lg p-6 max-w-sm mx-4">
          <div className="text-center">
            <div className="animate-pulse h-4 w-4 bg-purple-500 rounded-full mx-auto mb-2"></div>
            <p className="text-white/60 text-sm">Checking AR capabilities...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!shouldLoad) {
    return (
      <div ref={containerRef} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-gradient-to-br from-red-900/90 to-orange-900/90 rounded-lg p-6 max-w-sm mx-4 border border-red-500/20">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-white/90 font-semibold mb-2">AR Not Available</h3>
            <p className="text-white/60 text-sm mb-3">{reason}</p>
            {!canUseCamera && (
              <p className="text-white/50 text-xs mb-4">
                This device doesn't have camera access, which is required for AR experiences.
              </p>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Capability check passed, render the dynamic component
  return (
    <div ref={containerRef}>
      <LazyAROrchestrator
        ar={ar}
        isOpen={isOpen}
        onClose={onClose}
        onVideoStateChange={onVideoStateChange}
      />
    </div>
  );
};

export default DynamicAROrchestrator;