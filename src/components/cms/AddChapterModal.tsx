'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import VersionHistoryTimeline from './VersionHistoryTimeline';
import VersionComparisonView from './VersionComparisonView';
import RestoreVersionModal from './RestoreVersionModal';
import { MediaSelectorModal } from './MediaSelectorModal';
import type { Version } from '@/hooks/useVersioning';
import type { MediaItem } from '@/hooks/useMedia';

interface AddChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChapterAdded: () => void;
  csrfToken?: string;
  editMode?: boolean;
  chapterId?: string;
  initialData?: {
    title: string;
    summary: string;
    hasAR: boolean;
    parentId?: string | null;
    imageMediaId?: string | null;
    videoMediaId?: string | null;
  };
}

export default function AddChapterModal({ 
  isOpen, 
  onClose, 
  onChapterAdded, 
  csrfToken,
  editMode = false,
  chapterId,
  initialData
}: AddChapterModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    hasAR: false,
    parentId: null as string | null,
    imageMediaId: null as string | null,
    videoMediaId: null as string | null,
  });
  const [availableParents, setAvailableParents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'edit' | 'history'>('edit');
  
  // Versioning state
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonVersions, setComparisonVersions] = useState<{ v1: number; v2: number } | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [versionToRestore, setVersionToRestore] = useState<Version | null>(null);
  const [versionHistoryKey, setVersionHistoryKey] = useState(0);
  
  // Media selector state
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [showVideoSelector, setShowVideoSelector] = useState(false);
  const [selectedImage, setSelectedImage] = useState<MediaItem | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<MediaItem | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        summary: initialData.summary || '',
        hasAR: initialData.hasAR || false,
        parentId: initialData.parentId || null,
        imageMediaId: initialData.imageMediaId || null,
        videoMediaId: initialData.videoMediaId || null,
      });
    }
  }, [initialData]);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableParents();
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialData?.imageMediaId) {
      fetch(`/api/cms/media/${initialData.imageMediaId}`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Failed to fetch image media');
        })
        .then(media => {
          setSelectedImage(media);
        })
        .catch(err => {
          console.error('Error loading existing image media:', err);
        });
    }
    
    if (initialData?.videoMediaId) {
      fetch(`/api/cms/media/${initialData.videoMediaId}`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Failed to fetch video media');
        })
        .then(media => {
          setSelectedVideo(media);
        })
        .catch(err => {
          console.error('Error loading existing video media:', err);
        });
    }
  }, [initialData?.imageMediaId, initialData?.videoMediaId]);

  const fetchAvailableParents = async () => {
    try {
      const response = await fetch('/api/chapters');
      if (response.ok) {
        const chapters = await response.json();
        const filteredChapters = editMode && chapterId 
          ? chapters.filter((ch: any) => ch.id !== chapterId && ch.depth < 4)
          : chapters.filter((ch: any) => ch.depth < 4);
        setAvailableParents(filteredChapters);
      }
    } catch (err) {
      console.error('Failed to fetch parent chapters:', err);
    }
  };

  useEffect(() => {
    if (isOpen && !editMode) {
      setActiveTab('edit');
    }
  }, [isOpen, editMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      const url = editMode && chapterId 
        ? `/api/cms/chapters/${chapterId}` 
        : '/api/cms/chapters/create';
      const method = editMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editMode ? 'update' : 'create'} chapter`);
      }

      const result = await response.json();
      console.log(`Chapter ${editMode ? 'updated' : 'created'}:`, result);
      
      onChapterAdded();
      
      if (editMode) {
        setVersionHistoryKey(prev => prev + 1);
        setActiveTab('history');
      } else {
        onClose();
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      summary: '',
      hasAR: false,
      parentId: null,
      imageMediaId: null,
      videoMediaId: null,
    });
    setError('');
    setActiveTab('edit');
    setSelectedImage(null);
    setSelectedVideo(null);
  };

  const handleImageSelect = (media: MediaItem | MediaItem[]) => {
    const selectedMedia = Array.isArray(media) ? media[0] : media;
    setSelectedImage(selectedMedia);
    setFormData(prev => ({ ...prev, imageMediaId: selectedMedia.id }));
  };

  const handleVideoSelect = (media: MediaItem | MediaItem[]) => {
    const selectedMedia = Array.isArray(media) ? media[0] : media;
    setSelectedVideo(selectedMedia);
    setFormData(prev => ({ ...prev, videoMediaId: selectedMedia.id }));
  };

  const clearImage = () => {
    setSelectedImage(null);
    setFormData(prev => ({ ...prev, imageMediaId: null }));
  };

  const clearVideo = () => {
    setSelectedVideo(null);
    setFormData(prev => ({ ...prev, videoMediaId: null }));
  };

  const handleCompare = (v1: number, v2: number) => {
    setComparisonVersions({ v1, v2 });
    setShowComparison(true);
  };

  const handleRestore = (version: Version) => {
    setVersionToRestore(version);
    setShowRestoreModal(true);
  };

  const handleRestoreSuccess = () => {
    setVersionHistoryKey(prev => prev + 1);
    onChapterAdded();
  };

  const handleClose = () => {
    resetForm();
    setShowComparison(false);
    setComparisonVersions(null);
    setShowRestoreModal(false);
    setVersionToRestore(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <Card className="border-0 shadow-none">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>
                  {editMode ? 'Edit Chapter' : 'Add New Chapter'}
                </CardTitle>
                <Button variant="outline" onClick={handleClose}>×</Button>
              </div>
            </CardHeader>

            {editMode && chapterId && (
              <div className="border-b">
                <div className="flex space-x-1 px-6">
                  <button
                    onClick={() => setActiveTab('edit')}
                    className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                      activeTab === 'edit'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <svg className="w-4 h-4 inline-block mr-2 -mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Chapter
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                      activeTab === 'history'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <svg className="w-4 h-4 inline-block mr-2 -mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Version History
                  </button>
                </div>
              </div>
            )}

            <CardContent className="overflow-y-auto max-h-[calc(90vh-180px)] p-6">
              {activeTab === 'edit' && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1">Chapter Title</label>
                    <input
                      type="text"
                      required
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter chapter title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Summary</label>
                    <textarea
                      required
                      className="w-full p-2 border border-gray-300 rounded-md h-24"
                      value={formData.summary}
                      onChange={(e) => setFormData(prev => ({ ...prev, summary: e.target.value }))}
                      placeholder="Enter chapter summary or description"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Parent Chapter (Optional)</label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={formData.parentId || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, parentId: e.target.value || null }))}
                    >
                      <option value="">No Parent (Root Level)</option>
                      {availableParents.map((parent) => (
                        <option key={parent.id} value={parent.id}>
                          {'  '.repeat(parent.depth || 0)}{parent.title} (Level {parent.depth || 0})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Select a parent chapter to create a sub-chapter. Maximum depth is 5 levels.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Chapter Image (Optional)</label>
                    {selectedImage ? (
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex items-start space-x-3">
                          <img
                            src={selectedImage.url}
                            alt={selectedImage.altText || selectedImage.title}
                            className="w-20 h-20 object-cover rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">{selectedImage.title}</p>
                            <p className="text-xs text-gray-500 truncate">{selectedImage.fileName}</p>
                          </div>
                          <button
                            type="button"
                            onClick={clearImage}
                            className="text-red-600 hover:text-red-800"
                            aria-label="Remove image"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowImageSelector(true)}
                        className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Select Image from Media Library</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Chapter Video (Optional)</label>
                    {selectedVideo ? (
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex items-start space-x-3">
                          <div className="w-20 h-20 bg-gray-200 rounded flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">{selectedVideo.title}</p>
                            <p className="text-xs text-gray-500 truncate">{selectedVideo.fileName}</p>
                          </div>
                          <button
                            type="button"
                            onClick={clearVideo}
                            className="text-red-600 hover:text-red-800"
                            aria-label="Remove video"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowVideoSelector(true)}
                        className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                        </svg>
                        <span>Select Video from Media Library</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="hasAR"
                      checked={formData.hasAR}
                      onChange={(e) => setFormData(prev => ({ ...prev, hasAR: e.target.checked }))}
                      className="rounded"
                    />
                    <label htmlFor="hasAR" className="text-sm font-medium">
                      This chapter includes AR experiences
                    </label>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <Button type="button" variant="outline" onClick={handleClose}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading 
                        ? `${editMode ? 'Updating' : 'Creating'} Chapter...` 
                        : `${editMode ? 'Update' : 'Create'} Chapter`}
                    </Button>
                  </div>
                </form>
              )}

              {activeTab === 'history' && editMode && chapterId && (
                <VersionHistoryTimeline
                  key={versionHistoryKey}
                  contentType="chapter"
                  contentId={chapterId}
                  onCompare={handleCompare}
                  onRestore={handleRestore}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {showComparison && comparisonVersions && editMode && chapterId && (
        <VersionComparisonView
          contentType="chapter"
          contentId={chapterId}
          version1={comparisonVersions.v1}
          version2={comparisonVersions.v2}
          onClose={() => {
            setShowComparison(false);
            setComparisonVersions(null);
          }}
        />
      )}

      {showRestoreModal && versionToRestore && editMode && chapterId && (
        <RestoreVersionModal
          isOpen={showRestoreModal}
          onClose={() => {
            setShowRestoreModal(false);
            setVersionToRestore(null);
          }}
          onSuccess={handleRestoreSuccess}
          version={versionToRestore}
          contentType="chapter"
          contentId={chapterId}
        />
      )}

      {csrfToken && (
        <>
          <MediaSelectorModal
            isOpen={showImageSelector}
            onClose={() => setShowImageSelector(false)}
            onSelect={handleImageSelect}
            filter={{ type: 'image' }}
            csrfToken={csrfToken}
          />
          <MediaSelectorModal
            isOpen={showVideoSelector}
            onClose={() => setShowVideoSelector(false)}
            onSelect={handleVideoSelect}
            filter={{ type: 'video' }}
            csrfToken={csrfToken}
          />
        </>
      )}
    </>
  );
}
