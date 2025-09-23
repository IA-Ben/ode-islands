/**
 * Centralized Media Player Configuration
 * 
 * This file manages configuration for all media player types (video, 3D, AR)
 * providing unified configuration management with device optimization.
 */

import { CardData } from '@/@typings';
import { AppConfig } from '@/lib/config';

export type MediaType = 'video' | 'playcanvas' | 'ar';

export interface BaseMediaConfig {
  type: MediaType;
  active?: boolean;
  className?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
  onEnd?: () => void;
}

export interface VideoMediaConfig extends BaseMediaConfig {
  type: 'video';
  video: NonNullable<CardData['video']>;
  controls?: boolean;
}

export interface PlayCanvasMediaConfig extends BaseMediaConfig {
  type: 'playcanvas';
  playcanvas: NonNullable<CardData['playcanvas']>;
  onSceneReady?: () => void;
  onUserInteraction?: (event: Record<string, unknown>) => void;
}

export interface ARMediaConfig extends BaseMediaConfig {
  type: 'ar';
  ar: NonNullable<CardData['ar']>;
  isOpen: boolean;
  onClose: () => void;
  onVideoStateChange: (playing: boolean) => void;
}

export type MediaPlayerConfig = VideoMediaConfig | PlayCanvasMediaConfig | ARMediaConfig;

/**
 * Device performance profiles for media optimization
 */
export interface DeviceProfile {
  name: string;
  videoQuality: '480p' | '720p' | '1080p' | '4k';
  enable3D: boolean;
  enableAR: boolean;
  preferredARMode: 'auto' | 'object' | 'marker' | 'location';
  maxBufferSize: number;
  enableBackgroundVideo: boolean;
  reduceAnimations: boolean;
  enableWorkerThreads: boolean;
}

/**
 * Performance profiles based on device capabilities
 */
export const DEVICE_PROFILES: Record<string, DeviceProfile> = {
  low: {
    name: 'Low Performance',
    videoQuality: '480p',
    enable3D: false,
    enableAR: false,
    preferredARMode: 'object',
    maxBufferSize: 30 * 1000 * 1000, // 30MB
    enableBackgroundVideo: false,
    reduceAnimations: true,
    enableWorkerThreads: false,
  },
  medium: {
    name: 'Medium Performance',
    videoQuality: '720p',
    enable3D: true,
    enableAR: true,
    preferredARMode: 'object',
    maxBufferSize: 60 * 1000 * 1000, // 60MB
    enableBackgroundVideo: true,
    reduceAnimations: false,
    enableWorkerThreads: true,
  },
  high: {
    name: 'High Performance',
    videoQuality: '1080p',
    enable3D: true,
    enableAR: true,
    preferredARMode: 'auto',
    maxBufferSize: 120 * 1000 * 1000, // 120MB
    enableBackgroundVideo: true,
    reduceAnimations: false,
    enableWorkerThreads: true,
  },
  ultra: {
    name: 'Ultra Performance',
    videoQuality: '4k',
    enable3D: true,
    enableAR: true,
    preferredARMode: 'auto',
    maxBufferSize: 240 * 1000 * 1000, // 240MB
    enableBackgroundVideo: true,
    reduceAnimations: false,
    enableWorkerThreads: true,
  },
};

/**
 * HLS configuration optimized for different device profiles
 */
export const getHLSConfig = (profile: DeviceProfile, isMobile: boolean) => {
  const baseConfig: any = {
    enableWorker: profile.enableWorkerThreads,
    lowLatencyMode: false,
    autoStartLoad: true,
    startFragPrefetch: !isMobile,
    capLevelToPlayerSize: true,
    maxBufferSize: profile.maxBufferSize,
    maxBufferHole: isMobile ? 1 : 0.5,
  };

  if (isMobile || profile.reduceAnimations) {
    return {
      ...baseConfig,
      backBufferLength: 30,
      maxBufferLength: 60,
      maxMaxBufferLength: 300,
      fpsDroppedMonitoringPeriod: 10000,
      fpsDroppedMonitoringThreshold: 0.3,
    };
  }

  return {
    ...baseConfig,
    backBufferLength: 90,
    maxBufferLength: 120,
    maxMaxBufferLength: 600,
    fpsDroppedMonitoringPeriod: 5000,
    fpsDroppedMonitoringThreshold: 0.2,
  };
};

/**
 * PlayCanvas configuration optimized for different device profiles
 */
export const getPlayCanvasConfig = (profile: DeviceProfile) => ({
  fillMode: 'FILL_WINDOW' as const,
  transparency: false,
  autoPlay: true,
  width: undefined,
  height: undefined,
  // Performance optimizations based on device profile
  _performanceSettings: {
    antialias: profile.name !== 'low',
    alpha: true,
    preserveDrawingBuffer: false,
    preferWebGl2: profile.enableWorkerThreads,
    powerPreference: profile.name === 'ultra' ? 'high-performance' : 'default',
    enableBundles: true,
    preload: !profile.reduceAnimations,
  },
});

/**
 * AR configuration optimized for different device profiles
 */
