'use client';

import { ImageElement } from '@/../../shared/cardTypes';
import Image from 'next/image';

interface ImageElementRendererProps {
  element: ImageElement;
}

export function ImageElementRenderer({ element }: ImageElementRendererProps) {
  const { src, alt, width, height, objectFit, borderRadius, mediaAssetId } = element.properties;
  
  if (!src && !mediaAssetId) {
    return (
      <div className="bg-gray-200 rounded flex items-center justify-center h-48">
        <span className="text-gray-500">No image selected</span>
      </div>
    );
  }
  
  const imageUrl = src || '';
  
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
