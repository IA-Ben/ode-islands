export interface CDNConfig {
  baseUrl: string;
  videoPath: string;
  thumbnailPath: string;
}

const CDN_CONFIGS: Record<string, CDNConfig> = {
  gcs: {
    baseUrl: 'https://storage.googleapis.com/ode-islands-video-cdn',
    videoPath: '/videos',
    thumbnailPath: '/videos'
  },
  custom: {
    baseUrl: process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.odeislands.com',
    videoPath: '/videos',
    thumbnailPath: '/videos'
  }
};

const CDN_PROVIDER = (process.env.NEXT_PUBLIC_CDN_PROVIDER || 'gcs') as keyof typeof CDN_CONFIGS;

export const getCDNConfig = (): CDNConfig => {
  return CDN_CONFIGS[CDN_PROVIDER] || CDN_CONFIGS.gcs;
};

export const getVideoUrl = (videoId: string, orientation?: 'landscape' | 'portrait'): string => {
  const config = getCDNConfig();
  
  // If orientation is specified, use the appropriate path
  if (orientation === 'portrait') {
    return `${config.baseUrl}${config.videoPath}/${videoId}/portrait/manifest/master.m3u8`;
  } else if (orientation === 'landscape') {
    return `${config.baseUrl}${config.videoPath}/${videoId}/landscape/manifest/master.m3u8`;
  }
  
  // Default: legacy path for backward compatibility (non-16:9 videos)
  return `${config.baseUrl}${config.videoPath}/${videoId}/manifest/master.m3u8`;
};

export const getThumbnailUrl = (videoId: string, type: 'poster' | 'preview' = 'poster', orientation?: 'landscape' | 'portrait'): string => {
  const config = getCDNConfig();
  
  // If orientation is specified, use the appropriate path for dual-orientation videos
  if (orientation === 'portrait') {
    return `${config.baseUrl}${config.thumbnailPath}/${videoId}/portrait/thumbnails/${type}.jpg`;
  } else if (orientation === 'landscape') {
    return `${config.baseUrl}${config.thumbnailPath}/${videoId}/landscape/thumbnails/${type}.jpg`;
  }
  
  // Default: legacy path for backward compatibility
  return `${config.baseUrl}${config.thumbnailPath}/${videoId}/thumbnails/${type}.jpg`;
};