export const getARConfig = (profile: DeviceProfile, ar: NonNullable<CardData['ar']>) => {
  const config = {
    ...ar,
    performanceProfile: (profile.name === 'low' ? 'low' : 'high') as 'low' | 'high',
    maxFPS: profile.name === 'low' ? 24 : profile.name === 'ultra' ? 60 : 30,
    enableLighting: profile.name !== 'low',
    enableOcclusion: profile.name === 'high' || profile.name === 'ultra',
  };

  // Override AR mode based on device capability
  if (!profile.enableAR) {
    config.mode = 'object'; // Fallback to simple object mode
  } else if (profile.preferredARMode !== 'auto') {
    config.mode = profile.preferredARMode;
  }

  return config;
};

/**
 * Determine device profile based on capabilities
 */
export const getDeviceProfile = (
  isMobile: boolean,
  shouldReduceAnimations: boolean,
  connectionType?: string
): DeviceProfile => {
  // Check for low-end conditions
  if (shouldReduceAnimations || connectionType === '2g' || connectionType === 'slow-2g') {
    return DEVICE_PROFILES.low;
  }

  // Mobile device assessment
  if (isMobile) {
    // High-end mobile conditions
    if (typeof navigator !== 'undefined') {
      const memory = (navigator as any).deviceMemory;
      const cores = navigator.hardwareConcurrency;
      
      if (memory >= 8 || cores >= 8) {
        return DEVICE_PROFILES.high;
      } else if (memory >= 4 || cores >= 4) {
        return DEVICE_PROFILES.medium;
      }
    }
    
    return DEVICE_PROFILES.medium; // Default for mobile
  }

  // Desktop device assessment
  if (typeof navigator !== 'undefined') {
    const memory = (navigator as any).deviceMemory;
    const cores = navigator.hardwareConcurrency;
    
    if (memory >= 16 && cores >= 8) {
      return DEVICE_PROFILES.ultra;
    } else if (memory >= 8 || cores >= 6) {
      return DEVICE_PROFILES.high;
    } else if (memory >= 4 || cores >= 4) {
      return DEVICE_PROFILES.medium;
    }
  }

  return DEVICE_PROFILES.high; // Default for desktop
};

/**
 * Validate media configuration
 */
export const validateMediaConfig = (config: MediaPlayerConfig): boolean => {
  switch (config.type) {
    case 'video':
      return !!(config as VideoMediaConfig).video?.url;
    
    case 'playcanvas':
      const pcConfig = config as PlayCanvasMediaConfig;
      return !!(
        pcConfig.playcanvas?.projectId ||
        pcConfig.playcanvas?.buildPath ||
        pcConfig.playcanvas?.sceneConfig
      );
    
    case 'ar':
      const arConfig = config as ARMediaConfig;
      return !!(
        arConfig.ar?.glbUrl ||
        arConfig.ar?.usdzUrl ||
        arConfig.ar?.markers ||
        arConfig.ar?.locations
      );
    
    default:
      return false;
  }
};

/**
 * Generate optimized configuration for media player
 */
export const getOptimizedConfig = (
  config: MediaPlayerConfig,
  appConfig: AppConfig,
  deviceProfile: DeviceProfile
): MediaPlayerConfig => {
  const baseOptimized = {
    ...config,
    active: config.active !== false, // Default to true
  };

  switch (config.type) {
    case 'video': {
      const videoConfig = config as VideoMediaConfig;
      return {
        ...baseOptimized,
        type: 'video' as const,
        video: videoConfig.video,
        controls: videoConfig.controls !== false,
      };
    }

    case 'playcanvas': {
      const pcConfig = config as PlayCanvasMediaConfig;
      return {
        ...baseOptimized,
        type: 'playcanvas' as const,
        playcanvas: {
          ...pcConfig.playcanvas,
          ...getPlayCanvasConfig(deviceProfile),
        },
      };
    }

    case 'ar': {
      const arConfig = config as ARMediaConfig;
      return {
        ...baseOptimized,
        type: 'ar' as const,
        ar: getARConfig(deviceProfile, arConfig.ar),
        isOpen: arConfig.isOpen,
        onClose: arConfig.onClose,
        onVideoStateChange: arConfig.onVideoStateChange,
      };
    }

    default:
      return baseOptimized;
  }
};

/**
 * Common loading states for all media types
 */
export interface MediaLoadingState {
  isLoading: boolean;
  progress: number;
  stage: 'initializing' | 'loading' | 'processing' | 'ready' | 'error';
  message?: string;
}

/**
 * Common error types for all media types
 */
export interface MediaError {
  type: 'network' | 'format' | 'permissions' | 'device' | 'unknown';
  message: string;
  recoverable: boolean;
  retryable: boolean;
  code?: string;
}

/**
 * Unified control interface for all media types
 */
export interface MediaControls {
  play?: () => void;
  pause?: () => void;
  stop?: () => void;
  seek?: (time: number) => void;
  setVolume?: (volume: number) => void;
  toggleFullscreen?: () => void;
  reset?: () => void;
  getState?: () => Record<string, unknown>;
}

export default {
  DEVICE_PROFILES,
  getHLSConfig,
  getPlayCanvasConfig,
  getARConfig,
  getDeviceProfile,
  validateMediaConfig,
  getOptimizedConfig,
};