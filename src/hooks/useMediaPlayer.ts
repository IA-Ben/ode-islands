/**
 * useMediaPlayer Hook
 * 
 * Central media management hook that provides unified state management
 * and lifecycle control for all media player types (video, 3D, AR).
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useMobile } from '@/contexts/MobileContext';
import { 
  MediaPlayerConfig, 
  MediaLoadingState, 
  MediaError, 
  MediaControls,
  validateMediaConfig 
} from '@/utils/mediaPlayerConfig';
import { MediaPlayerFactory, MediaPlayerInstance } from '@/lib/mediaPlayerFactory';

export interface UseMediaPlayerOptions {
  // Lifecycle callbacks
  onLoad?: () => void;
  onError?: (error: MediaError) => void;
  onProgress?: (progress: number) => void;
  onEnd?: () => void;
  onStateChange?: (state: Record<string, unknown>) => void;
  
  // Performance options
  enableMemoryOptimization?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  
  // Lifecycle control
  autoInitialize?: boolean;
  cleanupOnUnmount?: boolean;
}

export interface UseMediaPlayerReturn {
  // Instance and component
  instance: MediaPlayerInstance | null;
  Component: React.ComponentType<any> | null;
  
  // State management
  isLoading: boolean;
  error: MediaError | null;
  progress: number;
  loadingState: MediaLoadingState | null;
  
  // Controls
  controls: MediaControls | null;
  
  // Lifecycle methods
  initialize: () => Promise<void>;
  cleanup: () => void;
  retry: () => Promise<void>;
  reset: () => Promise<void>;
  
  // State methods
  getState: () => Record<string, unknown>;
  setState: (state: Record<string, unknown>) => void;
  
  // Performance monitoring
  getStats: () => {
    memoryUsage: number;
    isActive: boolean;
    type: string;
    deviceProfile: string;
  };
}

/**
 * Unified media player hook
 */
