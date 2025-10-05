'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VisualCardEditor } from '../VisualCardEditor';
import { VisualCardLayout, createEmptyLayout } from '@/../../shared/cardTypes';
import type { CardData } from '@/@typings';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { ObjectUploader } from '@/components/ObjectUploader';
import { CardEditorButtons } from '@/components/CardEditorButtons';
import { CMSCardPreview } from '@/components/CMSCardPreview';

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

  useEffect(() => {
    if (initialData) {
      if (initialData.visualLayout) {
        setVisualLayout(initialData.visualLayout);
        setEditingMode('visual');
      } else if (initialData.content?.visualLayout) {
        setVisualLayout(initialData.content.visualLayout);
        setEditingMode('visual');
      }
      setTraditionalContent(initialData.content || {});
      setOrder(initialData.order || 0);
      setHasAR(initialData.hasAR || false);
    }
  }, [initialData]);

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
      
      if (mediaType === 'video') {
        setTraditionalContent(prev => ({
          ...prev,
          video: { 
            url: mediaUrl, 
            width: prev.video?.width || 1920, 
            height: prev.video?.height || 1080, 
            audio: prev.video?.audio ?? true 
          }
        }));
      } else if (mediaType === 'image') {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>{editMode ? 'Edit Story Card' : 'Add Story Card'}</CardTitle>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
              type="button"
            >
              ×
            </button>
          </div>
        </CardHeader>

        <CardContent className="overflow-y-auto max-h-[calc(90vh-180px)] p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="flex gap-2 mb-4 justify-between items-center">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingMode('traditional')}
                  className={`px-4 py-2 rounded transition-colors ${
                    editingMode === 'traditional' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
                  className={`px-4 py-2 rounded transition-colors ${
                    editingMode === 'visual' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Visual Mode
                </button>
              </div>
              
              {editingMode === 'traditional' && (
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className={`px-4 py-2 rounded transition-colors ${
                    showPreview 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
                    <h3 className="text-lg font-semibold">Card Configuration</h3>
                    <button
                      type="button"
                      onClick={() => setShowJSON(!showJSON)}
                      className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
                    >
                      {showJSON ? 'Hide JSON' : 'Show JSON'}
                    </button>
                  </div>

                  {showJSON ? (
                  <div>
                    <label className="block text-sm font-medium mb-1">Content (JSON)</label>
                    <textarea
                      className="w-full p-2 border border-gray-300 rounded-md h-96 font-mono text-sm"
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
                    <Card className="border-gray-300">
                      <CardHeader className="bg-gray-50">
                        <CardTitle className="text-base">Text Content</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Title</label>
                          <input
                            type="text"
                            className="w-full p-2 border border-gray-300 rounded-md"
                            value={traditionalContent.text?.title || ''}
                            onChange={(e) => setTraditionalContent(prev => ({
                              ...prev,
                              text: { ...prev.text, title: e.target.value }
                            }))}
                            placeholder="Card title..."
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Subtitle</label>
                          <input
                            type="text"
                            className="w-full p-2 border border-gray-300 rounded-md"
                            value={traditionalContent.text?.subtitle || ''}
                            onChange={(e) => setTraditionalContent(prev => ({
                              ...prev,
                              text: { ...prev.text, subtitle: e.target.value }
                            }))}
                            placeholder="Card subtitle..."
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1">Description</label>
                          <textarea
                            rows={4}
                            className="w-full p-2 border border-gray-300 rounded-md"
                            value={traditionalContent.text?.description || ''}
                            onChange={(e) => setTraditionalContent(prev => ({
                              ...prev,
                              text: { ...prev.text, description: e.target.value }
                            }))}
                            placeholder="Card description..."
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Call to Action Section */}
                    <Card className="border-gray-300">
                      <CardHeader className="bg-gray-50">
                        <CardTitle className="text-base">Call to Action</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">CTA Title</label>
                          <input
                            type="text"
                            className="w-full p-2 border border-gray-300 rounded-md"
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
                      </CardContent>
                    </Card>

                    {/* Media Content Section */}
                    <Card className="border-gray-300">
                      <CardHeader className="bg-gray-50">
                        <CardTitle className="text-base">Media Content</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
                        {/* Upload Section */}
                        <div className="bg-blue-50 border border-blue-200 rounded p-4 space-y-3">
                          <h4 className="text-sm font-semibold text-blue-900">Upload Files</h4>
                          <div className="flex gap-2 flex-wrap">
                            <ObjectUploader
                              maxNumberOfFiles={1}
                              maxFileSize={104857600}
                              allowedFileTypes={['video/*']}
                              onGetUploadParameters={getUploadParameters}
                              onComplete={handleUploadComplete}
                              buttonClassName="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                            >
                              📹 Upload Video
                            </ObjectUploader>
                            
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
                      </CardContent>
                    </Card>

                    {/* Theme & Styling Section */}
                    <Card className="border-gray-300">
                      <CardHeader className="bg-gray-50">
                        <CardTitle className="text-base">Theme & Styling</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
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
                      </CardContent>
                    </Card>

                    {/* AR Configuration Section */}
                    <Card className="border-gray-300">
                      <CardHeader className="bg-gray-50">
                        <CardTitle className="text-base">🥽 AR Configuration</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
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
                      </CardContent>
                    </Card>

                    {/* PlayCanvas Configuration Section */}
                    <Card className="border-gray-300">
                      <CardHeader className="bg-gray-50">
                        <CardTitle className="text-base">🎮 PlayCanvas Configuration</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-4">
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
                      </CardContent>
                    </Card>

                    {/* Custom Buttons Section */}
                    <Card className="border-gray-300">
                      <CardHeader className="bg-gray-50 flex flex-row items-center justify-between">
                        <CardTitle className="text-base">🔘 Custom Buttons</CardTitle>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="mr-2"
                            checked={showButtons}
                            onChange={(e) => setShowButtons(e.target.checked)}
                          />
                          <span className="text-sm font-normal">Enable Editor</span>
                        </label>
                      </CardHeader>
                      {showButtons && (
                        <CardContent className="pt-4">
                          <CardEditorButtons
                            cardData={traditionalContent}
                            onCardDataChange={(newCardData) => setTraditionalContent(newCardData)}
                          />
                        </CardContent>
                      )}
                    </Card>
                  </div>
                )}
                </div>
                
                {/* Preview Panel */}
                {showPreview && (
                  <div className="sticky top-0 h-fit">
                    <Card className="border-gray-300">
                      <CardHeader className="bg-gray-50">
                        <CardTitle className="text-base">👁️ Live Preview</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <CMSCardPreview data={traditionalContent} className="min-h-[400px]" />
                      </CardContent>
                    </Card>
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

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : editMode ? 'Update Card' : 'Create Card'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
