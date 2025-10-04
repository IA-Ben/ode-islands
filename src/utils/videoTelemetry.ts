export interface VideoError {
  type: 'network' | 'media' | 'codec' | 'manifest' | 'other';
  message: string;
  url?: string;
  level?: number;
  timestamp: number;
}

export interface CodecCapability {
  h264Baseline: boolean;
  h264Main: boolean;
  h264High: boolean;
  aac: boolean;
  hlsNative: boolean;
  hlsJs: boolean;
}

const TELEMETRY_ENDPOINT = '/api/video-telemetry';

export const detectCodecSupport = (): CodecCapability => {
  if (typeof window === 'undefined') {
    return {
      h264Baseline: false,
      h264Main: false,
      h264High: false,
      aac: false,
      hlsNative: false,
      hlsJs: false
    };
  }

  const video = document.createElement('video');
  
  const capability: CodecCapability = {
    h264Baseline: video.canPlayType('video/mp4; codecs="avc1.42E01E"') !== '',
    h264Main: video.canPlayType('video/mp4; codecs="avc1.4D401E"') !== '',
    h264High: video.canPlayType('video/mp4; codecs="avc1.64001E"') !== '',
    aac: video.canPlayType('video/mp4; codecs="mp4a.40.2"') !== '',
    hlsNative: video.canPlayType('application/vnd.apple.mpegurl') !== '',
    hlsJs: typeof window !== 'undefined' && 'MediaSource' in window
  };

  // Cache in localStorage
  try {
    localStorage.setItem('codecCapability', JSON.stringify(capability));
    console.log('Codec support detected:', capability);
  } catch (e) {
    console.warn('Could not cache codec capability');
  }

  return capability;
};

export const getCachedCodecCapability = (): CodecCapability | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem('codecCapability');
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.warn('Could not read cached codec capability');
  }
  
  return null;
};

export const getCodecCapability = (): CodecCapability => {
  const cached = getCachedCodecCapability();
  if (cached) return cached;
  return detectCodecSupport();
};

export const logVideoError = async (error: VideoError): Promise<void> => {
  console.error('[Video Telemetry]', error);
  
  // Send to backend for monitoring (non-blocking)
  try {
    await fetch(TELEMETRY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...error,
        userAgent: navigator.userAgent,
        codecCapability: getCodecCapability(),
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        connection: (navigator as any).connection?.effectiveType || 'unknown'
      })
    }).catch(err => {
      console.warn('Failed to send telemetry:', err);
    });
  } catch (e) {
    // Silently fail telemetry
  }
};

export const getRecommendedQuality = (capability: CodecCapability): string => {
  if (!capability.h264High && !capability.h264Main && capability.h264Baseline) {
    // Only baseline support - limit to 360p
    return '360p';
  } else if (!capability.h264High && capability.h264Main) {
    // Main profile only - limit to 720p
    return '720p';
  }
  
  // Full support or unknown - allow auto
  return 'auto';
};
