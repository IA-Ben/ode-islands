"use client";

import React, { useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useDeviceCapabilities, useShouldLoadFeature } from '@/hooks/useDeviceCapabilities';
import { prefetchOnIntersection, loadCharts } from '@/utils/lazyModules';

// Loading component for charts
const ChartsLoadingFallback = () => (
  <div className="w-full h-full bg-gradient-to-br from-blue-900/10 to-purple-900/10 rounded-lg flex items-center justify-center backdrop-blur-sm border border-blue-500/10">
    <div className="text-center">
      <div className="animate-pulse flex space-x-1 mb-3">
        <div className="w-2 h-8 bg-blue-500/60 rounded"></div>
        <div className="w-2 h-6 bg-blue-500/50 rounded"></div>
        <div className="w-2 h-10 bg-blue-500/70 rounded"></div>
        <div className="w-2 h-4 bg-blue-500/40 rounded"></div>
        <div className="w-2 h-7 bg-blue-500/60 rounded"></div>
      </div>
      <p className="text-white/70 text-sm">Loading charts...</p>
      <p className="text-white/50 text-xs mt-1">Initializing data visualization</p>
    </div>
  </div>
);

// Dynamic import of recharts components with central loader
const LazyLineChart = dynamic(
  () => loadCharts().then(mod => ({ default: mod.LineChart })),
  { ssr: false, loading: ChartsLoadingFallback }
);

const LazyBarChart = dynamic(
  () => loadCharts().then(mod => ({ default: mod.BarChart })),
  { ssr: false, loading: ChartsLoadingFallback }
);

const LazyPieChart = dynamic(
  () => loadCharts().then(mod => ({ default: mod.PieChart })),
  { ssr: false, loading: ChartsLoadingFallback }
);

const LazyAreaChart = dynamic(
  () => loadCharts().then(mod => ({ default: mod.AreaChart })),
  { ssr: false, loading: ChartsLoadingFallback }
);

// Export dynamic chart components
export { LazyLineChart as LineChart };
export { LazyBarChart as BarChart };
export { LazyPieChart as PieChart };
export { LazyAreaChart as AreaChart };

// Common chart wrapper with capability detection
interface DynamicChartWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export const DynamicChartWrapper: React.FC<DynamicChartWrapperProps> = ({
  children,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { shouldLoad, reason } = useShouldLoadFeature('charts');
  const { isLoading, shouldRespectDataSaver, hasSlowConnection } = useDeviceCapabilities();

  // Prefetch charts when container enters viewport
  useEffect(() => {
    if (!shouldLoad || !containerRef.current) return;

    const element = containerRef.current;

    // Add intersection-based prefetching for charts
    const prefetchOptions = {
      respectDataSaver: shouldRespectDataSaver,
      connectionThreshold: hasSlowConnection ? 'slow' as const : 'fast' as const,
    };

    const cleanup = prefetchOnIntersection(element, loadCharts, prefetchOptions);

    return cleanup;
  }, [shouldLoad, shouldRespectDataSaver, hasSlowConnection]);

  // Show loading state
  if (isLoading) {
    return (
      <div ref={containerRef} className={`w-full h-full ${className}`}>
        <ChartsLoadingFallback />
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-white/80 font-medium mb-1">Charts Unavailable</h3>
            <p className="text-white/50 text-xs">{reason}</p>
          </div>
        </div>
      </div>
    );
  }

  // Capability check passed, render children
  return (
    <div ref={containerRef} className={`w-full h-full ${className}`}>
      {children}
    </div>
  );
};