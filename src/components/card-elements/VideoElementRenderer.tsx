'use client';

import { VideoElement } from '@/../../shared/cardTypes';

interface VideoElementRendererProps {
  element: VideoElement;
}

export function VideoElementRenderer({ element }: VideoElementRendererProps) {
  const { src, poster, autoplay, loop, muted, controls } = element.properties;
  
  if (!src) {
    return (
      <div className="bg-gray-200 rounded flex items-center justify-center h-48">
        <span className="text-gray-500">No video selected</span>
      </div>
    );
  }
  
  return (
    <video
      src={src}
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
