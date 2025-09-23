/**
 * Unified lazy loading configuration for all dynamic components
 * Centralizes loading patterns, fallbacks, and component-specific settings
 */

import React from 'react';
import { 
  loadCharts, 
  loadQRScanner, 
  loadPlayCanvas, 
  loadUppy, 
  loadARLibraries, 
  loadHLS,
  PrefetchOptions 
} from './lazyModules';

// All supported component types in the unified system
export type LazyComponentType = 
  | 'charts' 
  | 'qr-scanner' 
  | 'playcanvas' 
  | 'uploader' 
  | 'ar-orchestrator' 
  | 'player'
  | 'client-card'
  | 'media-player';

// Configuration for loading states and animations
export interface LoadingFallbackConfig {
  gradient: string;
  borderColor?: string;
  icon: React.ReactNode;
  animation: 'spin' | 'pulse' | 'bounce';
  primaryText: string;
  secondaryText: string;
  backgroundColor?: string;
}

// Configuration for each component type
export interface LazyComponentConfig {
  // Module loader function
  loader: () => Promise<any>;
  // Feature type for capability checking
  featureType: 'playcanvas' | 'ar' | 'hls' | 'charts' | 'qr' | 'uppy' | 'share';
  // Loading fallback configuration
  fallback: LoadingFallbackConfig;
  // Component import path for dynamic loading
  importPath: string;
  // Whether to use SSR (most should be false for client-side features)
  ssr: boolean;
  // Default prefetch options
  prefetchOptions: {
    respectDataSaver: boolean;
    connectionThreshold: 'slow' | 'fast';
    prefetchStrategy: 'intent' | 'intersection' | 'immediate' | 'none';
  };
  // Error handling configuration
  errorConfig: {
    title: string;
    fallbackMessage: string;
    showRetry: boolean;
  };
}

