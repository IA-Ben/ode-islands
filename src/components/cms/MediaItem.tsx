'use client';

import React from 'react';
import { MediaItem as MediaItemType } from '@/hooks/useMedia';

interface MediaItemProps {
  media: MediaItemType;
  selected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onClick: (media: MediaItemType) => void;
}

export function MediaItem({ media, selected, onSelect, onClick }: MediaItemProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
    if (fileType.startsWith('video/')) {
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    }
    if (fileType.startsWith('audio/')) {
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      );
    }
    return (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
  };

  const getTypeLabel = (fileType: string): string => {
    if (fileType.startsWith('image/')) return 'Image';
    if (fileType.startsWith('video/')) return 'Video';
    if (fileType.startsWith('audio/')) return 'Audio';
    return 'Document';
  };

  const getTypeBadgeColor = (fileType: string): string => {
    if (fileType.startsWith('image/')) return 'bg-blue-100 text-blue-700';
    if (fileType.startsWith('video/')) return 'bg-purple-100 text-purple-700';
    if (fileType.startsWith('audio/')) return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div
      className={`group relative bg-white rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
        selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
      }`}
    >
      <div
        className="cursor-pointer"
        onClick={() => onClick(media)}
      >
        <div className="aspect-square relative bg-gray-100 rounded-t-lg overflow-hidden">
          {media.thumbnailUrl ? (
            <img
              src={media.thumbnailUrl}
              alt={media.altText || media.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              {getFileIcon(media.fileType)}
            </div>
          )}
          
          <div className="absolute top-2 left-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect(media.id, !selected);
              }}
              className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                selected
                  ? 'bg-blue-600 border-blue-600'
                  : 'bg-white border-gray-300 hover:border-blue-400'
              }`}
              aria-label={selected ? 'Deselect item' : 'Select item'}
            >
              {selected && (
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="p-3">
          <h3 className="font-medium text-gray-900 truncate mb-1" title={media.title}>
            {media.title}
          </h3>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${getTypeBadgeColor(media.fileType)}`}>
              {getTypeLabel(media.fileType)}
            </span>
            <span>{formatFileSize(media.fileSize)}</span>
          </div>
          
          {media.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {media.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
                >
                  {tag}
                </span>
              ))}
              {media.tags.length > 2 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                  +{media.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
