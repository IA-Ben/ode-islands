"use client";

import React, { useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useDeviceCapabilities, useShouldLoadFeature } from '@/hooks/useDeviceCapabilities';
import { prefetchOnIntent, loadQRScanner } from '@/utils/lazyModules';

// Loading component for QR scanner
const QRScannerLoadingFallback = () => (
  <div className="w-full h-full bg-gradient-to-br from-green-900/20 to-blue-900/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
      <p className="text-white/80 text-sm">Loading QR Scanner...</p>
      <p className="text-white/60 text-xs mt-1">Accessing camera</p>
    </div>
  </div>
);

// Dynamic import of the actual QR scanner with SSR disabled
const LazyQRScanner = dynamic(
  () => import('./QRScanner').then(mod => ({ default: mod.QRScanner })),
  {
    ssr: false,
    loading: QRScannerLoadingFallback,
  }
);

interface DynamicQRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

const DynamicQRScanner: React.FC<DynamicQRScannerProps> = ({
  onScan,
  onClose,
  isOpen,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { shouldLoad, reason } = useShouldLoadFeature('qr');
  const { canUseCamera, isLoading, shouldRespectDataSaver, hasSlowConnection } = useDeviceCapabilities();

  // Prefetch QR scanner libraries when scanner button is focused/hovered
  useEffect(() => {
    if (!shouldLoad || !containerRef.current) return;

    const element = containerRef.current;
    let cleanupFunctions: (() => void)[] = [];

    // Add intent-based prefetching for QR functionality
    const prefetchOptions = {
      respectDataSaver: shouldRespectDataSaver,
      connectionThreshold: hasSlowConnection ? 'slow' as const : 'fast' as const,
    };

    // Prefetch on hover/focus intent
    const cleanupIntent = prefetchOnIntent(element, loadQRScanner, prefetchOptions);
    if (cleanupIntent) cleanupFunctions.push(cleanupIntent);

    // Prefetch immediately when scanner is about to be opened
    if (isOpen) {
      const prefetchPromise = loadQRScanner();
      prefetchPromise.catch(console.warn);
    }

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
            <div className="animate-pulse h-4 w-4 bg-green-500 rounded-full mx-auto mb-2"></div>
            <p className="text-white/60 text-sm">Checking camera capabilities...</p>
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-white/90 font-semibold mb-2">QR Scanner Unavailable</h3>
            <p className="text-white/60 text-sm mb-3">{reason}</p>
            {!canUseCamera && (
              <p className="text-white/50 text-xs mb-4">
                This device doesn't have camera access, which is required for QR code scanning.
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
      <LazyQRScanner
        onScan={onScan}
        onClose={onClose}
        isOpen={isOpen}
      />
    </div>
  );
};

export default DynamicQRScanner;