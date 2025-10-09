"use client";

import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { WalletMemory } from './MemoryWallet';
import { Button } from '@/components/ui/button';

interface MemoryWalletCardProps {
  memory: WalletMemory;
  viewMode: 'grid' | 'list';
  onClick: () => void;
  onUpdate: (memory: WalletMemory) => void;
  onDelete: (memoryId: string) => void;
  getSourceIcon: (sourceType: string) => React.ReactElement;
  formatDate: (dateString: string) => string;
}

export default function MemoryWalletCard({ 
  memory, 
  viewMode, 
  onClick, 
  onUpdate,
  onDelete,
  getSourceIcon,
  formatDate 
}: MemoryWalletCardProps) {
  const { theme } = useTheme();
  const [imageError, setImageError] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      setIsUpdating(true);
      
      // Get CSRF token
      const csrfResponse = await fetch('/api/csrf-token');
      const csrfData = await csrfResponse.json();
      
      if (!csrfData.success) {
        throw new Error('Failed to get CSRF token');
      }

      const response = await fetch(`/api/memory-wallet/${memory.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfData.token,
        },
        body: JSON.stringify({
          isFavorite: !memory.isFavorite,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          onUpdate(data.memory);
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to update favorite status:', errorData.message);
      }
    } catch (error) {
      console.error('Toggle favorite error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const renderMediaPreview = () => {
    if (!memory.mediaUrl && !memory.thumbnail) {
      return (
        <div className="w-full h-48 bg-white/5 rounded-lg flex items-center justify-center text-white/40">
          {getSourceIcon(memory.sourceType)}
        </div>
      );
    }

    const imageUrl = memory.thumbnail || memory.mediaUrl;

    if (memory.mediaType === 'video') {
      return (
        <div className="relative w-full h-48 bg-black rounded-lg overflow-hidden">
          {imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt={memory.title}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/40">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </div>
        </div>
      );
    }

    if (memory.mediaType === 'audio') {
      return (
        <div className="w-full h-48 bg-white/5 rounded-lg flex items-center justify-center text-white/40">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>
      );
    }

    return (
      <div className="w-full h-48 bg-white/5 rounded-lg overflow-hidden">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={memory.title}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/40">
            {getSourceIcon(memory.sourceType)}
          </div>
        )}
      </div>
    );
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'milestone': return 'bg-purple-500/20 text-purple-300';
      case 'learning': return 'bg-blue-500/20 text-blue-300';
      case 'interaction': return 'bg-green-500/20 text-green-300';
      case 'achievement': return 'bg-yellow-500/20 text-yellow-300';
      case 'moment': return 'bg-pink-500/20 text-pink-300';
      default: return 'bg-white/10 text-white/60';
    }
  };

  const getSourceLabel = (sourceType: string) => {
    switch (sourceType) {
      case 'card': return 'Card';
      case 'chapter': return 'Chapter';
      case 'event': return 'Event';
      case 'poll': return 'Poll';
      case 'quiz': return 'Quiz';
      case 'manual': return 'Manual';
      default: return sourceType;
    }
  };

  if (viewMode === 'list') {
    return (
      <div
        className="memory-wallet-card-list bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4 cursor-pointer hover:bg-white/10 transition-all duration-200"
        onClick={onClick}
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 flex-shrink-0">
            {renderMediaPreview()}
          </div>
          
          <div className="flex-grow min-w-0">
            <div className="flex items-start justify-between mb-2">
              <h3 
                className="text-lg font-medium truncate"
                style={{ color: theme.colors.secondary }}
              >
                {memory.title}
              </h3>
              <Button
                onClick={handleToggleFavorite}
                disabled={isUpdating}
                className="p-1 hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
                style={{ background: 'transparent' }}
              >
                <svg 
                  className={`w-5 h-5 transition-colors ${
                    memory.isFavorite ? 'text-yellow-400 fill-current' : 'text-white/40'
                  }`} 
                  fill={memory.isFavorite ? 'currentColor' : 'none'} 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </Button>
            </div>
            
            <div className="flex items-center gap-3 text-sm text-white/60">
              <div className="flex items-center gap-1">
                {getSourceIcon(memory.sourceType)}
                <span>{getSourceLabel(memory.sourceType)}</span>
              </div>
              
              {memory.memoryCategory && (
                <span className={`px-2 py-1 rounded-full text-xs ${getCategoryColor(memory.memoryCategory)}`}>
                  {memory.memoryCategory}
                </span>
              )}
              
              <span>{formatDate(memory.collectedAt)}</span>
            </div>
            
            {memory.description && (
              <p className="text-white/60 text-sm mt-2 line-clamp-2">
                {memory.description}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="memory-wallet-card bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden cursor-pointer hover:bg-white/10 transition-all duration-200 hover:scale-105"
      onClick={onClick}
    >
      {renderMediaPreview()}
      
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 
            className="text-lg font-medium truncate"
            style={{ color: theme.colors.secondary }}
          >
            {memory.title}
          </h3>
          <Button
            onClick={handleToggleFavorite}
            disabled={isUpdating}
            className="p-1 hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
            style={{ background: 'transparent' }}
          >
            <svg 
              className={`w-5 h-5 transition-colors ${
                memory.isFavorite ? 'text-yellow-400 fill-current' : 'text-white/40'
              }`} 
              fill={memory.isFavorite ? 'currentColor' : 'none'} 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </Button>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-white/60 mb-3">
          <div className="flex items-center gap-1">
            {getSourceIcon(memory.sourceType)}
            <span>{getSourceLabel(memory.sourceType)}</span>
          </div>
          
          {memory.memoryCategory && (
            <span className={`px-2 py-1 rounded-full text-xs ${getCategoryColor(memory.memoryCategory)}`}>
              {memory.memoryCategory}
            </span>
          )}
        </div>
        
        {memory.description && (
          <p className="text-white/60 text-sm mb-3 line-clamp-3">
            {memory.description}
          </p>
        )}
        
        <div className="flex items-center justify-between text-xs text-white/40">
          <span>{formatDate(memory.collectedAt)}</span>
          {memory.tags && memory.tags.length > 0 && (
            <span>{memory.tags.length} tag{memory.tags.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>
    </div>
  );
}