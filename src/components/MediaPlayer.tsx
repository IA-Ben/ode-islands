/**
 * MediaPlayer - Unified Media Player Facade
 * 
 * A unified facade component that consolidates video, 3D, and AR media players
 * into a single, consistent interface while preserving all specialized functionality.
 */

"use client";

import React, { Suspense, forwardRef, useImperativeHandle, useCallback } from 'react';
import { CardData } from '@/@typings';
import { 
  MediaPlayerConfig, 
  VideoMediaConfig, 
  PlayCanvasMediaConfig, 
  ARMediaConfig,
  MediaError,
  MediaControls 
} from '@/utils/mediaPlayerConfig';
import { useMediaPlayer, UseMediaPlayerOptions } from '@/hooks/useMediaPlayer';

/**
 * Unified MediaPlayer props interface
 */
export interface MediaPlayerProps {
  // Media configuration - union of all media types
  type: 'video' | 'playcanvas' | 'ar';
  
  // Type-specific configurations
  video?: NonNullable<CardData['video']>;
  playcanvas?: NonNullable<CardData['playcanvas']>;
  ar?: NonNullable<CardData['ar']>;
  
  // Common properties
  active?: boolean;
  className?: string;
  
  // Video-specific props (for backward compatibility)
  controls?: boolean;
  
  // PlayCanvas-specific props
  onSceneReady?: () => void;
  onUserInteraction?: (event: Record<string, unknown>) => void;
  
  // AR-specific props
  isOpen?: boolean;
  onClose?: () => void;
  onVideoStateChange?: (playing: boolean) => void;
  
  // Common lifecycle callbacks
  onLoad?: () => void;
  onError?: (error: Error | MediaError) => void;
  onProgress?: (progress: number) => void;
  onEnd?: () => void;
  onStateChange?: (state: Record<string, unknown>) => void;
  
  // Performance options
  enableMemoryOptimization?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  
  // Pass-through HTML attributes for video
  [key: string]: any;
}

/**
 * MediaPlayer ref interface for imperative control
 */
export interface MediaPlayerRef {
  // Core controls
  play: () => void;
  pause: () => void;
  stop: () => void;
  reset: () => void;
  
  // Video-specific controls
  seek?: (time: number) => void;
  setVolume?: (volume: number) => void;
  toggleFullscreen?: () => void;
  
  // State management
  getState: () => Record<string, unknown>;
  setState: (state: Record<string, unknown>) => void;
  
  // Lifecycle
  retry: () => Promise<void>;
  cleanup: () => void;
  
  // Performance monitoring
  getStats: () => {
    memoryUsage: number;
    isActive: boolean;
    type: string;
    deviceProfile: string;
  };
}

/**
 * Default loading component with media-type specific styling
 */
