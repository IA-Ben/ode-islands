"use client";

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { ObjectUploader } from '@/components/ObjectUploader';
import { Button } from '@/components/ui/button';

interface MemoryUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: () => void;
  eventId?: string;
}

export default function MemoryUploadModal({ isOpen, onClose, onUploaded, eventId }: MemoryUploadModalProps) {
  const { theme } = useTheme();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    tags: '',
    isPublic: true,
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<{
    url: string;
    type: string;
    objectId: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const getUploadParameters = async () => {
    try {
      // Get CSRF token
      const csrfResponse = await fetch('/api/csrf-token');
      const csrfData = await csrfResponse.json();
      
      if (!csrfData.success) {
        throw new Error('Failed to get CSRF token');
      }

      // Get upload URL with a dummy file (Uppy will provide actual file info)
      const response = await fetch('/api/memories/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfData.token,
        },
        body: JSON.stringify({
          fileName: 'temp.jpg', // This will be replaced by actual file info
          fileType: 'image/jpeg',
          fileSize: 1024
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to get upload URL');
      }

      return {
        method: 'PUT' as const,
        url: data.uploadUrl,
      };
    } catch (error) {
      console.error('Upload parameters error:', error);
      throw new Error('Failed to prepare upload');
    }
  };

  const handleUploadComplete = (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const file = result.successful[0];
      setUploadedMedia({
        url: file.uploadURL?.split('?')[0] || '', // Remove query params from URL
        type: file.type.split('/')[0], // Get main type: image, video, audio
        objectId: file.uploadURL?.split('/').pop()?.split('?')[0] || ''
      });
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);

      // Get CSRF token
      const csrfResponse = await fetch('/api/csrf-token');
      const csrfData = await csrfResponse.json();
      
      if (!csrfData.success) {
        throw new Error('Failed to get CSRF token');
      }

      // Parse tags
      const tags = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const memoryData = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        isPublic: formData.isPublic,
        eventId: eventId || undefined,
        mediaUrl: uploadedMedia?.url || undefined,
        mediaType: uploadedMedia?.type || undefined,
      };

      const response = await fetch('/api/memories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfData.token,
        },
        body: JSON.stringify(memoryData),
      });

      const data = await response.json();

      if (data.success) {
        onUploaded();
        handleClose();
      } else {
        setError(data.message || 'Failed to create memory');
      }
    } catch (error) {
      console.error('Memory creation error:', error);
      setError('Failed to create memory');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      tags: '',
      isPublic: true,
    });
    setUploadedMedia(null);
    setError(null);
    setIsUploading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div 
        className="w-full max-w-2xl bg-black border border-white/20 rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 
            className="text-2xl font-bold"
            style={{ color: theme.colors.secondary }}
          >
            Share a Memory
          </h2>
          <button
            onClick={handleClose}
            className="text-white/60 hover:text-white/90 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300">
              {error}
            </div>
          )}

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-3">
              Media File (Optional)
            </label>
            <div className="space-y-3">
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={100 * 1024 * 1024} // 100MB
                allowedFileTypes={[
                  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
                  'video/mp4', 'video/mov', 'video/avi', 'video/webm',
                  'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'
                ]}
                onGetUploadParameters={getUploadParameters}
                onComplete={handleUploadComplete}
                buttonClassName="w-full bg-white/10 border border-white/20 text-white hover:bg-white/20"
              >
                <div className="flex items-center justify-center py-4">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {uploadedMedia ? 'Change File' : 'Upload Image, Video, or Audio'}
                </div>
              </ObjectUploader>
              
              {uploadedMedia && (
                <div className="p-3 bg-green-500/20 border border-green-500/30 rounded text-green-300 text-sm">
                  ✓ File uploaded successfully ({uploadedMedia.type})
                </div>
              )}
              
              <p className="text-xs text-white/40">
                Supported: Images (JPG, PNG, GIF, WebP), Videos (MP4, MOV, AVI, WebM), Audio (MP3, WAV, OGG, M4A). Max 100MB.
              </p>
            </div>
          </div>

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-white/80 mb-2">
              Title *
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Give your memory a title..."
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/40 focus:bg-white/10"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-white/80 mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Share more details about this memory..."
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/40 focus:bg-white/10 resize-vertical"
            />
          </div>

          {/* Tags */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-white/80 mb-2">
              Tags
            </label>
            <input
              id="tags"
              name="tags"
              type="text"
              value={formData.tags}
              onChange={handleInputChange}
              placeholder="adventure, nature, friends (comma-separated)"
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/40 focus:bg-white/10"
            />
            <p className="text-xs text-white/40 mt-1">
              Add tags separated by commas to help organize your memories
            </p>
          </div>

          {/* Privacy */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-3">
              Privacy
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="isPublic"
                  checked={formData.isPublic === true}
                  onChange={() => setFormData(prev => ({ ...prev, isPublic: true }))}
                  className="mr-3 text-blue-500"
                />
                <div>
                  <div className="text-white">Public</div>
                  <div className="text-sm text-white/60">Everyone can see this memory</div>
                </div>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="isPublic"
                  checked={formData.isPublic === false}
                  onChange={() => setFormData(prev => ({ ...prev, isPublic: false }))}
                  className="mr-3 text-blue-500"
                />
                <div>
                  <div className="text-white">Private</div>
                  <div className="text-sm text-white/60">Only you can see this memory</div>
                </div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              onClick={handleClose}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUploading || !formData.title.trim()}
              style={{ 
                backgroundColor: theme.colors.primary,
                color: 'white'
              }}
            >
              {isUploading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Creating...
                </div>
              ) : (
                'Share Memory'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}