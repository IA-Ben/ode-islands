'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VisualCardEditor } from '../VisualCardEditor';
import { VisualCardLayout, createEmptyLayout } from '@/../../shared/cardTypes';
import { convertLegacyCardToVisualLayout, isLegacyCardFormat } from '@/../../shared/cardConverter';
import type { CardData } from '@/@typings';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { ObjectUploader } from '@/components/ObjectUploader';
import { CardEditorButtons } from '@/components/CardEditorButtons';
import { CMSCardPreview } from '@/components/CMSCardPreview';
import { surfaces, borders, typography, components, colors, shadows } from '@/lib/admin/designTokens';

interface StoryCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCardSaved: () => void;
  csrfToken: string;
  editMode?: boolean;
  cardId?: string;
  chapterId: string;
  initialData?: {
    content?: any;
    visualLayout?: VisualCardLayout;
    order?: number;
    hasAR?: boolean;
  };
}

export default function StoryCardModal({
  isOpen,
  onClose,
  onCardSaved,
  csrfToken,
  editMode = false,
  cardId,
  chapterId,
  initialData,
}: StoryCardModalProps) {
  const [editingMode, setEditingMode] = useState<'traditional' | 'visual'>('visual');
  const [visualLayout, setVisualLayout] = useState<VisualCardLayout>(
    initialData?.visualLayout || 
    initialData?.content?.visualLayout || 
    createEmptyLayout()
  );
  const [traditionalContent, setTraditionalContent] = useState<CardData>(initialData?.content || {});
  const [order, setOrder] = useState(initialData?.order || 0);
  const [hasAR, setHasAR] = useState(initialData?.hasAR || false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showJSON, setShowJSON] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [videoUploadProgress, setVideoUploadProgress] = useState<number>(0);
  const [videoTranscodingStatus, setVideoTranscodingStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [transcodingDetails, setTranscodingDetails] = useState<{ percentage?: number; profiles?: string; message?: string }>({});
  const [videoProcessing, setVideoProcessing] = useState(false);

  useEffect(() => {
    // Only process initialData when modal is open
    if (isOpen && initialData) {
      // Check if we have a visualLayout in the data
      if (initialData.visualLayout) {
        setVisualLayout(initialData.visualLayout);
        setEditingMode('visual');
      } else if (initialData.content?.visualLayout) {
        setVisualLayout(initialData.content.visualLayout);
        setEditingMode('visual');
      } else if (initialData.content && isLegacyCardFormat(initialData.content)) {
        // Convert legacy format to visual layout
        console.log('Converting legacy card format to visual layout');
        const converted = convertLegacyCardToVisualLayout(initialData.content);
        setVisualLayout(converted);
        setEditingMode('visual');
      } else {
        // No visual layout found, start with empty
        setVisualLayout(createEmptyLayout());
      }

      setTraditionalContent(initialData.content || {});
      setOrder(initialData.order || 0);
      setHasAR(initialData.hasAR || false);
    } else if (isOpen && !initialData) {
      // New card - reset to empty
      setVisualLayout(createEmptyLayout());
      setTraditionalContent({});
      setOrder(0);
      setHasAR(false);
    }
  }, [isOpen, initialData]);

  const getUploadParameters = async (file: { name: string; type: string; size: number }) => {
    const response = await fetch('/api/memories/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      }),
    });
    const data = await response.json();
    return {
      method: 'PUT' as const,
      url: data.uploadUrl,
    };
  };

  const handleUploadComplete = (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const file = result.successful[0];
      const mediaUrl = file.uploadURL?.split('?')[0] || '';
      const mediaType = file.type.split('/')[0];
      
      setUploadStatus(`✓ Uploaded: ${file.name}`);
      
      if (mediaType === 'image') {
        setTraditionalContent(prev => ({
          ...prev,
          image: { 
            url: mediaUrl, 
            width: prev.image?.width || 1920, 
            height: prev.image?.height || 1080 
          }
        }));
      } else if (mediaType === 'audio') {
        setTraditionalContent(prev => ({
          ...prev,
          audio: { url: mediaUrl }
        }));
      }
      
      setTimeout(() => setUploadStatus(''), 3000);
    }
  };

  const pollTranscodingStatus = async (videoId: string, attemptCount = 0): Promise<void> => {
    const MAX_ATTEMPTS = 60;
    const POLL_INTERVAL = 5000;
    
    if (attemptCount >= MAX_ATTEMPTS) {
      setVideoTranscodingStatus('error');
      setTranscodingDetails({ message: 'Transcoding timeout - please check video status later' });
      setVideoProcessing(false);
      return;
    }
    
    try {
      const response = await fetch(`/api/video-status/${videoId}`);
      
      if (!response.ok) {
        throw new Error('Failed to check transcoding status');
      }
      
      const data = await response.json();
      
      if (data.status === 'completed' || data.status === 'ready') {
        setVideoTranscodingStatus('completed');
        setTranscodingDetails({ message: 'Video ready for playback' });
        setVideoProcessing(false);
        setTraditionalContent(prev => ({
          ...prev,
          video: { 
            url: videoId,
            width: prev.video?.width || 1920, 
            height: prev.video?.height || 1080, 
            audio: prev.video?.audio ?? true 
          }
        }));
      } else if (data.status === 'processing') {
        const percentage = data.percentage || 0;
        const profiles = data.profiles ? `${data.profiles}` : '';
        setVideoTranscodingStatus('processing');
        setTranscodingDetails({ 
          percentage, 
          profiles,
          message: profiles ? `Processing: ${profiles}` : `Processing: ${percentage}%`
        });
        setTimeout(() => pollTranscodingStatus(videoId, attemptCount + 1), POLL_INTERVAL);
      } else if (data.status === 'error') {
        setVideoTranscodingStatus('error');
        setTranscodingDetails({ message: data.error || 'Transcoding failed' });
        setVideoProcessing(false);
      } else {
        setTimeout(() => pollTranscodingStatus(videoId, attemptCount + 1), POLL_INTERVAL);
      }
    } catch (err: any) {
      console.error('Polling error:', err);
      setTimeout(() => pollTranscodingStatus(videoId, attemptCount + 1), POLL_INTERVAL);
    }
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;
    const ALLOWED_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    
    if (file.size > MAX_FILE_SIZE) {
      setVideoTranscodingStatus('error');
      setTranscodingDetails({ message: 'File too large. Maximum size is 2GB.' });
      return;
    }
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      setVideoTranscodingStatus('error');
      setTranscodingDetails({ message: 'Invalid file type. Allowed: MP4, MOV, AVI, WebM' });
      return;
    }
    
    setVideoTranscodingStatus('uploading');
    setVideoProcessing(true);
    setVideoUploadProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setVideoUploadProgress(percentComplete);
        }
      });
      
      xhr.addEventListener('load', async () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          
          if (data.success && data.videoId) {
            setVideoTranscodingStatus('processing');
            setTranscodingDetails({ message: 'Upload complete. Starting transcoding...' });
            setVideoUploadProgress(100);
            await pollTranscodingStatus(data.videoId);
          } else {
            setVideoTranscodingStatus('error');
            setTranscodingDetails({ message: data.error || 'Upload failed' });
            setVideoProcessing(false);
          }
        } else {
          setVideoTranscodingStatus('error');
          setTranscodingDetails({ message: `Upload failed: ${xhr.statusText}` });
          setVideoProcessing(false);
        }
      });
      
      xhr.addEventListener('error', () => {
        setVideoTranscodingStatus('error');
        setTranscodingDetails({ message: 'Network error during upload' });
        setVideoProcessing(false);
      });
      
      xhr.open('POST', '/api/cms/media/upload');
      xhr.setRequestHeader('X-CSRF-Token', csrfToken);
      xhr.send(formData);
      
    } catch (err: any) {
      console.error('Video upload error:', err);
      setVideoTranscodingStatus('error');
      setTranscodingDetails({ message: err.message || 'Upload failed' });
      setVideoProcessing(false);
    }
    
    event.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = editMode && cardId 
        ? `/api/story-cards/${cardId}` 
        : '/api/story-cards';
      const method = editMode ? 'PUT' : 'POST';

      const data = editingMode === 'visual' 
        ? {
            chapterId,
            content: { visualLayout },
            order,
            hasAR,
          }
        : {
            chapterId,
            content: traditionalContent,
            order,
            hasAR,
          };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editMode ? 'update' : 'create'} story card`);
      }

      onCardSaved();
      onClose();
    } catch (err: any) {
      console.error('Error saving story card:', err);
      setError(err.message || 'Failed to save story card');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 ${colors.modalOverlay} flex items-center justify-center z-50 p-4`}>
      <div className={`${surfaces.darkGlass} ${borders.glassBorder} ${borders.radius.lg} max-w-6xl w-full max-h-[90vh] overflow-hidden ${shadows.xl}`}>
        {/* Modal Header */}
        <div className={`border-b ${colors.slate.border} px-6 py-4`}>
          <div className="flex items-center justify-between">
            <h2 className={typography.h2}>
              {editMode ? 'Edit Story Card' : 'Add Story Card'}
            </h2>
            <button
              onClick={onClose}
              className={`${colors.slate.textMuted} hover:text-white text-3xl leading-none transition-colors`}
              type="button"
            >
              ×
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className={`${colors.error.bg} border ${colors.error.border} ${colors.error.textAlt} px-4 py-3 ${borders.radius.lg}`}>
                {error}
              </div>
            )}

            {/* Mode Toggle */}
            <div className="flex gap-3 mb-6 justify-between items-center flex-wrap">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingMode('traditional')}
                  className={`px-5 py-2 ${borders.radius.md} font-medium transition-all ${
                    editingMode === 'traditional' 
                      ? `${colors.accent.bg} text-white ${shadows.lg}` 
                      : `${surfaces.subtleGlass} ${colors.slate.textMuted} hover:text-white ${borders.glassBorder}`
                  }`}
                >
                  Traditional Mode
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingMode('visual');
                    if (!visualLayout || !visualLayout.elements || visualLayout.elements.length === 0) {
                      setVisualLayout(createEmptyLayout());
                    }
                  }}
                  className={`px-5 py-2 ${borders.radius.md} font-medium transition-all ${
                    editingMode === 'visual' 
                      ? `${colors.accent.bg} text-white ${shadows.lg}` 
                      : `${surfaces.subtleGlass} ${colors.slate.textMuted} hover:text-white ${borders.glassBorder}`
                  }`}
                >
                  Visual Mode
                </button>
              </div>
              
              {editingMode === 'traditional' && (
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className={`px-5 py-2 ${borders.radius.md} font-medium transition-all ${
                    showPreview 
                      ? `${colors.accent.bg} text-white ${shadows.lg}` 
                      : `${surfaces.subtleGlass} ${colors.slate.textMuted} hover:text-white ${borders.glassBorder}`
                  }`}
                >
                  {showPreview ? '👁️ Preview On' : '👁️ Preview'}
                </button>
              )}
            </div>

            {editingMode === 'traditional' ? (
              <div className={showPreview ? "grid grid-cols-2 gap-6" : "space-y-4"}>
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className={typography.h3}>Card Configuration</h3>
                    <button
                      type="button"
                      onClick={() => setShowJSON(!showJSON)}
                      className={`px-4 py-1.5 text-sm ${components.buttonSecondary}`}
                    >
                      {showJSON ? 'Hide JSON' : 'Show JSON'}
                    </button>
                  </div>

                  {showJSON ? (
                  <div>
                    <label className={typography.label}>Content (JSON)</label>
                    <textarea
                      className={`w-full p-3 ${components.inputs.base} h-96 font-mono text-sm`}
                      value={JSON.stringify(traditionalContent, null, 2)}
                      onChange={(e) => {
                        try {
                          const parsed = JSON.parse(e.target.value);
                          setTraditionalContent(parsed);
                        } catch {
                          // Invalid JSON, don't update
                        }
                      }}
                      placeholder="Enter JSON content"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Text Content Section */}
                    <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.lg} overflow-hidden`}>
                      <div className={`${surfaces.subtleGlass} px-4 py-3 border-b ${colors.slate.border}`}>
                        <h4 className={typography.h4}>Text Content</h4>
                      </div>
                      <div className="space-y-4 p-4">
                        <div>
                          <label className={typography.label}>Title</label>
                          <input
                            type="text"
                            className={components.inputs.base}
                            value={traditionalContent.text?.title || ''}
                            onChange={(e) => setTraditionalContent(prev => ({
                              ...prev,
                              text: { ...prev.text, title: e.target.value }
                            }))}
                            placeholder="Card title..."
                          />
                        </div>
                        
                        <div>
                          <label className={typography.label}>Subtitle</label>
                          <input
                            type="text"
                            className={components.inputs.base}
                            value={traditionalContent.text?.subtitle || ''}
                            onChange={(e) => setTraditionalContent(prev => ({
                              ...prev,
                              text: { ...prev.text, subtitle: e.target.value }
                            }))}
                            placeholder="Card subtitle..."
                          />
                        </div>
                        
                        <div>
                          <label className={typography.label}>Description</label>
                          <textarea
                            rows={4}
                            className={components.inputs.base}
                            value={traditionalContent.text?.description || ''}
                            onChange={(e) => setTraditionalContent(prev => ({
                              ...prev,
                              text: { ...prev.text, description: e.target.value }
                            }))}
                            placeholder="Card description..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Call to Action Section */}
                    <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.lg} overflow-hidden`}>
                      <div className={`${surfaces.subtleGlass} px-4 py-3 border-b ${colors.slate.border}`}>
                        <h4 className={typography.h4}>Call to Action</h4>
                      </div>
                      <div className="space-y-4 p-4">
                        <div>
                          <label className={typography.label}>CTA Title</label>
                          <input
                            type="text"
                            className={components.inputs.base}
                            value={traditionalContent.cta?.title || ''}
                            onChange={(e) => setTraditionalContent(prev => ({
                              ...prev,
                              cta: { ...prev.cta, title: e.target.value, url: prev.cta?.url || '' }
                            }))}
                            placeholder="Button text..."
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">CTA URL</label>
                          <input
                            type="text"
                            className="w-full p-2 border border-gray-300 rounded-md"
                            value={traditionalContent.cta?.url || ''}
                            onChange={(e) => setTraditionalContent(prev => ({
                              ...prev,
                              cta: { ...prev.cta, url: e.target.value, title: prev.cta?.title || '' }
                            }))}
                            placeholder="/chapter-2 or https://external-url.com"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Use format: /chapter-X-sub-name for sub-chapters
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Start CTA Text</label>
                          <input
                            type="text"
                            className="w-full p-2 border border-gray-300 rounded-md"
                            value={traditionalContent.ctaStart || ''}
                            onChange={(e) => setTraditionalContent(prev => ({
                              ...prev,
                              ctaStart: e.target.value
                            }))}
                            placeholder="Begin Journey, Start Experience..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Media Content Section */}
                    <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.lg} overflow-hidden`}>
                      <div className={`${surfaces.subtleGlass} px-4 py-3 border-b ${colors.slate.border}`}>
                        <h4 className={typography.h4}>Media Content</h4>
                      </div>
                      <div className="space-y-4 p-4">
                        {/* Upload Section */}
                        <div className="bg-blue-50 border border-blue-200 rounded p-4 space-y-3">
                          <h4 className="text-sm font-semibold text-blue-900">Upload Files</h4>
                          <div className="flex gap-2 flex-wrap">
                            {/* Custom Video Upload */}
                            <div className="relative">
                              <input
                                type="file"
                                id="video-upload-input"
                                className="hidden"
                                accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
                                onChange={handleVideoUpload}
                                disabled={videoProcessing}
                              />
                              <button
                                type="button"
                                onClick={() => document.getElementById('video-upload-input')?.click()}
                                disabled={videoProcessing}
                                className={`px-4 py-2 text-white rounded text-sm transition-colors ${
                                  videoProcessing 
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                              >
                                📹 {videoProcessing ? 'Processing...' : 'Upload Video'}
                              </button>
                            </div>
                            
                            <ObjectUploader
                              maxNumberOfFiles={1}
                              maxFileSize={104857600}
                              allowedFileTypes={['image/*']}
                              onGetUploadParameters={getUploadParameters}
                              onComplete={handleUploadComplete}
                              buttonClassName="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                            >
                              🖼️ Upload Image
                            </ObjectUploader>
                            
                            <ObjectUploader
                              maxNumberOfFiles={1}
                              maxFileSize={104857600}
                              allowedFileTypes={['audio/*']}
                              onGetUploadParameters={getUploadParameters}
                              onComplete={handleUploadComplete}
                              buttonClassName="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                            >
                              🎵 Upload Audio
                            </ObjectUploader>
                          </div>
                          
                          {/* Video Upload Progress */}
                          {videoTranscodingStatus === 'uploading' && (
                            <div className="text-sm space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-blue-700 font-medium">Uploading video...</span>
                                <span className="text-blue-600">{videoUploadProgress}%</span>
                              </div>
                              <div className="w-full bg-blue-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${videoUploadProgress}%` }}
                                />
                              </div>
                            </div>
                          )}
                          
                          {/* Video Processing Status */}
                          {videoTranscodingStatus === 'processing' && (
                            <div className="text-sm bg-yellow-100 border border-yellow-200 px-3 py-2 rounded">
                              <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-600 border-t-transparent"></div>
                                <span className="text-yellow-800 font-medium">Processing video...</span>
                              </div>
                              {transcodingDetails.message && (
                                <p className="text-yellow-700 mt-1">{transcodingDetails.message}</p>
                              )}
                            </div>
                          )}
                          
                          {/* Video Completed Status */}
                          {videoTranscodingStatus === 'completed' && (
                            <div className="text-sm text-green-700 bg-green-100 border border-green-200 px-3 py-2 rounded">
                              ✓ {transcodingDetails.message || 'Video ready for playback'}
                            </div>
                          )}
                          
                          {/* Video Error Status */}
                          {videoTranscodingStatus === 'error' && (
                            <div className={`text-sm ${colors.error.textLight} ${colors.error.bgLight} ${colors.error.borderLight} border px-3 py-2 ${borders.radius.md}`}>
                              ✗ {transcodingDetails.message || 'Video upload failed'}
                            </div>
                          )}
                          
                          {/* Image/Audio Upload Status */}
                          {uploadStatus && (
                            <div className="text-sm text-green-700 bg-green-100 px-3 py-2 rounded">
                              {uploadStatus}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">Video URL</label>
                          <input
                            type="text"
                            className="w-full p-2 border border-gray-300 rounded-md"
                            value={traditionalContent.video?.url || ''}
                            onChange={(e) => setTraditionalContent(prev => ({
                              ...prev,
                              video: {
                                ...prev.video,
                                url: e.target.value,
                                width: prev.video?.width || 1920,
                                height: prev.video?.height || 1080
                              }
                            }))}
                            placeholder="1-crawling, 1-poem1, or full URL..."
                          />
                        </div>

                        <div className="border-t pt-3">
                          <label className="block text-sm font-medium mb-2">Or Upload Video File</label>
                          <div className="flex items-center gap-3">
                            <label className={`flex-1 px-4 py-2 rounded cursor-pointer text-center transition-colors ${
                              videoProcessing 
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}>
                              <input
                                type="file"
                                accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
                                onChange={handleVideoUpload}
                                disabled={videoProcessing}
                                className="hidden"
                              />
                              {videoProcessing ? 'Processing...' : '📹 Choose Video File'}
                            </label>
                            {traditionalContent.video?.url && (
                              <button
                                type="button"
                                onClick={() => setTraditionalContent(prev => ({
                                  ...prev,
                                  video: undefined
                                }))}
                                className={`px-3 py-2 text-sm ${colors.error.textLight} ${colors.error.hoverTextDark} ${colors.error.borderLight} border ${borders.radius.md}`}
                              >
                                Clear
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Max 2GB • Supported: MP4, MOV, AVI, WebM • Auto-transcodes to adaptive HLS
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Width</label>
                            <input
                              type="number"
                              className="w-full p-2 border border-gray-300 rounded-md"
                              value={traditionalContent.video?.width || 1920}
                              onChange={(e) => setTraditionalContent(prev => ({
                                ...prev,
                                video: {
                                  ...prev.video,
                                  width: parseInt(e.target.value) || 1920,
                                  url: prev.video?.url || '',
                                  height: prev.video?.height || 1080
                                }
                              }))}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">Height</label>
                            <input
                              type="number"
                              className="w-full p-2 border border-gray-300 rounded-md"
                              value={traditionalContent.video?.height || 1080}
                              onChange={(e) => setTraditionalContent(prev => ({
                                ...prev,
                                video: {
                                  ...prev.video,
                                  height: parseInt(e.target.value) || 1080,
                                  url: prev.video?.url || '',
                                  width: prev.video?.width || 1920
                                }
                              }))}
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              className="mr-2"
                              checked={traditionalContent.video?.audio || false}
                              onChange={(e) => setTraditionalContent(prev => ({
                                ...prev,
                                video: {
                                  ...prev.video,
                                  audio: e.target.checked,
                                  url: prev.video?.url || '',
                                  width: prev.video?.width || 1920,
                                  height: prev.video?.height || 1080
                                }
                              }))}
                            />
                            <span className="text-sm">Has Audio</span>
                          </label>
                          
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              className="mr-2"
                              checked={traditionalContent.video?.audioMuted || false}
                              onChange={(e) => setTraditionalContent(prev => ({
                                ...prev,
                                video: {
                                  ...prev.video,
                                  audioMuted: e.target.checked,
                                  url: prev.video?.url || '',
                                  width: prev.video?.width || 1920,
                                  height: prev.video?.height || 1080
                                }
                              }))}
                            />
                            <span className="text-sm">Mute Audio</span>
                          </label>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">Type</label>
                            <select
                              className="p-2 border border-gray-300 rounded-md"
                              value={traditionalContent.video?.type || 'background'}
                              onChange={(e) => setTraditionalContent(prev => ({
                                ...prev,
                                video: {
                                  ...prev.video,
                                  type: e.target.value as 'background' | 'immersive',
                                  url: prev.video?.url || '',
                                  width: prev.video?.width || 1920,
                                  height: prev.video?.height || 1080
                                }
                              }))}
                            >
                              <option value="background">Background</option>
                              <option value="immersive">Immersive</option>
                            </select>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Image URL</label>
                          <input
                            type="text"
                            className="w-full p-2 border border-gray-300 rounded-md"
                            value={traditionalContent.image?.url || ''}
                            onChange={(e) => setTraditionalContent(prev => ({
                              ...prev,
                              image: {
                                ...prev.image,
                                url: e.target.value,
                                width: prev.image?.width || 1920,
                                height: prev.image?.height || 1080
                              }
                            }))}
                            placeholder="image-filename.jpg or full URL..."
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Audio URL</label>
                          <input
                            type="text"
                            className="w-full p-2 border border-gray-300 rounded-md"
                            value={traditionalContent.audio?.url || ''}
                            onChange={(e) => setTraditionalContent(prev => ({
                              ...prev,
                              audio: {
                                ...prev.audio,
                                url: e.target.value
                              }
                            }))}
                            placeholder="audio.mp3 or full URL..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Theme & Styling Section */}
                    <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.lg} overflow-hidden`}>
                      <div className={`${surfaces.subtleGlass} px-4 py-3 border-b ${colors.slate.border}`}>
                        <h4 className={typography.h4}>Theme & Styling</h4>
                      </div>
                      <div className="space-y-4 p-4">
                        <ColorPicker
                          label="Background Color"
                          value={traditionalContent.theme?.background || '#000000'}
                          onChange={(color) => setTraditionalContent(prev => ({
                            ...prev,
                            theme: { ...prev.theme, background: color }
                          }))}
                          showSavedColors={true}
                        />
                        
                        <div className="grid grid-cols-3 gap-4">
                          <ColorPicker
                            label="Title Color"
                            value={traditionalContent.theme?.title || '#ffffff'}
                            onChange={(color) => setTraditionalContent(prev => ({
                              ...prev,
                              theme: { ...prev.theme, title: color }
                            }))}
                            showSavedColors={true}
                          />
                          
                          <ColorPicker
                            label="Subtitle Color"
                            value={traditionalContent.theme?.subtitle || '#ffffff'}
                            onChange={(color) => setTraditionalContent(prev => ({
                              ...prev,
                              theme: { ...prev.theme, subtitle: color }
                            }))}
                            showSavedColors={true}
                          />
                          
                          <ColorPicker
                            label="Description Color"
                            value={traditionalContent.theme?.description || '#ffffff'}
                            onChange={(color) => setTraditionalContent(prev => ({
                              ...prev,
                              theme: { ...prev.theme, description: color }
                            }))}
                            showSavedColors={true}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Mix Blend Mode</label>
                          <select
                            className="w-full p-2 border border-gray-300 rounded-md"
                            value={traditionalContent.theme?.mix || 'normal'}
                            onChange={(e) => setTraditionalContent(prev => ({
                              ...prev,
                              theme: { 
                                ...prev.theme, 
                                mix: e.target.value as any
                              }
                            }))}
                          >
                            <option value="normal">Normal</option>
                            <option value="multiply">Multiply</option>
                            <option value="screen">Screen</option>
                            <option value="overlay">Overlay</option>
                            <option value="darken">Darken</option>
                            <option value="lighten">Lighten</option>
                            <option value="color-dodge">Color Dodge</option>
                            <option value="color-burn">Color Burn</option>
                            <option value="hard-light">Hard Light</option>
                            <option value="soft-light">Soft Light</option>
                            <option value="difference">Difference</option>
                            <option value="exclusion">Exclusion</option>
                          </select>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              className="mr-2"
                              checked={traditionalContent.theme?.shadow || false}
                              onChange={(e) => setTraditionalContent(prev => ({
                                ...prev,
                                theme: { ...prev.theme, shadow: e.target.checked }
                              }))}
                            />
                            <span className="text-sm">Text Shadow</span>
                          </label>
                          
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              className="mr-2"
                              checked={traditionalContent.theme?.invert || false}
                              onChange={(e) => setTraditionalContent(prev => ({
                                ...prev,
                                theme: { ...prev.theme, invert: e.target.checked }
                              }))}
                            />
                            <span className="text-sm">Invert CTA</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* AR Configuration Section */}
                    <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.lg} overflow-hidden`}>
                      <div className={`${surfaces.subtleGlass} px-4 py-3 border-b ${colors.slate.border}`}>
                        <h4 className={typography.h4}>🥽 AR Configuration</h4>
                      </div>
                      <div className="space-y-4 p-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">AR Mode</label>
                          <select
                            className="w-full p-2 border border-gray-300 rounded-md"
                            value={traditionalContent.ar?.mode || 'auto'}
                            onChange={(e) => setTraditionalContent(prev => ({
                              ...prev,
                              ar: { 
                                ...(prev.ar || {}), 
                                mode: e.target.value as 'auto' | 'object' | 'marker' | 'location'
                              }
                            }))}
                          >
                            <option value="auto">Auto (Smart Detection)</option>
                            <option value="object">Object AR (iOS/Android)</option>
                            <option value="marker">Marker AR (Image Tracking)</option>
                            <option value="location">Location AR (GPS-based)</option>
                          </select>
                        </div>

                        {/* Object AR Configuration */}
                        {(!traditionalContent.ar?.mode || traditionalContent.ar?.mode === 'auto' || traditionalContent.ar?.mode === 'object') && (
                          <div className="border-t pt-4 space-y-4">
                            <h4 className="text-sm font-semibold text-blue-600">Object AR Settings</h4>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium mb-1">Android Model (.glb)</label>
                                <input
                                  type="text"
                                  className="w-full p-2 border border-gray-300 rounded-md"
                                  value={traditionalContent.ar?.glbUrl || ''}
                                  onChange={(e) => setTraditionalContent(prev => ({
                                    ...prev,
                                    ar: { ...(prev.ar || {}), glbUrl: e.target.value }
                                  }))}
                                  placeholder="model.glb"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium mb-1">iOS Model (.usdz)</label>
                                <input
                                  type="text"
                                  className="w-full p-2 border border-gray-300 rounded-md"
                                  value={traditionalContent.ar?.usdzUrl || ''}
                                  onChange={(e) => setTraditionalContent(prev => ({
                                    ...prev,
                                    ar: { ...(prev.ar || {}), usdzUrl: e.target.value }
                                  }))}
                                  placeholder="model.usdz"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium mb-1">Preview Image</label>
                                <input
                                  type="text"
                                  className="w-full p-2 border border-gray-300 rounded-md"
                                  value={traditionalContent.ar?.poster || ''}
                                  onChange={(e) => setTraditionalContent(prev => ({
                                    ...prev,
                                    ar: { ...(prev.ar || {}), poster: e.target.value }
                                  }))}
                                  placeholder="preview.jpg"
                                />
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium mb-1">Scale</label>
                                <input
                                  type="text"
                                  className="w-full p-2 border border-gray-300 rounded-md"
                                  value={traditionalContent.ar?.scale || ''}
                                  onChange={(e) => setTraditionalContent(prev => ({
                                    ...prev,
                                    ar: { ...(prev.ar || {}), scale: e.target.value }
                                  }))}
                                  placeholder="1 1 1"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium mb-1">Placement</label>
                                <select
                                  className="w-full p-2 border border-gray-300 rounded-md"
                                  value={traditionalContent.ar?.placement || 'floor'}
                                  onChange={(e) => setTraditionalContent(prev => ({
                                    ...prev,
                                    ar: { 
                                      ...(prev.ar || {}), 
                                      placement: e.target.value as 'floor' | 'wall'
                                    }
                                  }))}
                                >
                                  <option value="floor">Floor</option>
                                  <option value="wall">Wall</option>
                                </select>
                              </div>
                              
                              <label className="flex items-center pt-6">
                                <input
                                  type="checkbox"
                                  className="mr-2"
                                  checked={traditionalContent.ar?.cameraControls || false}
                                  onChange={(e) => setTraditionalContent(prev => ({
                                    ...prev,
                                    ar: { ...(prev.ar || {}), cameraControls: e.target.checked }
                                  }))}
                                />
                                <span className="text-sm">Camera Controls</span>
                              </label>
                              
                              <label className="flex items-center pt-6">
                                <input
                                  type="checkbox"
                                  className="mr-2"
                                  checked={traditionalContent.ar?.autoRotate || false}
                                  onChange={(e) => setTraditionalContent(prev => ({
                                    ...prev,
                                    ar: { ...(prev.ar || {}), autoRotate: e.target.checked }
                                  }))}
                                />
                                <span className="text-sm">Auto Rotate</span>
                              </label>
                            </div>
                          </div>
                        )}

                        {/* Marker AR Notice */}
                        {traditionalContent.ar?.mode === 'marker' && (
                          <div className="border-t pt-4">
                            <p className="text-sm text-gray-600">
                              Marker AR configuration requires complex nested data. Use the JSON editor (click "Show JSON" above) to configure markers.
                            </p>
                          </div>
                        )}

                        {/* Location AR Notice */}
                        {traditionalContent.ar?.mode === 'location' && (
                          <div className="border-t pt-4">
                            <p className="text-sm text-gray-600">
                              Location AR configuration requires complex nested data. Use the JSON editor (click "Show JSON" above) to configure locations.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PlayCanvas Configuration Section */}
                    <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.lg} overflow-hidden`}>
                      <div className={`${surfaces.subtleGlass} px-4 py-3 border-b ${colors.slate.border}`}>
                        <h4 className={typography.h4}>🎮 PlayCanvas Configuration</h4>
                      </div>
                      <div className="space-y-4 p-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Integration Type</label>
                          <select
                            className="w-full p-2 border border-gray-300 rounded-md"
                            value={traditionalContent.playcanvas?.type || 'iframe'}
                            onChange={(e) => setTraditionalContent(prev => ({
                              ...prev,
                              playcanvas: { 
                                ...(prev.playcanvas || {}), 
                                type: e.target.value as 'iframe' | 'engine' | 'self-hosted'
                              }
                            }))}
                          >
                            <option value="iframe">Iframe (Embedded Project)</option>
                            <option value="engine">Engine (Custom Scene)</option>
                            <option value="self-hosted">Self-Hosted Build</option>
                          </select>
                        </div>

                        {traditionalContent.playcanvas?.type === 'iframe' && (
                          <div>
                            <label className="block text-sm font-medium mb-1">Project ID</label>
                            <input
                              type="text"
                              className="w-full p-2 border border-gray-300 rounded-md"
                              value={traditionalContent.playcanvas?.projectId || ''}
                              onChange={(e) => setTraditionalContent(prev => ({
                                ...prev,
                                playcanvas: { ...(prev.playcanvas || {}), projectId: e.target.value }
                              }))}
                              placeholder="your-project-id"
                            />
                          </div>
                        )}
                        
                        {traditionalContent.playcanvas?.type === 'self-hosted' && (
                          <div>
                            <label className="block text-sm font-medium mb-1">Build Path</label>
                            <input
                              type="text"
                              className="w-full p-2 border border-gray-300 rounded-md"
                              value={traditionalContent.playcanvas?.buildPath || ''}
                              onChange={(e) => setTraditionalContent(prev => ({
                                ...prev,
                                playcanvas: { ...(prev.playcanvas || {}), buildPath: e.target.value }
                              }))}
                              placeholder="/path/to/build/"
                            />
                          </div>
                        )}
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Fill Mode</label>
                          <select
                            className="w-full p-2 border border-gray-300 rounded-md"
                            value={traditionalContent.playcanvas?.fillMode || 'KEEP_ASPECT'}
                            onChange={(e) => setTraditionalContent(prev => ({
                              ...prev,
                              playcanvas: { 
                                ...(prev.playcanvas || {}), 
                                fillMode: e.target.value as 'FILL_WINDOW' | 'KEEP_ASPECT'
                              }
                            }))}
                          >
                            <option value="KEEP_ASPECT">Keep Aspect</option>
                            <option value="FILL_WINDOW">Fill Window</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Width (optional)</label>
                            <input
                              type="number"
                              className="w-full p-2 border border-gray-300 rounded-md"
                              value={traditionalContent.playcanvas?.width || ''}
                              onChange={(e) => setTraditionalContent(prev => ({
                                ...prev,
                                playcanvas: { 
                                  ...(prev.playcanvas || {}), 
                                  width: e.target.value ? parseInt(e.target.value) : undefined
                                }
                              }))}
                              placeholder="800"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">Height (optional)</label>
                            <input
                              type="number"
                              className="w-full p-2 border border-gray-300 rounded-md"
                              value={traditionalContent.playcanvas?.height || ''}
                              onChange={(e) => setTraditionalContent(prev => ({
                                ...prev,
                                playcanvas: { 
                                  ...(prev.playcanvas || {}), 
                                  height: e.target.value ? parseInt(e.target.value) : undefined
                                }
                              }))}
                              placeholder="600"
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              className="mr-2"
                              checked={traditionalContent.playcanvas?.transparency || false}
                              onChange={(e) => setTraditionalContent(prev => ({
                                ...prev,
                                playcanvas: { ...(prev.playcanvas || {}), transparency: e.target.checked }
                              }))}
                            />
                            <span className="text-sm">Transparency</span>
                          </label>
                          
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              className="mr-2"
                              checked={traditionalContent.playcanvas?.autoPlay || false}
                              onChange={(e) => setTraditionalContent(prev => ({
                                ...prev,
                                playcanvas: { ...(prev.playcanvas || {}), autoPlay: e.target.checked }
                              }))}
                            />
                            <span className="text-sm">Auto Play</span>
                          </label>
                        </div>

                        {traditionalContent.playcanvas?.type === 'engine' && (
                          <div className="border-t pt-4">
                            <p className="text-sm text-gray-600">
                              Engine scene configuration requires complex nested data. Use the JSON editor (click "Show JSON" above) to configure the scene.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Custom Buttons Section */}
                    <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.lg} overflow-hidden`}>
                      <div className={`${surfaces.subtleGlass} px-4 py-3 border-b ${colors.slate.border} flex items-center justify-between`}>
                        <h4 className={typography.h4}>🔘 Custom Buttons</h4>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="mr-2"
                            checked={showButtons}
                            onChange={(e) => setShowButtons(e.target.checked)}
                          />
                          <span className={`text-sm font-normal ${colors.slate.text}`}>Enable Editor</span>
                        </label>
                      </div>
                      {showButtons && (
                        <div className="p-4">
                          <CardEditorButtons
                            cardData={traditionalContent}
                            onCardDataChange={(newCardData) => setTraditionalContent(newCardData)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
                </div>
                
                {/* Preview Panel */}
                {showPreview && (
                  <div className="sticky top-0 h-fit">
                    <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.lg} overflow-hidden`}>
                      <div className={`${surfaces.subtleGlass} px-4 py-3 border-b ${colors.slate.border}`}>
                        <h4 className={typography.h4}>👁️ Live Preview</h4>
                      </div>
                      <div className="p-4">
                        <CMSCardPreview data={traditionalContent} className="min-h-[400px]" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="min-h-[400px]">
                <VisualCardEditor
                  initialLayout={visualLayout}
                  onChange={(layout) => setVisualLayout(layout)}
                  csrfToken={csrfToken}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Sort Order</label>
                <input
                  type="number"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={order}
                  onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                  min="0"
                />
              </div>

              <div className="flex items-center space-x-2 pt-7">
                <input
                  type="checkbox"
                  id="hasAR"
                  checked={hasAR}
                  onChange={(e) => setHasAR(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="hasAR" className="text-sm font-medium">
                  Has AR Content
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-700/50 mt-6">
              <button 
                type="button" 
                onClick={onClose}
                className={components.buttonSecondary}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className={components.buttonPrimary}
              >
                {loading ? 'Saving...' : editMode ? 'Update Card' : 'Create Card'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