const MediaPlayerLoading: React.FC<{
  type: 'video' | 'playcanvas' | 'ar';
  message?: string;
  progress?: number;
}> = ({ type, message, progress = 0 }) => {
  const getTypeInfo = () => {
    switch (type) {
      case 'video':
        return {
          icon: '🎬',
          gradient: 'from-blue-900/20 to-purple-900/20',
          border: 'border-blue-500/20',
          text: 'Loading video...',
        };
      case 'playcanvas':
        return {
          icon: '🎮',
          gradient: 'from-green-900/20 to-blue-900/20',
          border: 'border-green-500/20',
          text: 'Loading 3D scene...',
        };
      case 'ar':
        return {
          icon: '🥽',
          gradient: 'from-purple-900/20 to-pink-900/20',
          border: 'border-purple-500/20',
          text: 'Initializing AR...',
        };
    }
  };
  
  const { icon, gradient, border, text } = getTypeInfo();
  
  return (
    <div className={`w-full h-full bg-gradient-to-br ${gradient} rounded-lg flex items-center justify-center backdrop-blur-sm ${border} border`}>
      <div className="text-center p-6">
        <div className="text-4xl mb-4 animate-pulse">{icon}</div>
        <div className="w-16 h-16 mx-auto mb-4 relative">
          <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
          <div 
            className="absolute inset-0 border-4 border-white/40 rounded-full border-t-transparent animate-spin"
            style={{ 
              background: `conic-gradient(transparent ${360 - progress * 3.6}deg, rgba(255,255,255,0.4) 0deg)` 
            }}
          ></div>
        </div>
        <p className="text-white/90 font-medium mb-2">{message || text}</p>
        {progress > 0 && (
          <div className="w-full bg-white/10 rounded-full h-1 mb-2">
            <div 
              className="h-1 bg-white/40 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        <p className="text-white/60 text-xs">
          {progress > 0 ? `${Math.round(progress)}% complete` : 'Please wait...'}
        </p>
      </div>
    </div>
  );
};

/**
 * Error component with retry functionality
 */
const MediaPlayerError: React.FC<{
  error: MediaError;
  onRetry: () => void;
  type: 'video' | 'playcanvas' | 'ar';
}> = ({ error, onRetry, type }) => {
  const canRetry = error.retryable && error.recoverable;
  
  return (
    <div className="w-full h-full bg-gradient-to-br from-red-900/20 to-orange-900/20 rounded-lg flex items-center justify-center backdrop-blur-sm border border-red-500/20">
      <div className="text-center p-6 max-w-sm">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-white/90 font-semibold mb-2">
          {type === 'video' ? 'Video Error' : type === 'playcanvas' ? '3D Scene Error' : 'AR Error'}
        </h3>
        <p className="text-white/60 text-sm mb-4">{error.message}</p>
        <div className="flex space-x-2 justify-center">
          {canRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors text-sm"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Unified MediaPlayer Component
 */
export const MediaPlayer = forwardRef<MediaPlayerRef, MediaPlayerProps>(({
  type,
  video,
  playcanvas,
  ar,
  active = true,
  className = '',
  controls,
  onSceneReady,
  onUserInteraction,
  isOpen = false,
  onClose,
  onVideoStateChange,
  onLoad,
  onError,
  onProgress,
  onEnd,
  onStateChange,
  enableMemoryOptimization,
  maxRetries,
  retryDelay,
  ...htmlProps
}, ref) => {
  
  // Build configuration based on type
  const config: MediaPlayerConfig | null = React.useMemo(() => {
    switch (type) {
      case 'video':
        if (!video) return null;
        return {
          type: 'video',
          video,
          active,
          className,
          controls,
          onLoad,
          onError: (error) => onError?.(error),
          onProgress,
          onEnd,
        } as VideoMediaConfig;
      
      case 'playcanvas':
        if (!playcanvas) return null;
        return {
          type: 'playcanvas',
          playcanvas,
          active,
          className,
          onLoad,
          onError: (error) => onError?.(error),
          onProgress,
          onSceneReady,
          onUserInteraction,
        } as PlayCanvasMediaConfig;
      
      case 'ar':
        if (!ar) return null;
        return {
          type: 'ar',
          ar,
          active,
          className,
          isOpen,
          onClose: onClose || (() => {}),
          onVideoStateChange: onVideoStateChange || (() => {}),
          onLoad,
          onError: (error) => onError?.(error),
          onProgress,
        } as ARMediaConfig;
      
      default:
        return null;
    }
  }, [type, video, playcanvas, ar, active, className, controls, isOpen, onClose, onVideoStateChange, onLoad, onError, onProgress, onEnd, onSceneReady, onUserInteraction]);
  
  // Hook options
  const hookOptions: UseMediaPlayerOptions = React.useMemo(() => ({
    onLoad,
    onError: (error) => onError?.(error),
    onProgress,
    onEnd,
    onStateChange,
    enableMemoryOptimization,
    maxRetries,
    retryDelay,
  }), [onLoad, onError, onProgress, onEnd, onStateChange, enableMemoryOptimization, maxRetries, retryDelay]);
  
  // Use the unified media player hook
  const {
    instance,
    Component,
    isLoading,
    error,
    progress,
    controls: playerControls,
    initialize,
    cleanup,
    retry,
    reset,
    getState,
    setState,
    getStats,
  } = useMediaPlayer(config, hookOptions);
  
  // Expose imperative API through ref
  useImperativeHandle(ref, () => ({
    // Core controls
    play: () => playerControls?.play?.(),
    pause: () => playerControls?.pause?.(),
    stop: () => playerControls?.stop?.(),
    reset,
    
    // Video-specific controls
    seek: playerControls?.seek,
    setVolume: playerControls?.setVolume,
    toggleFullscreen: playerControls?.toggleFullscreen,
    
    // State management
    getState,
    setState,
    
    // Lifecycle
    retry,
    cleanup,
    
    // Performance monitoring
    getStats,
  }), [playerControls, reset, getState, setState, retry, cleanup, getStats]);
  
  // Show error state
  if (error) {
    return (
      <div className={`media-player media-player--error ${className}`}>
        <MediaPlayerError 
          error={error} 
          onRetry={retry}
          type={type}
        />
      </div>
    );
  }
  
  // Show loading state
  if (isLoading || !Component) {
    return (
      <div className={`media-player media-player--loading ${className}`}>
        <MediaPlayerLoading 
          type={type} 
          progress={progress}
          message={instance?.loadingState?.message}
        />
      </div>
    );
  }
  
  // Prepare props for the specific component
  const componentProps = React.useMemo(() => {
    const baseProps = {
      className,
      active,
      onLoad,
      onError,
      ...htmlProps,
    };
    
    switch (type) {
      case 'video':
        return {
          ...baseProps,
          video,
          controls,
          onEnd,
        };
      
      case 'playcanvas':
        return {
          ...baseProps,
          playcanvas,
          onSceneReady,
          onUserInteraction,
        };
      
      case 'ar':
        return {
          ...baseProps,
          ar,
          isOpen,
          onClose,
          onVideoStateChange,
        };
      
      default:
        return baseProps;
    }
  }, [type, className, active, video, playcanvas, ar, controls, isOpen, onClose, onVideoStateChange, onLoad, onError, onEnd, onSceneReady, onUserInteraction, htmlProps]);
  
  return (
    <div className={`media-player media-player--${type} ${className}`}>
      <Suspense 
        fallback={
          <MediaPlayerLoading 
            type={type} 
            message="Loading component..."
          />
        }
      >
        <Component {...componentProps} />
      </Suspense>
    </div>
  );
});

MediaPlayer.displayName = 'MediaPlayer';

/**
 * Specialized MediaPlayer components for convenience
 */
export const VideoPlayer = forwardRef<MediaPlayerRef, Omit<MediaPlayerProps, 'type'>>((props, ref) => (
  <MediaPlayer ref={ref} type="video" {...props} />
));

VideoPlayer.displayName = 'VideoPlayer';

export const PlayCanvasPlayer = forwardRef<MediaPlayerRef, Omit<MediaPlayerProps, 'type'>>((props, ref) => (
  <MediaPlayer ref={ref} type="playcanvas" {...props} />
));

PlayCanvasPlayer.displayName = 'PlayCanvasPlayer';

export const ARPlayer = forwardRef<MediaPlayerRef, Omit<MediaPlayerProps, 'type'>>((props, ref) => (
  <MediaPlayer ref={ref} type="ar" {...props} />
));

ARPlayer.displayName = 'ARPlayer';

export default MediaPlayer;