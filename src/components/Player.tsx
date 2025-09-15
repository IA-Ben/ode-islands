"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { getConfig } from '@/lib/config';
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

const Player: React.FC<PlayerProps> = ({ video, active, onEnd, ...props }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrlRef = useRef<string>("");
  const hlsRef = useRef<Hls | null>(null);
  const retryCountRef = useRef<number>(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const videoListenersCleanupRef = useRef<(() => void) | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const cdnUrl = getConfig().cdnUrl;
  const { getVideoQuality, shouldReduceAnimations, isMobile } = useMobile();
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000;
  
  // Handle both full URLs and identifiers - NO URL rewriting for quality
  let videoUrl: string | null = null;
  if (video?.url) {
    if (video.url.startsWith('http')) {
      // It's already a full URL, add master.m3u8
      videoUrl = `${video.url}/master.m3u8`;
    } else {
      // It's an identifier, construct the full URL
      videoUrl = `${cdnUrl}/vid/${video.url}/master.m3u8`;
    }
  }
  
  // const posterUrl = videoUrl?.replace("/master.m3u8", "/poster.jpg") || "";

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
      loadVideo(url);
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
    
    if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS support (Safari)
      videoEl.src = url;
    } else if (Hls.isSupported()) {
      // Adjust HLS configuration based on mobile and data saver settings
      const hlsConfig: any = {
        enableWorker: true,
        lowLatencyMode: false,
        autoStartLoad: true,
        startFragPrefetch: !isMobile, // Reduce prefetching on mobile
        capLevelToPlayerSize: true
      };
      
      if (isMobile || shouldReduceAnimations) {
        // Mobile-optimized settings
        hlsConfig.backBufferLength = 30;
        hlsConfig.maxBufferLength = 60;
        hlsConfig.maxMaxBufferLength = 300;
        hlsConfig.maxBufferSize = 30 * 1000 * 1000;
        hlsConfig.maxBufferHole = 1;
        hlsConfig.fpsDroppedMonitoringPeriod = 10000;
        hlsConfig.fpsDroppedMonitoringThreshold = 0.3;
      } else {
        // Desktop settings
        hlsConfig.backBufferLength = 90;
        hlsConfig.maxBufferLength = 120;
        hlsConfig.maxMaxBufferLength = 600;
        hlsConfig.maxBufferSize = 60 * 1000 * 1000;
        hlsConfig.maxBufferHole = 0.5;
        hlsConfig.fpsDroppedMonitoringPeriod = 5000;
        hlsConfig.fpsDroppedMonitoringThreshold = 0.2;
      }
      
      const hls = new Hls(hlsConfig);
      
      hlsRef.current = hls;
      
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
    } else {
      console.error("HLS not supported in this browser");
      setHasError(true);
      setIsLoading(false);
    }
  }, [cleanupVideo, retryVideoLoad]);

  // Load HLS video once when url updates
  useEffect(() => {
    if (!active) {
      // Force fresh initialization when becoming inactive
      videoUrlRef.current = "";
      cleanupVideo();
      return;
    }
    
    const videoEl = videoRef.current;
    if (!videoEl || !videoUrl) return;
    
    // Only skip if the same video is already loaded and playing
    if (videoUrl === videoUrlRef.current && !videoEl.paused && !videoEl.ended && !hasError) return;
    
    videoUrlRef.current = videoUrl || "";
    loadVideo(videoUrl);
  }, [videoUrl, active, loadVideo, cleanupVideo, hasError]);

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
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm">
          <div className="flex items-center space-x-2 text-white">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm">Loading video...</span>
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
