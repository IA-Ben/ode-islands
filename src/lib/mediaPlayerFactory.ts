/**
 * Media Player Factory
 * 
 * Factory system for creating appropriate media player instances based on type and configuration.
 * Provides unified instantiation while preserving specialized functionality for each media type.
 */

import React from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';
import {
  MediaPlayerConfig,
  VideoMediaConfig,
  PlayCanvasMediaConfig,
  ARMediaConfig,
  MediaError,
  MediaLoadingState,
  MediaControls,
  DeviceProfile,
  getDeviceProfile,
  getOptimizedConfig,
  validateMediaConfig,
} from '@/utils/mediaPlayerConfig';
import { getConfig } from '@/lib/config';

// Lazy imports for performance optimization
const Player = React.lazy(() => import('@/components/Player'));
const PlayCanvasViewer = React.lazy(() => import('@/components/PlayCanvasViewer'));
const ARViewer = React.lazy(() => import('@/components/ARViewer'));

/**
 * Player instance interface that all media players must implement
 */
export interface MediaPlayerInstance {
  type: 'video' | 'playcanvas' | 'ar';
  component: ComponentType<any> | LazyExoticComponent<ComponentType<any>>;
  config: MediaPlayerConfig;
  deviceProfile: DeviceProfile;
  controls?: MediaControls;
  loadingState?: MediaLoadingState;
  error?: MediaError;
  
  // Lifecycle methods
  initialize?: () => Promise<void>;
  cleanup?: () => void;
  retry?: () => void;
  
  // State methods
  getState?: () => Record<string, unknown>;
  setState?: (state: Record<string, unknown>) => void;
}

/**
 * Video player instance implementation
 */
class VideoPlayerInstance implements MediaPlayerInstance {
  type = 'video' as const;
  component = Player;
  config: VideoMediaConfig;
  deviceProfile: DeviceProfile;
  controls?: MediaControls;
  loadingState?: MediaLoadingState;
  error?: MediaError;
  
  private videoRef?: HTMLVideoElement;
  private hlsInstance?: any;
  
  constructor(config: VideoMediaConfig, deviceProfile: DeviceProfile) {
    this.config = config;
    this.deviceProfile = deviceProfile;
    this.setupControls();
  }
  
  private setupControls() {
    this.controls = {
      play: () => {
        if (this.videoRef && this.videoRef.paused) {
          this.videoRef.play().catch(console.error);
        }
      },
      pause: () => {
        if (this.videoRef && !this.videoRef.paused) {
          this.videoRef.pause();
        }
      },
      stop: () => {
        if (this.videoRef) {
          this.videoRef.pause();
          this.videoRef.currentTime = 0;
        }
      },
      seek: (time: number) => {
        if (this.videoRef) {
          this.videoRef.currentTime = time;
        }
      },
      setVolume: (volume: number) => {
        if (this.videoRef) {
          this.videoRef.volume = Math.max(0, Math.min(1, volume));
        }
      },
      toggleFullscreen: () => {
        if (this.videoRef && document.fullscreenEnabled) {
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            this.videoRef.requestFullscreen().catch(console.error);
          }
        }
      },
      reset: () => {
        this.cleanup();
        this.initialize();
      },
      getState: () => ({
        currentTime: this.videoRef?.currentTime || 0,
        duration: this.videoRef?.duration || 0,
        paused: this.videoRef?.paused || true,
        volume: this.videoRef?.volume || 1,
        muted: this.videoRef?.muted || false,
      }),
    };
  }
  
  async initialize() {
    this.loadingState = {
      isLoading: true,
      progress: 0,
      stage: 'initializing',
      message: 'Initializing video player...',
    };
  }
  
  cleanup() {
    if (this.hlsInstance) {
      this.hlsInstance.destroy();
      this.hlsInstance = null;
    }
    this.videoRef = undefined;
  }
  
  retry() {
    this.cleanup();
    this.initialize();
  }
  
  getState() {
    return this.controls?.getState?.() || {};
  }
  
  setState(state: Record<string, unknown>) {
    if (state.videoRef) {
      this.videoRef = state.videoRef as HTMLVideoElement;
    }
    if (state.hlsInstance) {
      this.hlsInstance = state.hlsInstance;
    }
  }
}

/**
 * PlayCanvas player instance implementation
 */
