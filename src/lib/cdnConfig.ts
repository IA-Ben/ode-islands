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

export const getVideoUrl = (videoId: string): string => {
  const config = getCDNConfig();
  return `${config.baseUrl}${config.videoPath}/${videoId}/manifest/master.m3u8`;
};

export const getThumbnailUrl = (videoId: string, type: 'poster' | 'preview' = 'poster'): string => {
  const config = getCDNConfig();
  return `${config.baseUrl}${config.thumbnailPath}/${videoId}/thumbnails/${type}.jpg`;
};
