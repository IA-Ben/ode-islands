"use client";

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Memory } from './EventMemoriesGallery';

interface MemoryCardProps {
  memory: Memory;
  viewMode: 'grid' | 'list';
  onClick: () => void;
  onDeleted: (memoryId: string) => void;
}

export default function MemoryCard({ memory, viewMode, onClick, onDeleted }: MemoryCardProps) {
  const { theme } = useTheme();
  const [imageError, setImageError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMediaIcon = (mediaType?: string) => {
    switch (mediaType) {
      case 'image':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'video':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      case 'audio':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  const renderMediaPreview = () => {
    if (!memory.mediaUrl) {
      return (
        <div className="w-full h-48 bg-white/5 rounded-lg flex items-center justify-center text-white/40">
          {getMediaIcon(memory.mediaType)}
        </div>
      );
    }

    if (memory.mediaType === 'image' && !imageError) {
      return (
        <div className="relative w-full h-48 bg-white/5 rounded-lg overflow-hidden">
          <img
            src={memory.mediaUrl}
            alt={memory.title}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-200" />
        </div>
      );
    }

    if (memory.mediaType === 'video') {
      return (
        <div className="relative w-full h-48 bg-white/5 rounded-lg overflow-hidden">
          <video
            src={memory.mediaUrl}
            className="w-full h-full object-cover"
            preload="metadata"
          />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </div>
        </div>
      );
    }

    // Default fallback for other media types
    return (
      <div className="w-full h-48 bg-white/5 rounded-lg flex items-center justify-center text-white/40">
        {getMediaIcon(memory.mediaType)}
      </div>
    );
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this memory?')) {
      return;
    }

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/memories/${memory.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDeleted(memory.id);
      } else {
        const data = await response.json();
        alert(data.message || 'Failed to delete memory');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete memory');
    } finally {
      setIsDeleting(false);
    }
  };

  if (viewMode === 'list') {
    return (
      <div 
        className="flex items-center p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
        onClick={onClick}
      >
        {/* Media preview - smaller for list view */}
        <div className="w-16 h-16 mr-4 flex-shrink-0">
          {memory.mediaType === 'image' && memory.mediaUrl && !imageError ? (
            <img
              src={memory.mediaUrl}
              alt={memory.title}
              className="w-full h-full object-cover rounded"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full bg-white/5 rounded flex items-center justify-center text-white/40">
              {getMediaIcon(memory.mediaType)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-medium text-white truncate">{memory.title}</h3>
              {memory.description && (
                <p className="text-white/60 text-sm mt-1 line-clamp-2">{memory.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-white/40">
                <span>{formatDate(memory.createdAt)}</span>
                {memory.tags && memory.tags.length > 0 && (
                  <div className="flex gap-1">
                    {memory.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-white/10 rounded text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2 ml-4">
              {!memory.isPublic && (
                <div className="text-yellow-400" title="Private">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              )}
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-red-400 hover:text-red-300 p-1"
                title="Delete memory"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border border-red-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div 
      className="bg-white/5 rounded-lg border border-white/10 overflow-hidden hover:bg-white/10 transition-colors cursor-pointer group"
      onClick={onClick}
    >
      {/* Media preview */}
      <div className="relative">
        {renderMediaPreview()}
        
        {/* Privacy indicator */}
        {!memory.isPublic && (
          <div className="absolute top-3 left-3 p-1 bg-black/50 rounded text-yellow-400" title="Private">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        )}

        {/* Delete button */}
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="absolute top-3 right-3 p-1 bg-black/50 rounded text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete memory"
        >
          {isDeleting ? (
            <div className="w-4 h-4 border border-red-400 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-medium text-white mb-2 line-clamp-2">{memory.title}</h3>
        
        {memory.description && (
          <p className="text-white/60 text-sm mb-3 line-clamp-3">{memory.description}</p>
        )}

        {/* Tags */}
        {memory.tags && memory.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {memory.tags.slice(0, 3).map((tag, index) => (
              <span 
                key={index} 
                className="px-2 py-1 bg-white/10 rounded text-xs text-white/70"
              >
                {tag}
              </span>
            ))}
            {memory.tags.length > 3 && (
              <span className="text-xs text-white/40">+{memory.tags.length - 3} more</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-white/40">
          <span>{formatDate(memory.createdAt)}</span>
          <div className="flex items-center gap-1">
            {getMediaIcon(memory.mediaType)}
            <span className="capitalize">{memory.mediaType || 'file'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}