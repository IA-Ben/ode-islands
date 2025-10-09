"use client";

import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { WalletMemory } from './MemoryWallet';
import { Button } from '@/components/ui/button';

interface MemoryWalletDetailModalProps {
  memory: WalletMemory;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (memory: WalletMemory) => void;
  onDelete: (memoryId: string) => void;
  getSourceIcon: (sourceType: string) => React.ReactElement;
  formatDate: (dateString: string) => string;
}

export default function MemoryWalletDetailModal({ 
  memory, 
  isOpen, 
  onClose, 
  onUpdate, 
  onDelete,
  getSourceIcon,
  formatDate 
}: MemoryWalletDetailModalProps) {
  const { theme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  
  const [editData, setEditData] = useState({
    title: memory.title,
    description: memory.description || '',
    userNotes: memory.userNotes || '',
    memoryCategory: memory.memoryCategory || '',
    emotionalTone: memory.emotionalTone || '',
    tags: memory.tags || [],
  });

  if (!isOpen) return null;

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
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
        body: JSON.stringify(editData),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          onUpdate(data.memory);
          setIsEditing(false);
          setShareMessage('Memory updated successfully!');
          setTimeout(() => setShareMessage(''), 3000);
        } else {
          alert(data.message || 'Failed to update memory');
        }
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to update memory');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to update memory');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this memory? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      
      // Get CSRF token
      const csrfResponse = await fetch('/api/csrf-token');
      const csrfData = await csrfResponse.json();
      
      if (!csrfData.success) {
        throw new Error('Failed to get CSRF token');
      }

      const response = await fetch(`/api/memory-wallet/${memory.id}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': csrfData.token,
        },
      });

      if (response.ok) {
        onDelete(memory.id);
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

  const handleToggleFavorite = async () => {
    try {
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
      }
    } catch (error) {
      console.error('Toggle favorite error:', error);
    }
  };

  const handleShare = async (platform: 'copy' | 'download') => {
    try {
      if (platform === 'copy') {
        const shareText = `Check out this memory from my journey: ${memory.title}\n\n${memory.description || ''}`;
        
        if (navigator.share && memory.mediaUrl) {
          await navigator.share({
            title: memory.title,
            text: memory.description,
            url: memory.mediaUrl,
          });
        } else {
          await navigator.clipboard.writeText(shareText);
          setShareMessage('Memory details copied to clipboard!');
          setTimeout(() => setShareMessage(''), 3000);
        }
      }
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const formatFullDate = (dateString: string) => {
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

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'milestone': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'learning': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'interaction': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'achievement': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'moment': return 'bg-pink-500/20 text-pink-300 border-pink-500/30';
      default: return 'bg-white/10 text-white/60 border-white/20';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-black/90 backdrop-blur-md rounded-lg border border-white/20 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-black/90 backdrop-blur-md border-b border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getSourceIcon(memory.sourceType)}
              <div>
                <h2 
                  className="text-2xl font-bold"
                  style={{ color: theme.colors.secondary }}
                >
                  {isEditing ? (
                    <input
                      value={editData.title}
                      onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                      className="bg-white/5 border border-white/20 rounded px-3 py-1 text-white"
                    />
                  ) : (
                    memory.title
                  )}
                </h2>
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <span>{getSourceLabel(memory.sourceType)}</span>
                  {memory.memoryCategory && (
                    <>
                      <span>•</span>
                      <span className={`px-2 py-1 rounded-full text-xs border ${getCategoryColor(memory.memoryCategory)}`}>
                        {memory.memoryCategory}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={handleToggleFavorite}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
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
              
              <Button
                onClick={() => setIsEditing(!isEditing)}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </Button>
              
              <Button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                style={{ background: 'transparent' }}
              >
                <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Media */}
          {(memory.mediaUrl || memory.thumbnail) && (
            <div className="mb-6">
              {memory.mediaType === 'video' ? (
                <video 
                  controls 
                  className="w-full max-h-96 rounded-lg bg-black"
                  poster={memory.thumbnail}
                >
                  <source src={memory.mediaUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : memory.mediaType === 'audio' ? (
                <audio controls className="w-full">
                  <source src={memory.mediaUrl} type="audio/mpeg" />
                  Your browser does not support the audio tag.
                </audio>
              ) : (
                <img 
                  src={memory.mediaUrl || memory.thumbnail} 
                  alt={memory.title}
                  className="w-full max-h-96 object-cover rounded-lg"
                />
              )}
            </div>
          )}

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-white mb-3">Description</h3>
            {isEditing ? (
              <textarea
                value={editData.description}
                onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Add a description..."
                className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 min-h-[100px]"
              />
            ) : (
              <p className="text-white/80">
                {memory.description || 'No description provided'}
              </p>
            )}
          </div>

          {/* User Notes */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-white mb-3">Your Notes</h3>
            {isEditing ? (
              <textarea
                value={editData.userNotes}
                onChange={(e) => setEditData(prev => ({ ...prev, userNotes: e.target.value }))}
                placeholder="Add your personal notes..."
                className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 min-h-[100px]"
              />
            ) : (
              <p className="text-white/80">
                {memory.userNotes || 'No personal notes added'}
              </p>
            )}
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-3">Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Collected:</span>
                  <span className="text-white">{formatFullDate(memory.collectedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Source:</span>
                  <span className="text-white">{getSourceLabel(memory.sourceType)}</span>
                </div>
                {memory.collectionTrigger && (
                  <div className="flex justify-between">
                    <span className="text-white/60">Trigger:</span>
                    <span className="text-white capitalize">{memory.collectionTrigger}</span>
                  </div>
                )}
                {memory.emotionalTone && (
                  <div className="flex justify-between">
                    <span className="text-white/60">Tone:</span>
                    {isEditing ? (
                      <select
                        value={editData.emotionalTone}
                        onChange={(e) => setEditData(prev => ({ ...prev, emotionalTone: e.target.value }))}
                        className="bg-white/5 border border-white/20 rounded px-2 py-1 text-white text-xs"
                      >
                        <option value="">Select tone</option>
                        <option value="positive">Positive</option>
                        <option value="neutral">Neutral</option>
                        <option value="reflective">Reflective</option>
                        <option value="exciting">Exciting</option>
                      </select>
                    ) : (
                      <span className="text-white capitalize">{memory.emotionalTone}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-white mb-3">Tags</h3>
              {isEditing ? (
                <input
                  type="text"
                  placeholder="Enter tags separated by commas"
                  value={editData.tags.join(', ')}
                  onChange={(e) => setEditData(prev => ({ 
                    ...prev, 
                    tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                  }))}
                  className="w-full p-2 bg-white/5 border border-white/20 rounded text-white placeholder-white/40"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {memory.tags && memory.tags.length > 0 ? (
                    memory.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-white/10 text-white/80 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-white/40 text-sm">No tags</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-white/10">
            <div className="flex items-center gap-3">
              {shareMessage && (
                <span className="text-green-400 text-sm">{shareMessage}</span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={() => handleShare('copy')}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
              >
                Share
              </Button>
              
              {isEditing && (
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              )}
              
              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}