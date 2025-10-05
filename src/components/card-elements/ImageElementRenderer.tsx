'use client';

import { ImageElement } from '@/../../shared/cardTypes';
import Image from 'next/image';
import { useState, useEffect } from 'react';

interface ImageElementRendererProps {
  element: ImageElement;
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

export function ImageElementRenderer({ element }: ImageElementRendererProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const { src, alt, width, height, objectFit, borderRadius, mediaAssetId } = element.properties;
  
  useEffect(() => {
    if (mediaAssetId) {
      getMediaAssetUrl(mediaAssetId).then(setImageUrl);
    } else if (src) {
      setImageUrl(src);
    }
  }, [mediaAssetId, src]);
  
  if (!imageUrl) {
    return (
      <div className="bg-gray-200 rounded flex items-center justify-center h-48">
        <span className="text-gray-500">No image selected</span>
      </div>
    );
  }
  
  return (
    <div className="relative" style={{ width: width || '100%', height: height || 'auto' }}>
      <Image
        src={imageUrl}
        alt={alt}
        width={800}
        height={600}
        className="w-full h-auto"
        style={{
          objectFit: objectFit,
          borderRadius: borderRadius ? `${borderRadius}px` : undefined,
        }}
      />
    </div>
  );
}