class PlayCanvasPlayerInstance implements MediaPlayerInstance {
  type = 'playcanvas' as const;
  component = PlayCanvasViewer;
  config: PlayCanvasMediaConfig;
  deviceProfile: DeviceProfile;
  controls?: MediaControls;
  loadingState?: MediaLoadingState;
  error?: MediaError;
  
  private app?: any;
  private scene?: any;
  
  constructor(config: PlayCanvasMediaConfig, deviceProfile: DeviceProfile) {
    this.config = config;
    this.deviceProfile = deviceProfile;
    this.setupControls();
  }
  
  private setupControls() {
    this.controls = {
      play: () => {
        if (this.app && !this.app.enabled) {
          this.app.start();
        }
      },
      pause: () => {
        if (this.app && this.app.enabled) {
          this.app.enabled = false;
        }
      },
      stop: () => {
        if (this.app) {
          this.app.enabled = false;
        }
      },
      reset: () => {
        this.cleanup();
        this.initialize();
      },
      getState: () => ({
        isRunning: this.app?.enabled || false,
        fps: this.app?.stats?.frame?.fps || 0,
        drawCalls: this.app?.stats?.frame?.drawCalls || 0,
      }),
    };
  }
  
  async initialize() {
    this.loadingState = {
      isLoading: true,
      progress: 0,
      stage: 'initializing',
      message: 'Initializing PlayCanvas engine...',
    };
  }
  
  cleanup() {
    if (this.app) {
      this.app.destroy();
      this.app = null;
    }
    this.scene = null;
  }
  
  retry() {
    this.cleanup();
    this.initialize();
  }
  
  getState() {
    return this.controls?.getState?.() || {};
  }
  
  setState(state: Record<string, unknown>) {
    if (state.app) {
      this.app = state.app;
    }
    if (state.scene) {
      this.scene = state.scene;
    }
  }
}

/**
 * AR player instance implementation
 */
class ARPlayerInstance implements MediaPlayerInstance {
  type = 'ar' as const;
  component = ARViewer;
  config: ARMediaConfig;
  deviceProfile: DeviceProfile;
  controls?: MediaControls;
  loadingState?: MediaLoadingState;
  error?: MediaError;
  
  private arSession?: any;
  private models: Map<string, any> = new Map();
  
  constructor(config: ARMediaConfig, deviceProfile: DeviceProfile) {
    this.config = config;
    this.deviceProfile = deviceProfile;
    this.setupControls();
  }
  
  private setupControls() {
    this.controls = {
      play: () => {
        // AR typically starts immediately when opened
        if (this.config.isOpen) {
          this.startARSession();
        }
      },
      pause: () => {
        // Pause AR tracking if supported
        if (this.arSession && this.arSession.pause) {
          this.arSession.pause();
        }
      },
      stop: () => {
        this.stopARSession();
      },
      reset: () => {
        this.cleanup();
        this.initialize();
      },
      getState: () => ({
        isActive: this.config.isOpen,
        hasSession: !!this.arSession,
        modelsLoaded: this.models.size,
      }),
    };
  }
  
  private startARSession() {
    // Implementation depends on AR framework
    // This is a placeholder for the actual AR session logic
  }
  
  private stopARSession() {
    if (this.arSession) {
      this.arSession.end?.();
      this.arSession = null;
    }
  }
  
  async initialize() {
    this.loadingState = {
      isLoading: true,
      progress: 0,
      stage: 'initializing',
      message: 'Initializing AR system...',
    };
    
    // Check AR compatibility
    if (!this.deviceProfile.enableAR) {
      this.error = {
        type: 'device',
        message: 'AR is not supported on this device',
        recoverable: false,
        retryable: false,
      };
      return;
    }
  }
  
  cleanup() {
    this.stopARSession();
    this.models.clear();
  }
  
  retry() {
    this.cleanup();
    this.initialize();
  }
  
  getState() {
    return this.controls?.getState?.() || {};
  }
  
  setState(state: Record<string, unknown>) {
    if (state.arSession) {
      this.arSession = state.arSession;
    }
    if (state.models) {
      this.models = state.models as Map<string, any>;
    }
  }
}

/**
 * Media Player Factory
 */
export class MediaPlayerFactory {
  private static instances = new Map<string, MediaPlayerInstance>();
  private static instanceCounter = 0;
  
