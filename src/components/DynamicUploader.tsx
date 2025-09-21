"use client";

import React, { useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useDeviceCapabilities, useShouldLoadFeature } from '@/hooks/useDeviceCapabilities';
import { prefetchOnIntent, loadUppy } from '@/utils/lazyModules';

// Loading component for uploader
const UploaderLoadingFallback = () => (
  <div className="w-full h-full bg-gradient-to-br from-amber-900/10 to-orange-900/10 rounded-lg flex items-center justify-center backdrop-blur-sm border border-amber-500/10">
    <div className="text-center">
      <div className="animate-bounce mb-3">
        <svg className="w-8 h-8 text-amber-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </div>
      <p className="text-white/70 text-sm">Loading uploader...</p>
      <p className="text-white/50 text-xs mt-1">Initializing file upload</p>
    </div>
  </div>
);

// Dynamic import of upload components with SSR disabled
const LazyObjectUploader = dynamic(
  () => import('./ObjectUploader'),
  { ssr: false, loading: UploaderLoadingFallback }
);

// Export dynamic uploader components
interface DynamicObjectUploaderProps {
  onUpload: (url: string) => void;
  acceptedTypes?: string[];
  maxSize?: number;
  className?: string;
}

export const DynamicObjectUploader: React.FC<DynamicObjectUploaderProps> = ({
  onUpload,
  acceptedTypes,
  maxSize,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { shouldLoad, reason } = useShouldLoadFeature('uppy');
  const { isLoading, shouldRespectDataSaver, hasSlowConnection } = useDeviceCapabilities();

  // Prefetch uploader when container is focused/hovered
  useEffect(() => {
    if (!shouldLoad || !containerRef.current) return;

    const element = containerRef.current;

    // Add intent-based prefetching for upload functionality
    const prefetchOptions = {
      respectDataSaver: shouldRespectDataSaver,
      connectionThreshold: hasSlowConnection ? 'slow' as const : 'fast' as const,
    };

    const cleanup = prefetchOnIntent(element, loadUppy, prefetchOptions);

    return cleanup;
  }, [shouldLoad, shouldRespectDataSaver, hasSlowConnection]);

  // Show loading state
  if (isLoading) {
    return (
      <div ref={containerRef} className={`w-full h-full ${className}`}>
        <UploaderLoadingFallback />
      </div>
    );
  }

  // Show unavailable state
  if (!shouldLoad) {
    return (
      <div ref={containerRef} className={`w-full h-full ${className}`}>
        <div className="w-full h-full bg-gradient-to-br from-gray-900/20 to-slate-900/20 rounded-lg flex items-center justify-center border border-gray-500/20">
          <div className="text-center p-4">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-500/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-white/80 font-medium mb-1">Upload Unavailable</h3>
            <p className="text-white/50 text-xs">{reason}</p>
          </div>
        </div>
      </div>
    );
  }

  // Capability check passed, render dynamic component
  return (
    <div ref={containerRef} className={`w-full h-full ${className}`}>
      <LazyObjectUploader
        onUpload={onUpload}
        acceptedTypes={acceptedTypes}
        maxSize={maxSize}
      />
    </div>
  );
};