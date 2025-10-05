'use client';

import { VideoElement } from '@/../../shared/cardTypes';
import { useState, useEffect } from 'react';

interface VideoElementRendererProps {
  element: VideoElement;
}

async function getMediaAssetUrl(mediaAssetId: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/cms/media/${mediaAssetId}`);
    if (!response.ok) return null;
    const asset = await response.json();
    return asset.cloudUrl || asset.url;
  } catch (error) {
    console.error('Error fetching media asset:', error);
    return null;
  }
}

export function VideoElementRenderer({ element }: VideoElementRendererProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const { src, poster, autoplay, loop, muted, controls, mediaAssetId } = element.properties;
  
  useEffect(() => {
    if (mediaAssetId) {
      getMediaAssetUrl(mediaAssetId).then(setVideoUrl);
    } else if (src) {
      setVideoUrl(src);
    }
  }, [mediaAssetId, src]);
  
  if (!videoUrl) {
    return (
      <div className="bg-gray-200 rounded flex items-center justify-center h-48">
        <span className="text-gray-500">No video selected</span>
      </div>
    );
  }
  
  return (
    <video
      src={videoUrl}
      poster={poster}
      autoPlay={autoplay}
      loop={loop}
      muted={muted}
      controls={controls}
      className="w-full rounded"
    >
      Your browser does not support the video tag.
    </video>
  );
}