// Reusable icon components for loading states
const LoadingIcons = {
  charts: React.createElement('div', { className: 'animate-pulse flex space-x-1 mb-3' }, [
    React.createElement('div', { key: '1', className: 'w-2 h-8 bg-blue-500/60 rounded' }),
    React.createElement('div', { key: '2', className: 'w-2 h-6 bg-blue-500/50 rounded' }),
    React.createElement('div', { key: '3', className: 'w-2 h-10 bg-blue-500/70 rounded' }),
    React.createElement('div', { key: '4', className: 'w-2 h-4 bg-blue-500/40 rounded' }),
    React.createElement('div', { key: '5', className: 'w-2 h-7 bg-blue-500/60 rounded' }),
  ]),
  camera: React.createElement('svg', { 
    className: 'w-8 h-8 text-green-500 mx-auto', 
    fill: 'none', 
    stroke: 'currentColor', 
    viewBox: '0 0 24 24' 
  }, [
    React.createElement('path', { 
      key: '1',
      strokeLinecap: 'round', 
      strokeLinejoin: 'round', 
      strokeWidth: 2, 
      d: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z' 
    }),
    React.createElement('path', { 
      key: '2',
      strokeLinecap: 'round', 
      strokeLinejoin: 'round', 
      strokeWidth: 2, 
      d: 'M15 13a3 3 0 11-6 0 3 3 0 016 0z' 
    })
  ]),
  webgl: React.createElement('div', { className: 'w-12 h-12 mx-auto mb-3 bg-blue-500/20 rounded-full flex items-center justify-center' },
    React.createElement('svg', { className: 'w-6 h-6 text-blue-400', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' })
    )
  ),
  upload: React.createElement('svg', { className: 'w-8 h-8 text-amber-500 mx-auto', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
    React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' })
  ),
  ar: React.createElement('div', { className: 'w-12 h-12 mx-auto mb-3 bg-purple-500/20 rounded-full flex items-center justify-center' },
    React.createElement('svg', { className: 'w-6 h-6 text-purple-400', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' })
    )
  ),
  video: React.createElement('div', { className: 'animate-spin rounded-full h-8 w-8 border-b-2 border-white/50 mx-auto mb-3' }),
  loading: React.createElement('div', { className: 'animate-pulse h-4 w-4 bg-blue-500 rounded-full mx-auto mb-2' }),
};

// Centralized configuration for all component types
export const LAZY_COMPONENT_CONFIGS: Record<LazyComponentType, LazyComponentConfig> = {
  'charts': {
    loader: loadCharts,
    featureType: 'charts',
    fallback: {
      gradient: 'from-blue-900/10 to-purple-900/10',
      borderColor: 'border-blue-500/10',
      icon: LoadingIcons.charts,
      animation: 'pulse',
      primaryText: 'Loading charts...',
      secondaryText: 'Initializing data visualization',
    },
    importPath: './analytics/OverviewDashboard',
    ssr: false,
    prefetchOptions: {
      respectDataSaver: true,
      connectionThreshold: 'fast',
      prefetchStrategy: 'intersection',
    },
    errorConfig: {
      title: 'Charts Unavailable',
      fallbackMessage: 'Data visualization is not available on this device',
      showRetry: false,
    },
  },

  'qr-scanner': {
    loader: loadQRScanner,
    featureType: 'qr',
    fallback: {
      gradient: 'from-green-900/20 to-blue-900/20',
      icon: LoadingIcons.camera,
      animation: 'spin',
      primaryText: 'Loading QR Scanner...',
      secondaryText: 'Accessing camera',
    },
    importPath: './QRScanner',
    ssr: false,
    prefetchOptions: {
      respectDataSaver: true,
      connectionThreshold: 'fast',
      prefetchStrategy: 'intent',
    },
    errorConfig: {
      title: 'QR Scanner Unavailable',
      fallbackMessage: 'Camera access is required for QR code scanning',
      showRetry: true,
    },
  },

  'playcanvas': {
    loader: loadPlayCanvas,
    featureType: 'playcanvas',
    fallback: {
      gradient: 'from-blue-900/20 to-purple-900/20',
      icon: LoadingIcons.webgl,
      animation: 'spin',
      primaryText: 'Loading 3D Experience...',
      secondaryText: 'Initializing WebGL',
    },
    importPath: './PlayCanvasViewer',
    ssr: false,
    prefetchOptions: {
      respectDataSaver: true,
      connectionThreshold: 'fast',
      prefetchStrategy: 'intersection',
    },
    errorConfig: {
      title: '3D Content Unavailable',
      fallbackMessage: 'WebGL support is required for 3D experiences',
      showRetry: false,
    },
  },

  'uploader': {
    loader: loadUppy,
    featureType: 'uppy',
    fallback: {
      gradient: 'from-amber-900/10 to-orange-900/10',
      borderColor: 'border-amber-500/10',
      icon: LoadingIcons.upload,
      animation: 'bounce',
      primaryText: 'Loading uploader...',
      secondaryText: 'Initializing file upload',
    },
    importPath: './ObjectUploader',
    ssr: false,
    prefetchOptions: {
      respectDataSaver: true,
      connectionThreshold: 'fast',
      prefetchStrategy: 'intent',
    },
    errorConfig: {
      title: 'Upload Unavailable',
      fallbackMessage: 'File upload is not available',
      showRetry: false,
    },
  },

  'ar-orchestrator': {
    loader: loadARLibraries,
    featureType: 'ar',
    fallback: {
      gradient: 'from-purple-900/20 to-pink-900/20',
      icon: LoadingIcons.ar,
      animation: 'pulse',
      primaryText: 'Loading AR Experience...',
      secondaryText: 'Initializing camera and AR libraries',
    },
    importPath: './AROrchestrator',
    ssr: false,
    prefetchOptions: {
      respectDataSaver: true,
      connectionThreshold: 'fast',
      prefetchStrategy: 'immediate',
    },
    errorConfig: {
      title: 'AR Experience Unavailable',
      fallbackMessage: 'Camera and AR capabilities are required',
      showRetry: true,
    },
  },

  'player': {
    loader: loadHLS,
    featureType: 'hls',
    fallback: {
      gradient: 'from-black/80',
      backgroundColor: 'bg-black/80',
      icon: LoadingIcons.video,
      animation: 'spin',
      primaryText: 'Loading video player...',
      secondaryText: '',
    },
    importPath: './Player',
    ssr: false,
    prefetchOptions: {
      respectDataSaver: true,
      connectionThreshold: 'slow',
      prefetchStrategy: 'intersection',
    },
    errorConfig: {
      title: 'Video Unavailable',
      fallbackMessage: 'Video playback is not supported',
      showRetry: true,
    },
  },

  'client-card': {
    loader: () => Promise.resolve({}), // No special loading required
    featureType: 'share', // Generic feature type
    fallback: {
      gradient: 'from-slate-900/50',
      icon: LoadingIcons.loading,
      animation: 'pulse',
      primaryText: 'Loading...',
      secondaryText: 'Preparing component',
    },
    importPath: './Card',
    ssr: false,
    prefetchOptions: {
      respectDataSaver: false,
      connectionThreshold: 'slow',
      prefetchStrategy: 'none',
    },
    errorConfig: {
      title: 'Component Unavailable',
      fallbackMessage: 'This component is not available',
      showRetry: false,
    },
  },

  'media-player': {
    loader: () => Promise.resolve({}), // MediaPlayer is already lazy-loaded internally
    featureType: 'hls', // Default to HLS, but supports all media types
    fallback: {
      gradient: 'from-blue-900/20 to-purple-900/20',
      icon: React.createElement('div', { className: 'text-4xl animate-pulse' }, '🎬'),
      animation: 'pulse',
      primaryText: 'Loading media player...',
      secondaryText: 'Initializing unified media system',
    },
    importPath: './MediaPlayer',
    ssr: false,
    prefetchOptions: {
      respectDataSaver: true,
      connectionThreshold: 'fast',
      prefetchStrategy: 'intersection',
    },
    errorConfig: {
      title: 'Media Player Unavailable',
      fallbackMessage: 'Media playback is not supported on this device',
      showRetry: true,
    },
  },
};

// Helper function to get configuration for a component type
export const getLazyComponentConfig = (type: LazyComponentType): LazyComponentConfig => {
  const config = LAZY_COMPONENT_CONFIGS[type];
  if (!config) {
    throw new Error(`Unknown lazy component type: ${type}`);
  }
  return config;
};

// Helper function to create default prefetch options with overrides
export const createPrefetchOptions = (
  type: LazyComponentType,
  overrides: Partial<PrefetchOptions> = {}
): PrefetchOptions => {
  const config = getLazyComponentConfig(type);
  return {
    respectDataSaver: config.prefetchOptions.respectDataSaver,
    connectionThreshold: config.prefetchOptions.connectionThreshold,
    ...overrides,
  };
};

// Utility for creating consistent error states
export const createErrorState = (type: LazyComponentType, reason: string) => {
  const config = getLazyComponentConfig(type);
  return {
    title: config.errorConfig.title,
    message: reason || config.errorConfig.fallbackMessage,
    showRetry: config.errorConfig.showRetry,
  };
};

// Static importers map to fix webpack critical dependency warning
export const COMPONENT_IMPORTERS: Record<LazyComponentType, () => Promise<any>> = {
  'charts': () => import('../components/analytics/OverviewDashboard'),
  'qr-scanner': () => import('../components/QRScanner'),
  'playcanvas': () => import('../components/PlayCanvasViewer'),
  'uploader': () => import('../components/ObjectUploader'),
  'ar-orchestrator': () => import('../components/AROrchestrator'),
  'player': () => import('../components/Player'),
  'client-card': () => import('../components/Card'),
  'media-player': () => import('../components/MediaPlayer'),
};

// Type guard for valid component types
export const isValidComponentType = (type: string): type is LazyComponentType => {
  return type in LAZY_COMPONENT_CONFIGS;
};