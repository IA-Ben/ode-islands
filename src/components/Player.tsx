"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { getVideoUrl } from '@/lib/cdnConfig';
import { useMobile } from '@/contexts/MobileContext';

interface PlayerProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  video: {
    url: string;
    width: number;
    height: number;
    audio?: boolean;
    audioMuted?: boolean;
    controls?: boolean;
  };
  active?: boolean;
  className?: string;
  onEnd?: () => void;
}

const isHLSUrl = (url: string): boolean => {
  return url.includes('.m3u8') || url.includes('/manifest/');
};

const Player: React.FC<PlayerProps> = ({ video, active, onEnd, ...props }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrlRef = useRef<string>("");
  const hlsRef = useRef<Hls | null>(null);
  const retryCountRef = useRef<number>(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const videoListenersCleanupRef = useRef<(() => void) | null>(null);
  const bufferCleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const bandwidthSamplesRef = useRef<number[]>([]);
  const loadVideoRef = useRef<((url: string) => void) | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [transcodingStatus, setTranscodingStatus] = useState<'checking' | 'ready' | 'processing' | 'error'>('checking');
  const statusCheckStartTimeRef = useRef<number>(0);
  const hasCheckedStatusRef = useRef<string>('');
  const { getVideoQuality, shouldReduceAnimations, isMobile } = useMobile();
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000;
  const BASE_BUFFER_CLEANUP_INTERVAL = 30 * 1000; // 30 seconds base interval
  const lastBufferSizeRef = useRef<number>(0);
  const STATUS_CHECK_TIMEOUT = 90000;
  
  // Handle both full URLs and identifiers - NO URL rewriting for quality
  let videoUrl: string | null = null;
  if (video?.url) {
    if (video.url.startsWith('http')) {
      // It's already a full URL, use as-is
      videoUrl = video.url;
    } else {
      // It's an identifier, use the helper function
      videoUrl = getVideoUrl(video.url);
    }
  }
  
  // const posterUrl = videoUrl?.replace("/master.m3u8", "/poster.jpg") || "";

  // Measure bandwidth and adjust buffer dynamically
  const measureBandwidth = useCallback((bandwidth: number) => {
    bandwidthSamplesRef.current.push(bandwidth);
    if (bandwidthSamplesRef.current.length > 10) {
      bandwidthSamplesRef.current.shift();
    }
  }, []);

  const getAverageBandwidth = useCallback((): number => {
    if (bandwidthSamplesRef.current.length === 0) return 5000;
    const sum = bandwidthSamplesRef.current.reduce((a, b) => a + b, 0);
    return sum / bandwidthSamplesRef.current.length;
  }, []);

  const getDynamicBufferConfig = useCallback(() => {
    const samples = bandwidthSamplesRef.current;
    const avgBandwidth = samples.length === 0 ? 5000 : samples.reduce((a, b) => a + b, 0) / samples.length;
    
    if (avgBandwidth < 1000) {
      return {
        backBufferLength: 15,
        maxBufferLength: 30,
        maxMaxBufferLength: 120,
        maxBufferSize: 15 * 1000 * 1000,
        maxBufferHole: 2
      };
    } else if (avgBandwidth < 3000) {
      return {
        backBufferLength: 30,
        maxBufferLength: 60,
        maxMaxBufferLength: 240,
        maxBufferSize: 30 * 1000 * 1000,
        maxBufferHole: 1.5
      };
    } else if (avgBandwidth < 5000) {
      return {
        backBufferLength: 60,
        maxBufferLength: 90,
        maxMaxBufferLength: 360,
        maxBufferSize: 45 * 1000 * 1000,
        maxBufferHole: 1
      };
    } else {
      return {
        backBufferLength: 90,
        maxBufferLength: 120,
        maxMaxBufferLength: 600,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.5
      };
    }
  }, []);

  const checkTranscodingStatusRef = useRef<((videoId: string, retryCount?: number) => Promise<void>) | null>(null);
  
  checkTranscodingStatusRef.current = async (videoId: string, retryCount: number = 0): Promise<void> => {
    if (Date.now() - statusCheckStartTimeRef.current > STATUS_CHECK_TIMEOUT) {
      console.log('Status check timeout - assuming video is ready');
      setTranscodingStatus('ready');
      return;
    }

    try {
      const response = await fetch(`/api/video-status/${videoId}`);
      const data = await response.json();
      console.log(`Video status for ${videoId}:`, data);
      
      if (data.status === 'completed' || data.status === 'ready') {
        setTranscodingStatus('ready');
      } else if (data.status === 'processing') {
        setTranscodingStatus('processing');
        const delay = Math.min(5000, 1000 * Math.pow(1.5, retryCount));
        setTimeout(() => {
          if (checkTranscodingStatusRef.current) {
            checkTranscodingStatusRef.current(videoId, retryCount + 1);
          }
        }, delay);
      } else {
        setTranscodingStatus('error');
      }
    } catch (err) {
      console.error('Status check error:', err);
      setTranscodingStatus('ready');
    }
  };

  // Smart buffer cleanup with dynamic thresholds and HLS.js API
  const cleanupBuffer = useCallback(() => {
    if (hlsRef.current && hlsRef.current.media) {
      const hls = hlsRef.current;
      const media = hls.media;
      if (!media) return;
      
      const currentTime = media.currentTime;
      const buffered = media.buffered;
      
      if (buffered.length > 0) {
        const bufferStart = buffered.start(0);
        const bufferEnd = buffered.end(buffered.length - 1);
        const totalBufferSize = bufferEnd - bufferStart;
        const forwardBuffer = bufferEnd - currentTime;
        const backBuffer = currentTime - bufferStart;
        
        // Dynamic thresholds based on bandwidth
        const avgBandwidth = getAverageBandwidth();
        const backBufferThreshold = isMobile ? 30 : (avgBandwidth > 5000 ? 90 : 60);
        const forwardBufferThreshold = isMobile ? 120 : (avgBandwidth > 5000 ? 300 : 180);
        
        // Log buffer state
        console.log(`Buffer state: back=${backBuffer.toFixed(1)}s, forward=${forwardBuffer.toFixed(1)}s, total=${totalBufferSize.toFixed(1)}s`);
        
        try {
          // Cleanup back buffer if exceeds threshold using HLS.js bufferController
          if (backBuffer > backBufferThreshold && currentTime > backBufferThreshold) {
            const targetEnd = currentTime - backBufferThreshold;
            
            if (targetEnd > 0 && bufferStart < targetEnd) {
              console.log(`Removing back buffer: 0s to ${targetEnd.toFixed(1)}s`);
              
              try {
                // Use HLS.js buffer controller to remove buffered data
                const bufferController = (hls as any).bufferController;
                if (bufferController && typeof bufferController.removeBuffer === 'function') {
                  // Remove video buffer
                  bufferController.removeBuffer(0, targetEnd, 'video');
                  console.log('Back buffer removed via bufferController');
                } else {
                  // Fallback: adjust backBufferLength config to trigger automatic cleanup
                  hls.config.backBufferLength = Math.max(10, backBufferThreshold / 2);
                  console.log(`Adjusted backBufferLength to ${hls.config.backBufferLength}s for cleanup`);
                }
              } catch (e) {
                console.error('Buffer cleanup failed:', e);
              }
            }
          }
          
          // Cleanup forward buffer if too large (memory pressure)
          if (forwardBuffer > forwardBufferThreshold) {
            console.log(`Forward buffer too large (${forwardBuffer.toFixed(1)}s), applying restrictions`);
            
            // Reduce quality to prevent excessive buffering
            if (hls.autoLevelEnabled && hls.currentLevel > 0) {
              hls.nextLoadLevel = Math.max(0, hls.currentLevel - 1);
              console.log(`Reducing quality from level ${hls.currentLevel} to ${hls.nextLoadLevel}`);
            }
            
            // Aggressively limit forward buffer
            const targetMaxBuffer = forwardBufferThreshold / 2;
            hls.config.maxBufferLength = Math.min(hls.config.maxBufferLength, targetMaxBuffer);
            hls.config.maxMaxBufferLength = Math.min(hls.config.maxMaxBufferLength, targetMaxBuffer * 2);
            
            console.log(`Limited buffer: maxBufferLength=${hls.config.maxBufferLength}s`);
          } else {
            // Restore normal buffer config when buffer is healthy
            const dynamicConfig = getDynamicBufferConfig();
            hls.config.maxBufferLength = dynamicConfig.maxBufferLength;
            hls.config.maxMaxBufferLength = dynamicConfig.maxMaxBufferLength;
          }
        } catch (err) {
          console.error('Buffer cleanup error:', err);
        }
      }
    }
  }, [isMobile, getAverageBandwidth]);

  // Enhanced cleanup function
  const cleanupVideo = useCallback((preserveRetryCount = false) => {
    const videoEl = videoRef.current;
    if (videoEl) {
      videoEl.src = "";
      videoEl.load(); // Force reload to clear any cached data
    }
    
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    if (bufferCleanupIntervalRef.current) {
      clearTimeout(bufferCleanupIntervalRef.current);
      clearInterval(bufferCleanupIntervalRef.current);
      bufferCleanupIntervalRef.current = null;
    }
    
    // Clean up video event listeners
    if (videoListenersCleanupRef.current) {
      videoListenersCleanupRef.current();
      videoListenersCleanupRef.current = null;
    }
    
    // Only reset retry count if not preserving it (for full cleanup, not reloads)
    if (!preserveRetryCount) {
      retryCountRef.current = 0;
    }
    setIsLoading(false);
    setHasError(false);
  }, []);

  // Enhanced retry logic with exponential backoff  
  const retryVideoLoad = useCallback((url: string) => {
    if (retryCountRef.current >= MAX_RETRIES) {
      console.error(`Failed to load video after ${MAX_RETRIES} attempts:`, url);
      setHasError(true);
      setIsLoading(false);
      return;
    }
    
    // Destroy HLS instance immediately to free resources before retry
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    
    retryCountRef.current++;
    const delay = RETRY_DELAY * Math.pow(2, retryCountRef.current - 1); // Exponential backoff
    
    console.log(`Retrying video load (attempt ${retryCountRef.current}/${MAX_RETRIES}) in ${delay}ms`);
    
    retryTimeoutRef.current = setTimeout(() => {
      if (loadVideoRef.current) {
        loadVideoRef.current(url);
      }
    }, delay);
  }, []);

  // Enhanced video loading with error recovery
  const loadVideo = useCallback((url: string) => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    
    // Clear any existing source first (preserve retry count during reload)
    cleanupVideo(true);
    
    setIsLoading(true);
    setHasError(false);
    
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => {
      setIsLoading(false);
      retryCountRef.current = 0; // Reset retry count on success
    };
    const handleError = (e: Event) => {
      console.error("Video load error:", e);
      retryVideoLoad(url);
    };
    
    // Add event listeners for loading states
    videoEl.addEventListener('loadstart', handleLoadStart);
    videoEl.addEventListener('canplay', handleCanPlay);
    videoEl.addEventListener('error', handleError);
    
    // Store cleanup function in ref so it can be called later
    videoListenersCleanupRef.current = () => {
      videoEl.removeEventListener('loadstart', handleLoadStart);
      videoEl.removeEventListener('canplay', handleCanPlay);
      videoEl.removeEventListener('error', handleError);
    };
    
    const isHLS = isHLSUrl(url);
    
    if (isHLS && Hls.isSupported()) {
      // Adjust HLS configuration based on mobile and data saver settings
      const hlsConfig: any = {
        enableWorker: true,
        lowLatencyMode: false,
        autoStartLoad: true,
        startFragPrefetch: !isMobile,
        capLevelToPlayerSize: true,
        backBufferLength: isMobile ? 30 : 90,
        maxBufferLength: isMobile ? 60 : 120,
        maxMaxBufferLength: isMobile ? 300 : 600,
        maxBufferSize: isMobile ? 30 * 1000 * 1000 : 60 * 1000 * 1000,
        maxBufferHole: isMobile ? 2 : 0.5,
        fpsDroppedMonitoringPeriod: isMobile ? 10000 : 5000,
        fpsDroppedMonitoringThreshold: isMobile ? 0.3 : 0.2
      };
      
      const hls = new Hls(hlsConfig);
      
      hlsRef.current = hls;
      
      // Measure bandwidth for adaptive buffer sizing
      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        const currentLevel = hls.levels[data.level];
        if (currentLevel && currentLevel.bitrate) {
          measureBandwidth(currentLevel.bitrate / 1000);
        }
      });
      
      // Set up adaptive buffer cleanup with dynamic intervals
      const scheduleNextCleanup = () => {
        const media = hls.media;
        if (!media) return;
        
        const buffered = media.buffered;
        let nextInterval = BASE_BUFFER_CLEANUP_INTERVAL;
        
        if (buffered.length > 0) {
          const bufferStart = buffered.start(0);
          const bufferEnd = buffered.end(buffered.length - 1);
          const totalBufferSize = bufferEnd - bufferStart;
          lastBufferSizeRef.current = totalBufferSize;
          
          // Adaptive interval: cleanup more frequently when buffer is large
          if (totalBufferSize > 300) {
            nextInterval = 15 * 1000; // Every 15s for very large buffers
          } else if (totalBufferSize > 180) {
            nextInterval = 30 * 1000; // Every 30s for large buffers
          } else if (totalBufferSize > 90) {
            nextInterval = 60 * 1000; // Every 60s for medium buffers
          } else {
            nextInterval = 120 * 1000; // Every 2min for small buffers
          }
        }
        
        bufferCleanupIntervalRef.current = setTimeout(() => {
          cleanupBuffer();
          scheduleNextCleanup(); // Schedule next cleanup
        }, nextInterval);
      };
      
      // Start the adaptive cleanup cycle
      scheduleNextCleanup();
      
      hls.on(Hls.Events.MANIFEST_LOADED, () => {
        console.log('HLS manifest loaded successfully');
        
        // Apply quality capping based on data saver mode AFTER manifest loads
        const quality = getVideoQuality();
        const levels = hls.levels;
        
        if (quality === '480p' && levels.length > 0) {
          // Cap to 480p or closest available
          const maxLevel = levels.findIndex(level => level.height <= 480);
          if (maxLevel !== -1) {
            hls.loadLevel = maxLevel;
            hls.autoLevelCapping = maxLevel;
            console.log(`Quality capped to 480p (level ${maxLevel})`);
          }
        } else if (quality === '720p' && levels.length > 0) {
          // Cap to 720p or closest available
          const maxLevel = levels.findIndex(level => level.height <= 720);
          if (maxLevel !== -1) {
            hls.loadLevel = maxLevel;
            hls.autoLevelCapping = maxLevel;
            console.log(`Quality capped to 720p (level ${maxLevel})`);
          }
        }
        // For 'auto' quality, let HLS decide (no capping)
      });
      
      hls.on(Hls.Events.LEVEL_LOADED, () => {
        setIsLoading(false);
        retryCountRef.current = 0;
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error("HLS error:", event, data);
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Fatal network error, attempting recovery...');
              retryVideoLoad(url);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Fatal media error, attempting recovery...');
              try {
                hls.recoverMediaError();
              } catch (err) {
                console.error('Media error recovery failed:', err);
                retryVideoLoad(url);
              }
              break;
            default:
              console.log('Fatal error, cannot recover');
              setHasError(true);
              setIsLoading(false);
              break;
          }
        }
      });
      
      hls.loadSource(url);
      hls.attachMedia(videoEl);
    } else if (isHLS && videoEl.canPlayType("application/vnd.apple.mpegurl")) {
      videoEl.src = url;
      
      // Safari native HLS - simpler periodic cleanup
      bufferCleanupIntervalRef.current = setInterval(() => {
        if (videoEl && videoEl.currentTime > 0) {
          const currentTime = videoEl.currentTime;
          const buffered = videoEl.buffered;
          
          if (buffered.length > 0) {
            const bufferEnd = buffered.end(buffered.length - 1);
            const bufferSize = bufferEnd - currentTime;
            console.log(`Safari buffer: ${bufferSize.toFixed(1)}s buffered`);
          }
        }
      }, BASE_BUFFER_CLEANUP_INTERVAL);
    } else if (!isHLS) {
      // Native HTML5 video playback for raw video files (.mp4, .webm, etc.)
      videoEl.src = url;
      videoEl.load();
      console.log('Using native HTML5 video playback for:', url);
    } else {
      console.error("HLS not supported in this browser");
      setHasError(true);
      setIsLoading(false);
    }
  }, [cleanupVideo, retryVideoLoad, isMobile, getVideoQuality, measureBandwidth, cleanupBuffer]);

  // Store loadVideo in ref to break circular dependency
  loadVideoRef.current = loadVideo;

  useEffect(() => {
    const currentVideoUrl = video?.url || '';
    
    if (hasCheckedStatusRef.current === currentVideoUrl) {
      return;
    }
    
    hasCheckedStatusRef.current = currentVideoUrl;
    
    setTranscodingStatus('ready');
  }, [video?.url]);

  useEffect(() => {
    if (!active) {
      videoUrlRef.current = "";
      cleanupVideo();
      return;
    }
    
    const videoEl = videoRef.current;
    if (!videoEl || !videoUrl) return;
    
    if (transcodingStatus !== 'ready') return;
    
    if (videoUrl === videoUrlRef.current && !videoEl.paused && !videoEl.ended && !hasError) return;
    
    videoUrlRef.current = videoUrl || "";
    loadVideo(videoUrl);
  }, [videoUrl, active, loadVideo, cleanupVideo, hasError, transcodingStatus]);

  // Enhanced play/pause with better error handling and autoplay policies
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    
    // Only attempt to play/pause if the video has a source loaded
    if (!videoEl.src || isLoading || hasError) return;
    
    if (active) {
      // Wait for the video to be ready before playing
      const attemptPlay = async () => {
        try {
          // Check if video is ready
          if (videoEl.readyState < 2) {
            // Wait for loadeddata event
            return new Promise((resolve, reject) => {
              const handleLoaded = () => {
                videoEl.removeEventListener('loadeddata', handleLoaded);
                videoEl.removeEventListener('error', handleError);
                resolve(undefined);
              };
              const handleError = () => {
                videoEl.removeEventListener('loadeddata', handleLoaded);
                videoEl.removeEventListener('error', handleError);
                reject(new Error('Video failed to load'));
              };
              videoEl.addEventListener('loadeddata', handleLoaded);
              videoEl.addEventListener('error', handleError);
            }).then(() => videoEl.play());
          } else {
            await videoEl.play();
          }
        } catch (err: unknown) {
          const error = err as Error;
          if (error.name === "NotAllowedError") {
            console.log("Autoplay blocked by browser policy. User interaction required.");
            // Could emit an event here for UI to show play button
          } else if (error.name === "AbortError") {
            // Play was interrupted, this is normal
            console.log("Video play was aborted");
          } else {
            console.error("Error playing video:", error);
            // Try to recover by reloading the video
            if (videoUrl) {
              retryVideoLoad(videoUrl);
            }
          }
        }
      };
      
      attemptPlay();
    } else {
      videoEl.pause();
    }
  }, [active, video?.url, isLoading, hasError, videoUrl, retryVideoLoad]);

  // Enhanced video end handling with better cleanup
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    
    const handleEnded = () => {
      if (!active) return;
      if (onEnd) {
        onEnd();
      }
      // Reset for potential replay
      videoEl.currentTime = 0;
    };
    
    const handleStalled = () => {
      console.log('Video stalled, checking connection...');
      if (videoUrl && active) {
        // Try to recover from stalled state
        setTimeout(() => {
          if (videoEl.readyState < 2) {
            console.log('Video still stalled, attempting reload...');
            retryVideoLoad(videoUrl);
          }
        }, 5000);
      }
    };
    
    const handleSuspend = () => {
      console.log('Video suspended by browser');
    };
    
    videoEl.addEventListener("ended", handleEnded);
    videoEl.addEventListener("stalled", handleStalled);
    videoEl.addEventListener("suspend", handleSuspend);
    
    return () => {
      videoEl.removeEventListener("ended", handleEnded);
      videoEl.removeEventListener("stalled", handleStalled);
      videoEl.removeEventListener("suspend", handleSuspend);
    };
  }, [active, onEnd, videoUrl, retryVideoLoad]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupVideo();
    };
  }, [cleanupVideo]);

  return (
    <div className="relative" style={{ width: video?.width, height: video?.height }}>
      <video
        ref={videoRef}
        // poster={posterUrl}
        playsInline
        muted={video?.audioMuted || !video?.audio}
        width={video?.width}
        height={video?.height}
        preload="metadata"
        crossOrigin="anonymous"
        {...props}
      />
      
      {/* Loading indicator */}
      {(isLoading || transcodingStatus === 'processing') && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm">
          <div className="flex items-center space-x-2 text-white">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm">
              {transcodingStatus === 'processing' ? 'Processing video...' : 'Loading video...'}
            </span>
          </div>
        </div>
      )}
      
      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-center text-white p-4">
            <div className="mb-2">
              <svg className="w-8 h-8 mx-auto text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm mb-2">Video failed to load</p>
            <button 
              onClick={() => videoUrl && loadVideo(videoUrl)}
              className="px-3 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded text-xs transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Player;
