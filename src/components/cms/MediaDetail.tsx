'use client';

import React, { useState, useEffect } from 'react';
import { MediaItem, MediaUsage } from '@/hooks/useMedia';

interface MediaDetailProps {
  mediaId: string;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<MediaItem>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  getMedia: (id: string) => Promise<MediaItem>;
  getUsage: (id: string) => Promise<MediaUsage>;
}

export function MediaDetail({
  mediaId,
  onClose,
  onUpdate,
  onDelete,
  getMedia,
  getUsage,
}: MediaDetailProps) {
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [usage, setUsage] = useState<MediaUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const [title, setTitle] = useState('');
  const [altText, setAltText] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mediaData, usageData] = await Promise.all([
          getMedia(mediaId),
          getUsage(mediaId),
        ]);
        
        setMedia(mediaData);
        setUsage(usageData);
        setTitle(mediaData.title);
        setAltText(mediaData.altText || '');
        setDescription(mediaData.description || '');
        setTags(mediaData.tags.join(', '));
      } catch (error) {
        console.error('Failed to fetch media details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mediaId, getMedia, getUsage]);

  const handleSave = async () => {
    if (!media) return;
    
    setSaving(true);
    try {
      await onUpdate(media.id, {
        title,
        altText,
        description,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      onClose();
    } catch (error) {
      console.error('Failed to save changes:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!media) return;
    
    const inUse = usage && usage.totalUsages > 0;
    
    if (inUse) {
      alert(`This media is currently being used in ${usage.totalUsages} place(s). Please remove it from all chapters and cards before deleting.`);
      return;
    }
    
    if (!confirm(`Are you sure you want to delete "${media.title}"? This action cannot be undone.`)) {
      return;
    }
    
    setDeleting(true);
    try {
      await onDelete(media.id);
      onClose();
    } catch (error: any) {
      console.error('Failed to delete media:', error);
      alert(error.message || 'Failed to delete media. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-8">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (!media) {
    return null;
  }

  const inUse = usage && usage.totalUsages > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-gray-900">Media Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="bg-gray-100 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                {media.fileType.startsWith('image/') ? (
                  <img
                    src={media.url}
                    alt={media.altText || media.title}
                    className="w-full h-full object-contain"
                  />
                ) : media.fileType.startsWith('video/') ? (
                  <video src={media.url} controls className="w-full h-full" />
                ) : media.fileType.startsWith('audio/') ? (
                  <audio src={media.url} controls className="w-full" />
                ) : (
                  <div className="text-center p-8">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-500">Preview not available</p>
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">File Name:</span>
                  <span className="font-medium text-gray-900">{media.fileName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">File Size:</span>
                  <span className="font-medium text-gray-900">{formatFileSize(media.fileSize)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">File Type:</span>
                  <span className="font-medium text-gray-900">{media.fileType}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Uploaded:</span>
                  <span className="font-medium text-gray-900">{formatDate(media.createdAt)}</span>
                </div>
                {media.uploaderName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Uploaded By:</span>
                    <span className="font-medium text-gray-900">{media.uploaderName}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <a
                  href={media.url}
                  download
                  className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download File
                </a>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alt Text
                </label>
                <input
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Descriptive text for accessibility"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Optional description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Comma-separated tags"
                />
              </div>

              {usage && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">Usage Information</h3>
                  {inUse ? (
                    <div className="space-y-2 text-sm text-blue-800">
                      <p>This media is currently being used in:</p>
                      {usage.chapters.length > 0 && (
                        <div>
                          <p className="font-medium">Chapters ({usage.chapters.length}):</p>
                          <ul className="list-disc list-inside ml-2">
                            {usage.chapters.map((ch) => (
                              <li key={ch.id}>{ch.title}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {usage.cards.length > 0 && (
                        <div>
                          <p className="font-medium">Cards ({usage.cards.length}):</p>
                          <ul className="list-disc list-inside ml-2">
                            {usage.cards.slice(0, 5).map((card) => (
                              <li key={card.id}>{card.title || 'Untitled Card'}</li>
                            ))}
                            {usage.cards.length > 5 && (
                              <li>... and {usage.cards.length - 5} more</li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-blue-800">This media is not currently being used.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <button
              onClick={handleDelete}
              disabled={inUse || deleting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? 'Deleting...' : 'Delete Media'}
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