export const useMediaPlayer = (
  config: MediaPlayerConfig | null,
  options: UseMediaPlayerOptions = {}
): UseMediaPlayerReturn => {
  const {
    onLoad,
    onError,
    onProgress,
    onEnd,
    onStateChange,
    enableMemoryOptimization = true,
    maxRetries = 3,
    retryDelay = 2000,
    autoInitialize = true,
    cleanupOnUnmount = true,
  } = options;
  
  // Mobile context for device optimization
  const { isMobile, shouldReduceAnimations } = useMobile();
  
  // State management
  const [instance, setInstance] = useState<MediaPlayerInstance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<MediaError | null>(null);
  const [progress, setProgress] = useState(0);
  const [loadingState, setLoadingState] = useState<MediaLoadingState | null>(null);
  
  // Refs for tracking
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef<Record<string, unknown>>({});
  const isInitializedRef = useRef(false);
  
  // Get connection type for optimization
  const connectionType = useMemo(() => {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection?.effectiveType || 'unknown';
    }
    return 'unknown';
  }, []);
  
  /**
   * Initialize media player instance
   */
  const initialize = useCallback(async () => {
    if (!config || isInitializedRef.current) return;
    
    try {
      setIsLoading(true);
      setError(null);
      setProgress(0);
      
      // Validate configuration
      if (!validateMediaConfig(config)) {
        throw new Error(`Invalid media configuration for type: ${config.type}`);
      }
      
      // Create instance using factory
      const newInstance = await MediaPlayerFactory.createPlayer(
        config,
        isMobile,
        shouldReduceAnimations,
        connectionType
      );
      
      // Setup state synchronization
      if (newInstance.loadingState) {
        setLoadingState(newInstance.loadingState);
        setProgress(newInstance.loadingState.progress);
      }
      
      if (newInstance.error) {
        setError(newInstance.error);
      }
      
      setInstance(newInstance);
      isInitializedRef.current = true;
      retryCountRef.current = 0;
      
      // Notify success
      onLoad?.();
      
    } catch (err) {
      const errorObj: MediaError = {
        type: 'unknown',
        message: err instanceof Error ? err.message : 'Failed to initialize media player',
        recoverable: true,
        retryable: true,
      };
      
      setError(errorObj);
      onError?.(errorObj);
      
      console.error('Media player initialization failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [config, isMobile, shouldReduceAnimations, connectionType, onLoad, onError]);
  
  /**
   * Cleanup media player instance
   */
  const cleanup = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    if (instance) {
      MediaPlayerFactory.destroyInstance(instance);
      setInstance(null);
    }
    
    setIsLoading(false);
    setError(null);
    setProgress(0);
    setLoadingState(null);
    stateRef.current = {};
    isInitializedRef.current = false;
    retryCountRef.current = 0;
  }, [instance]);
  
  /**
   * Retry initialization with exponential backoff
   */
  const retry = useCallback(async () => {
    if (retryCountRef.current >= maxRetries) {
      setError({
        type: 'unknown',
        message: `Failed to initialize after ${maxRetries} retries`,
        recoverable: false,
        retryable: false,
      });
      return;
    }
    
    retryCountRef.current++;
    const delay = retryDelay * Math.pow(2, retryCountRef.current - 1);
    
    console.log(`Retrying media player initialization (attempt ${retryCountRef.current}/${maxRetries}) in ${delay}ms`);
    
    // Cleanup current instance before retry
    if (instance) {
      MediaPlayerFactory.destroyInstance(instance);
      setInstance(null);
    }
    
    isInitializedRef.current = false;
    
    return new Promise<void>((resolve) => {
      retryTimeoutRef.current = setTimeout(async () => {
        await initialize();
        resolve();
      }, delay);
    });
  }, [maxRetries, retryDelay, instance, initialize]);
  
  /**
   * Reset player to initial state
   */
  const reset = useCallback(async () => {
    cleanup();
    await initialize();
  }, [cleanup, initialize]);
  
  /**
   * Get current player state
   */
  const getState = useCallback((): Record<string, unknown> => {
    const instanceState = instance?.getState?.() || {};
    return {
      ...stateRef.current,
      ...instanceState,
      isLoading,
      error,
      progress,
    };
  }, [instance, isLoading, error, progress]);
  
  /**
   * Set player state
   */
  const setState = useCallback((newState: Record<string, unknown>) => {
    stateRef.current = { ...stateRef.current, ...newState };
    instance?.setState?.(newState);
    onStateChange?.(getState());
  }, [instance, onStateChange, getState]);
  
  /**
   * Get performance statistics
   */
  const getStats = useCallback(() => {
    return {
      memoryUsage: MediaPlayerFactory.getStats().memoryUsage,
      isActive: !!instance?.config.active,
      type: instance?.type || 'none',
      deviceProfile: instance?.deviceProfile.name || 'unknown',
    };
  }, [instance]);
  
  // Auto-initialize on config change
  useEffect(() => {
    if (config && autoInitialize && !isInitializedRef.current) {
      initialize();
    }
  }, [config, autoInitialize, initialize]);
  
  // Sync loading state from instance
  useEffect(() => {
    if (instance?.loadingState) {
      setLoadingState(instance.loadingState);
      setProgress(instance.loadingState.progress);
      setIsLoading(instance.loadingState.isLoading);
      
      // Notify progress
      onProgress?.(instance.loadingState.progress);
    }
  }, [instance?.loadingState, onProgress]);
  
  // Sync error state from instance
  useEffect(() => {
    if (instance?.error) {
      setError(instance.error);
      onError?.(instance.error);
    }
  }, [instance?.error, onError]);
  
  // Memory optimization
  useEffect(() => {
    if (enableMemoryOptimization) {
      const interval = setInterval(() => {
        MediaPlayerFactory.performMemoryCleanup();
      }, 30000); // Check every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [enableMemoryOptimization]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupOnUnmount) {
        cleanup();
      }
    };
  }, [cleanupOnUnmount, cleanup]);
  
  // Handle window/tab visibility for performance
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pause non-essential media when tab is hidden
        if (instance?.controls?.pause && config?.type === 'video') {
          instance.controls.pause();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [instance, config]);
  
  // Memoized component reference
  const Component = useMemo(() => {
    return instance?.component || null;
  }, [instance?.component]);
  
  // Memoized controls
  const controls = useMemo(() => {
    return instance?.controls || null;
  }, [instance?.controls]);
  
  return {
    instance,
    Component,
    isLoading,
    error,
    progress,
    loadingState,
    controls,
    initialize,
    cleanup,
    retry,
    reset,
    getState,
    setState,
    getStats,
  };
};

/**
 * Specialized hooks for specific media types
 */

export const useVideoPlayer = (
  config: Extract<MediaPlayerConfig, { type: 'video' }> | null,
  options?: UseMediaPlayerOptions
) => {
  return useMediaPlayer(config, options);
};

export const usePlayCanvasPlayer = (
  config: Extract<MediaPlayerConfig, { type: 'playcanvas' }> | null,
  options?: UseMediaPlayerOptions
) => {
  return useMediaPlayer(config, options);
};

export const useARPlayer = (
  config: Extract<MediaPlayerConfig, { type: 'ar' }> | null,
  options?: UseMediaPlayerOptions
) => {
  return useMediaPlayer(config, options);
};

export default useMediaPlayer;