  /**
   * Create a media player instance
   */
  static async createPlayer(
    config: MediaPlayerConfig,
    isMobile: boolean,
    shouldReduceAnimations: boolean,
    connectionType?: string
  ): Promise<MediaPlayerInstance> {
    // Validate configuration
    if (!validateMediaConfig(config)) {
      throw new Error(`Invalid media configuration for type: ${config.type}`);
    }
    
    // Get device profile
    const deviceProfile = getDeviceProfile(isMobile, shouldReduceAnimations, connectionType);
    
    // Get optimized configuration
    const appConfig = getConfig();
    const optimizedConfig = getOptimizedConfig(config, appConfig, deviceProfile);
    
    // Create instance based on type
    let instance: MediaPlayerInstance;
    
    switch (optimizedConfig.type) {
      case 'video':
        instance = new VideoPlayerInstance(
          optimizedConfig as VideoMediaConfig,
          deviceProfile
        );
        break;
      
      case 'playcanvas':
        instance = new PlayCanvasPlayerInstance(
          optimizedConfig as PlayCanvasMediaConfig,
          deviceProfile
        );
        break;
      
      case 'ar':
        instance = new ARPlayerInstance(
          optimizedConfig as ARMediaConfig,
          deviceProfile
        );
        break;
      
      default:
        throw new Error(`Unsupported media type: ${(optimizedConfig as any).type}`);
    }
    
    // Initialize the instance
    try {
      await instance.initialize?.();
    } catch (error) {
      console.error('Failed to initialize media player:', error);
      instance.error = {
        type: 'unknown',
        message: error instanceof Error ? error.message : 'Unknown initialization error',
        recoverable: true,
        retryable: true,
      };
    }
    
    // Store instance for tracking and cleanup
    const instanceId = `${optimizedConfig.type}_${++this.instanceCounter}`;
    this.instances.set(instanceId, instance);
    
    return instance;
  }
  
  /**
   * Get all active instances
   */
  static getActiveInstances(): MediaPlayerInstance[] {
    return Array.from(this.instances.values());
  }
  
  /**
   * Get instances by type
   */
  static getInstancesByType(type: 'video' | 'playcanvas' | 'ar'): MediaPlayerInstance[] {
    return Array.from(this.instances.values()).filter(instance => instance.type === type);
  }
  
  /**
   * Cleanup instance
   */
  static destroyInstance(instance: MediaPlayerInstance) {
    // Find and remove instance
    for (const [id, storedInstance] of this.instances.entries()) {
      if (storedInstance === instance) {
        storedInstance.cleanup?.();
        this.instances.delete(id);
        break;
      }
    }
  }
  
  /**
   * Cleanup all instances
   */
  static destroyAllInstances() {
    for (const instance of this.instances.values()) {
      instance.cleanup?.();
    }
    this.instances.clear();
  }
  
  /**
   * Get factory statistics
   */
  static getStats() {
    const instances = Array.from(this.instances.values());
    const byType = instances.reduce((acc, instance) => {
      acc[instance.type] = (acc[instance.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalInstances: instances.length,
      byType,
      memoryUsage: this.getEstimatedMemoryUsage(),
    };
  }
  
  /**
   * Get estimated memory usage
   */
  private static getEstimatedMemoryUsage() {
    // Rough estimation based on instance types
    const instances = Array.from(this.instances.values());
    return instances.reduce((total, instance) => {
      switch (instance.type) {
        case 'video':
          return total + 10; // ~10MB for video buffers
        case 'playcanvas':
          return total + 50; // ~50MB for 3D assets
        case 'ar':
          return total + 30; // ~30MB for AR models
        default:
          return total;
      }
    }, 0);
  }
  
  /**
   * Perform memory cleanup based on thresholds
   */
  static performMemoryCleanup(maxMemoryMB = 200) {
    const currentUsage = this.getEstimatedMemoryUsage();
    
    if (currentUsage > maxMemoryMB) {
      // Cleanup oldest instances first
      const instances = Array.from(this.instances.entries())
        .sort(([, a], [, b]) => {
          // Simple heuristic: prioritize cleaning up non-active players
          const aActive = a.config.active;
          const bActive = b.config.active;
          
          if (aActive && !bActive) return 1;
          if (!aActive && bActive) return -1;
          return 0;
        });
      
      for (const [id, instance] of instances) {
        if (!instance.config.active) {
          this.instances.delete(id);
          instance.cleanup?.();
          
          // Check if we're under threshold
          if (this.getEstimatedMemoryUsage() <= maxMemoryMB * 0.8) {
            break;
          }
        }
      }
    }
  }
}

export default MediaPlayerFactory;