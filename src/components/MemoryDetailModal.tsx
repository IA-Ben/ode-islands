"use client";

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Memory } from './EventMemoriesGallery';
import { Button } from '@/components/ui/button';
import { surfaces, components, borders } from '@/lib/admin/designTokens';

interface MemoryDetailModalProps {
  memory: Memory;
  isOpen: boolean;
  onClose: () => void;
  onDeleted: (memoryId: string) => void;
}

export default function MemoryDetailModal({ memory, isOpen, onClose, onDeleted }: MemoryDetailModalProps) {
  const { theme } = useTheme();
  const [isDeleting, setIsDeleting] = useState(false);
  const [shareMessage, setShareMessage] = useState('');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this memory? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);

      const response = await fetch(`/api/memories/${memory.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDeleted(memory.id);
        onClose();
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

  const handleShare = async (platform: 'copy' | 'download') => {
    try {
      if (platform === 'copy') {
        const shareUrl = window.location.origin + `/memories/${memory.id}`;
        const shareText = `Check out this memory: ${memory.title}\n\n${shareUrl}`;
        
        if (navigator.share) {
          await navigator.share({
            title: memory.title,
            text: memory.description,
            url: shareUrl,
          });
        } else {
          await navigator.clipboard.writeText(shareText);
          setShareMessage('Link copied to clipboard!');
          setTimeout(() => setShareMessage(''), 3000);
        }
      } else if (platform === 'download' && memory.mediaUrl) {
        // Create download link
        const link = document.createElement('a');
        link.href = memory.mediaUrl;
        link.download = `${memory.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${memory.mediaType === 'image' ? 'jpg' : memory.mediaType === 'video' ? 'mp4' : 'mp3'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setShareMessage('Download started!');
        setTimeout(() => setShareMessage(''), 3000);
      }
    } catch (error) {
      console.error('Share error:', error);
      setShareMessage('Failed to share');
      setTimeout(() => setShareMessage(''), 3000);
    }
  };

  const renderMedia = () => {
    if (!memory.mediaUrl) {
      return (
        <div className="w-full h-64 bg-white/5 rounded-lg flex items-center justify-center text-white/40">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No media attached</p>
          </div>
        </div>
      );
    }

    switch (memory.mediaType) {
      case 'image':
        return (
          <div className="w-full max-h-96 bg-white/5 rounded-lg overflow-hidden">
            <img
              src={memory.mediaUrl}
              alt={memory.title}
              className="w-full h-full object-contain"
            />
          </div>
        );

      case 'video':
        return (
          <div className="w-full max-h-96 bg-white/5 rounded-lg overflow-hidden">
            <video
              src={memory.mediaUrl}
              controls
              className="w-full h-full"
              preload="metadata"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        );

      case 'audio':
        return (
          <div className="w-full p-8 bg-white/5 rounded-lg">
            <div className="flex items-center justify-center mb-4">
              <svg className="w-16 h-16 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <audio
              src={memory.mediaUrl}
              controls
              className="w-full"
              preload="metadata"
            >
              Your browser does not support the audio tag.
            </audio>
          </div>
        );

      default:
        return (
          <div className="w-full h-64 bg-white/5 rounded-lg flex items-center justify-center text-white/40">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p>File attachment</p>
            </div>
          </div>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg">
      <div 
        className={`w-full max-w-4xl ${surfaces.darkGlass} border border-slate-700/50 rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-white truncate">
              {memory.title}
            </h2>
            <div className="flex items-center gap-4 mt-2 text-sm text-white/60">
              <span>{formatDate(memory.createdAt)}</span>
              {!memory.isPublic && (
                <div className="flex items-center gap-1 text-yellow-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Private</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white/90 transition-colors ml-4"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Media */}
          <div>
            {renderMedia()}
          </div>

          {/* Description */}
          {memory.description && (
            <div>
              <h3 className="text-lg font-medium text-white mb-3">Description</h3>
              <p className="text-white/80 leading-relaxed whitespace-pre-wrap">
                {memory.description}
              </p>
            </div>
          )}

          {/* Tags */}
          {memory.tags && memory.tags.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-white mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {memory.tags.map((tag, index) => (
                  <span 
                    key={index}
                    className="px-3 py-1 bg-fuchsia-500/20 text-fuchsia-200 rounded-full text-sm border border-fuchsia-500/30"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Share Message */}
          {shareMessage && (
            <div className="p-3 bg-green-500/20 border border-green-500/30 rounded text-green-300 text-sm">
              {shareMessage}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-700/50">
            {/* Share Actions */}
            <div className="flex flex-wrap gap-2 flex-1">
              <button
                onClick={() => handleShare('copy')}
                className={`${components.buttonSecondary} flex items-center gap-2`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                </svg>
                Share
              </button>
              
              {memory.mediaUrl && (
                <button
                  onClick={() => handleShare('download')}
                  className={`${components.buttonSecondary} flex items-center gap-2`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  Download
                </button>
              )}
            </div>

            {/* Delete Action */}
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 border border-red-500/30 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}