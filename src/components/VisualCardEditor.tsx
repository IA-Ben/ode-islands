'use client';

import { useState } from 'react';
import { VisualCardLayout, CardElement, CardElementType, createDefaultElement, createEmptyLayout } from '@/../../shared/cardTypes';
import { CardRenderer } from './CardRenderer';
import { MediaSelectorModal } from './cms/MediaSelectorModal';
import type { MediaItem } from '@/hooks/useMedia';
import { uploadVideo, VideoUploadStatus, VideoUploadProgress, VideoTranscodingStatus } from '@/utils/videoUpload';

interface VisualCardEditorProps {
  initialLayout?: VisualCardLayout;
  onChange: (layout: VisualCardLayout) => void;
  csrfToken: string;
}

export function VisualCardEditor({ initialLayout, onChange, csrfToken }: VisualCardEditorProps) {
  const [layout, setLayout] = useState<VisualCardLayout>(
    initialLayout || createEmptyLayout()
  );
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [mediaSelectType, setMediaSelectType] = useState<'image' | 'video' | null>(null);
  const [mediaSelectElementId, setMediaSelectElementId] = useState<string | null>(null);
  
  const [videoUploadProgress, setVideoUploadProgress] = useState<Record<string, number>>({});
  const [videoUploadStatus, setVideoUploadStatus] = useState<Record<string, VideoUploadStatus>>({});
  const [videoStatusMessage, setVideoStatusMessage] = useState<Record<string, string>>({});
  
  const updateLayout = (newLayout: VisualCardLayout) => {
    setLayout(newLayout);
    onChange(newLayout);
  };
  
  const addElement = (type: CardElementType) => {
    const nextOrder = layout.elements.length > 0
      ? Math.max(...layout.elements.map(el => el.order)) + 1
      : 0;
    
    const newElement = createDefaultElement(type, nextOrder);
    updateLayout({
      ...layout,
      elements: [...layout.elements, newElement],
    });
    setSelectedElementId(newElement.id);
  };
  
  const deleteElement = (elementId: string) => {
    const filteredElements = layout.elements.filter((el) => el.id !== elementId);
    
    const reindexedElements = filteredElements.map((el, index) => ({
      ...el,
      order: index,
    }));
    
    updateLayout({
      ...layout,
      elements: reindexedElements,
    });
    setSelectedElementId(null);
  };
  
  const moveElement = (elementId: string, direction: 'up' | 'down') => {
    const index = layout.elements.findIndex((el) => el.id === elementId);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= layout.elements.length) return;
    
    const newElements = [...layout.elements];
    [newElements[index], newElements[newIndex]] = [newElements[newIndex], newElements[index]];
    
    newElements.forEach((el, i) => {
      el.order = i;
    });
    
    updateLayout({ ...layout, elements: newElements });
  };
  
  const updateElement = (elementId: string, updates: Partial<CardElement>) => {
    updateLayout({
      ...layout,
      elements: layout.elements.map((el) =>
        el.id === elementId ? { ...el, ...updates } : el
      ),
    });
  };
  
  const openMediaSelector = (elementId: string, type: 'image' | 'video') => {
    setMediaSelectElementId(elementId);
    setMediaSelectType(type);
    setMediaModalOpen(true);
  };
  
  const handleMediaSelect = (media: MediaItem | MediaItem[]) => {
    if (!mediaSelectElementId) return;
    
    const selectedMedia = Array.isArray(media) ? media[0] : media;
    
    if (mediaSelectElementId === 'card-background') {
      updateLayout({
        ...layout,
        backgroundImage: selectedMedia.url,
      });
    } else {
      const element = layout.elements.find(el => el.id === mediaSelectElementId);
      if (element && (element.type === 'image' || element.type === 'video')) {
        updateElement(mediaSelectElementId, {
          properties: {
            ...element.properties,
            mediaAssetId: selectedMedia.id,
            src: selectedMedia.url,
          }
        } as Partial<CardElement>);
      }
    }
    
    setMediaModalOpen(false);
    setMediaSelectElementId(null);
    setMediaSelectType(null);
  };
  
  const handleVideoUpload = async (elementId: string, file: File) => {
    setVideoUploadProgress(prev => ({ ...prev, [elementId]: 0 }));
    setVideoUploadStatus(prev => ({ ...prev, [elementId]: 'uploading' }));
    setVideoStatusMessage(prev => ({ ...prev, [elementId]: 'Uploading video...' }));
    
    const result = await uploadVideo(
      file,
      csrfToken,
      (progress: VideoUploadProgress) => {
        setVideoUploadProgress(prev => ({ ...prev, [elementId]: progress.percentage }));
      },
      (status: VideoTranscodingStatus) => {
        setVideoUploadStatus(prev => ({ ...prev, [elementId]: status.status }));
        setVideoStatusMessage(prev => ({ ...prev, [elementId]: status.message || '' }));
      }
    );
    
    if (result.success && result.videoId) {
      const element = layout.elements.find(el => el.id === elementId);
      if (element && element.type === 'video') {
        updateElement(elementId, {
          properties: {
            ...element.properties,
            src: result.playbackUrl || result.videoId,
            mediaAssetId: result.mediaAssetId,
          }
        } as Partial<CardElement>);
      }
      
      setTimeout(() => {
        setVideoUploadStatus(prev => {
          const updated = { ...prev };
          delete updated[elementId];
          return updated;
        });
        setVideoStatusMessage(prev => {
          const updated = { ...prev };
          delete updated[elementId];
          return updated;
        });
        setVideoUploadProgress(prev => {
          const updated = { ...prev };
          delete updated[elementId];
          return updated;
        });
      }, 3000);
    }
  };
  
  const selectedElement = layout.elements.find((el) => el.id === selectedElementId);
  
  return (
    <>
      <div className="visual-card-editor grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Add Elements</h3>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => addElement('text')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Text
            </button>
            <button
              type="button"
              onClick={() => addElement('image')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Image
            </button>
            <button
              type="button"
              onClick={() => addElement('video')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Video
            </button>
            <button
              type="button"
              onClick={() => addElement('button')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Button
            </button>
            <button
              type="button"
              onClick={() => addElement('divider')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Divider
            </button>
            <button
              type="button"
              onClick={() => addElement('spacer')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Spacer
            </button>
          </div>
          
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Card Settings</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Background Color</label>
                <input
                  type="color"
                  value={layout.backgroundColor || '#ffffff'}
                  onChange={(e) => updateLayout({ ...layout, backgroundColor: e.target.value })}
                  className="w-full h-10 rounded border"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Background Image</label>
                <button
                  type="button"
                  onClick={() => {
                    setMediaSelectElementId('card-background');
                    setMediaSelectType('image');
                    setMediaModalOpen(true);
                  }}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                >
                  {layout.backgroundImage ? 'Change Image' : 'Select Image'}
                </button>
                {layout.backgroundImage && (
                  <button
                    type="button"
                    onClick={() => updateLayout({ ...layout, backgroundImage: undefined })}
                    className="w-full mt-1 px-4 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                  >
                    Remove Image
                  </button>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Padding (px)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={layout.padding?.top ?? ''}
                    onChange={(e) => updateLayout({
                      ...layout,
                      padding: {
                        ...layout.padding,
                        top: e.target.value ? parseInt(e.target.value) : undefined
                      }
                    })}
                    className="w-full p-2 border rounded text-sm"
                    placeholder="Top"
                  />
                  <input
                    type="number"
                    value={layout.padding?.right ?? ''}
                    onChange={(e) => updateLayout({
                      ...layout,
                      padding: {
                        ...layout.padding,
                        right: e.target.value ? parseInt(e.target.value) : undefined
                      }
                    })}
                    className="w-full p-2 border rounded text-sm"
                    placeholder="Right"
                  />
                  <input
                    type="number"
                    value={layout.padding?.bottom ?? ''}
                    onChange={(e) => updateLayout({
                      ...layout,
                      padding: {
                        ...layout.padding,
                        bottom: e.target.value ? parseInt(e.target.value) : undefined
                      }
                    })}
                    className="w-full p-2 border rounded text-sm"
                    placeholder="Bottom"
                  />
                  <input
                    type="number"
                    value={layout.padding?.left ?? ''}
                    onChange={(e) => updateLayout({
                      ...layout,
                      padding: {
                        ...layout.padding,
                        left: e.target.value ? parseInt(e.target.value) : undefined
                      }
                    })}
                    className="w-full p-2 border rounded text-sm"
                    placeholder="Left"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              {showPreview ? 'Hide' : 'Show'} Preview
            </button>
          </div>
        </div>
        
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Canvas</h3>
            <div className="border-2 border-dashed border-gray-300 rounded p-4 min-h-[400px]">
              {layout.elements.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  Add elements from the toolbar to get started
                </div>
              ) : (
                layout.elements.sort((a, b) => a.order - b.order).map((element) => (
                  <div
                    key={element.id}
                    className={`
                      border-2 rounded p-3 mb-3 cursor-pointer transition-colors
                      ${selectedElementId === element.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-400'}
                    `}
                    onClick={() => setSelectedElementId(element.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">
                        {element.type.charAt(0).toUpperCase() + element.type.slice(1)} Element
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); moveElement(element.id, 'up'); }}
                          disabled={element.order === 0}
                          className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); moveElement(element.id, 'down'); }}
                          disabled={element.order === layout.elements.length - 1}
                          className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); deleteElement(element.id); }}
                          className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    {renderElementEditor(
                      element, 
                      updateElement, 
                      openMediaSelector,
                      handleVideoUpload,
                      videoUploadStatus,
                      videoUploadProgress,
                      videoStatusMessage
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
          
          {showPreview && (
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Preview</h3>
              <CardRenderer layout={layout} className="border border-gray-300 rounded" />
            </div>
          )}
        </div>
      </div>
      
      <MediaSelectorModal
        isOpen={mediaModalOpen}
        onClose={() => {
          setMediaModalOpen(false);
          setMediaSelectElementId(null);
          setMediaSelectType(null);
        }}
        onSelect={handleMediaSelect}
        filter={{ type: mediaSelectType === 'image' ? 'image/' : mediaSelectType === 'video' ? 'video/' : undefined }}
        csrfToken={csrfToken}
      />
    </>
  );
}

function renderElementEditor(
  element: CardElement,
  updateElement: (id: string, updates: any) => void,
  openMediaSelector: (elementId: string, type: 'image' | 'video') => void,
  handleVideoUpload: (elementId: string, file: File) => Promise<void>,
  videoUploadStatus: Record<string, VideoUploadStatus>,
  videoUploadProgress: Record<string, number>,
  videoStatusMessage: Record<string, string>
) {
  switch (element.type) {
    case 'text':
      return (
        <div className="space-y-2">
          <textarea
            value={element.properties.content}
            onChange={(e) => updateElement(element.id, {
              properties: { ...element.properties, content: e.target.value }
            })}
            className="w-full p-2 border rounded"
            rows={3}
            placeholder="Enter text..."
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={element.properties.variant}
              onChange={(e) => updateElement(element.id, {
                properties: { ...element.properties, variant: e.target.value }
              })}
              className="p-2 border rounded"
            >
              <option value="heading1">Heading 1</option>
              <option value="heading2">Heading 2</option>
              <option value="heading3">Heading 3</option>
              <option value="paragraph">Paragraph</option>
              <option value="caption">Caption</option>
            </select>
            <select
              value={element.properties.alignment}
              onChange={(e) => updateElement(element.id, {
                properties: { ...element.properties, alignment: e.target.value }
              })}
              className="p-2 border rounded"
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1">Text Color</label>
              <input
                type="color"
                value={element.properties.color || '#000000'}
                onChange={(e) => updateElement(element.id, {
                  properties: { ...element.properties, color: e.target.value }
                })}
                className="w-full h-8 rounded border"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Font Size (px)</label>
              <input
                type="number"
                value={element.properties.fontSize || ''}
                onChange={(e) => updateElement(element.id, {
                  properties: { ...element.properties, fontSize: e.target.value ? parseInt(e.target.value) : undefined }
                })}
                className="w-full p-1 border rounded text-sm"
                placeholder="Auto"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Font Weight</label>
            <select
              value={element.properties.fontWeight || 'normal'}
              onChange={(e) => updateElement(element.id, {
                properties: { ...element.properties, fontWeight: e.target.value as 'normal' | 'bold' }
              })}
              className="w-full p-2 border rounded text-sm"
            >
              <option value="normal">Normal</option>
              <option value="bold">Bold</option>
            </select>
          </div>
        </div>
      );
    
    case 'image':
      return (
        <div className="space-y-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openMediaSelector(element.id, 'image');
            }}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Select from Media Library
          </button>
          <div className="text-center text-sm text-gray-500">or</div>
          <input
            type="text"
            value={element.properties.src || ''}
            onChange={(e) => updateElement(element.id, {
              properties: { ...element.properties, src: e.target.value }
            })}
            className="w-full p-2 border rounded"
            placeholder="Enter image URL"
          />
          <input
            type="text"
            value={element.properties.alt}
            onChange={(e) => updateElement(element.id, {
              properties: { ...element.properties, alt: e.target.value }
            })}
            className="w-full p-2 border rounded"
            placeholder="Alt text"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1">Width</label>
              <input
                type="text"
                value={element.properties.width || ''}
                onChange={(e) => updateElement(element.id, {
                  properties: { ...element.properties, width: e.target.value }
                })}
                className="w-full p-1 border rounded text-sm"
                placeholder="auto"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Height</label>
              <input
                type="text"
                value={element.properties.height || ''}
                onChange={(e) => updateElement(element.id, {
                  properties: { ...element.properties, height: e.target.value }
                })}
                className="w-full p-1 border rounded text-sm"
                placeholder="auto"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1">Object Fit</label>
              <select
                value={element.properties.objectFit}
                onChange={(e) => updateElement(element.id, {
                  properties: { ...element.properties, objectFit: e.target.value as 'cover' | 'contain' | 'fill' }
                })}
                className="w-full p-1 border rounded text-sm"
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="fill">Fill</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Border Radius (px)</label>
              <input
                type="number"
                value={element.properties.borderRadius || ''}
                onChange={(e) => updateElement(element.id, {
                  properties: { ...element.properties, borderRadius: e.target.value ? parseInt(e.target.value) : undefined }
                })}
                className="w-full p-1 border rounded text-sm"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      );
    
    case 'video':
      const videoStatus = videoUploadStatus[element.id];
      const videoProgress = videoUploadProgress[element.id];
      const videoMessage = videoStatusMessage[element.id];
      
      return (
        <div className="space-y-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openMediaSelector(element.id, 'video');
            }}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            disabled={videoStatus === 'uploading' || videoStatus === 'processing'}
          >
            Select from Media Library
          </button>
          <div className="text-center text-sm text-gray-500">or</div>
          <div className="relative">
            <input
              type="file"
              accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleVideoUpload(element.id, file);
                }
                e.target.value = '';
              }}
              className="hidden"
              id={`video-upload-${element.id}`}
              disabled={videoStatus === 'uploading' || videoStatus === 'processing'}
            />
            <label
              htmlFor={`video-upload-${element.id}`}
              className={`w-full px-4 py-2 rounded cursor-pointer text-center block ${
                videoStatus === 'uploading' || videoStatus === 'processing'
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {videoStatus === 'uploading' ? 'Uploading...' : 
               videoStatus === 'processing' ? 'Processing...' : 
               'Upload Video'}
            </label>
          </div>
          
          {(videoStatus === 'uploading' || videoStatus === 'processing') && (
            <div className="space-y-1">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${videoProgress || 0}%` }}
                ></div>
              </div>
              {videoMessage && (
                <p className="text-xs text-gray-600 text-center">{videoMessage}</p>
              )}
            </div>
          )}
          
          {videoStatus === 'completed' && videoMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded text-sm">
              {videoMessage}
            </div>
          )}
          
          {videoStatus === 'error' && videoMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
              {videoMessage}
            </div>
          )}
          
          <div className="text-center text-sm text-gray-500">or</div>
          <input
            type="text"
            value={element.properties.src || ''}
            onChange={(e) => updateElement(element.id, {
              properties: { ...element.properties, src: e.target.value }
            })}
            className="w-full p-2 border rounded"
            placeholder="Enter video URL or ID"
          />
          <div>
            <label className="block text-xs font-medium mb-1">Poster Image URL</label>
            <input
              type="text"
              value={element.properties.poster || ''}
              onChange={(e) => updateElement(element.id, {
                properties: { ...element.properties, poster: e.target.value }
              })}
              className="w-full p-2 border rounded text-sm"
              placeholder="Optional poster image"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={element.properties.autoplay}
                onChange={(e) => updateElement(element.id, {
                  properties: { ...element.properties, autoplay: e.target.checked }
                })}
                className="rounded"
              />
              <span>Autoplay</span>
            </label>
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={element.properties.loop}
                onChange={(e) => updateElement(element.id, {
                  properties: { ...element.properties, loop: e.target.checked }
                })}
                className="rounded"
              />
              <span>Loop</span>
            </label>
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={element.properties.muted}
                onChange={(e) => updateElement(element.id, {
                  properties: { ...element.properties, muted: e.target.checked }
                })}
                className="rounded"
              />
              <span>Muted</span>
            </label>
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={element.properties.controls}
                onChange={(e) => updateElement(element.id, {
                  properties: { ...element.properties, controls: e.target.checked }
                })}
                className="rounded"
              />
              <span>Controls</span>
            </label>
          </div>
        </div>
      );
    
    case 'button':
      return (
        <div className="space-y-2">
          <input
            type="text"
            value={element.properties.text}
            onChange={(e) => updateElement(element.id, {
              properties: { ...element.properties, text: e.target.value }
            })}
            className="w-full p-2 border rounded"
            placeholder="Button text"
          />
          <div>
            <label className="block text-xs font-medium mb-1">Action Type</label>
            <select
              value={element.properties.action}
              onChange={(e) => updateElement(element.id, {
                properties: { ...element.properties, action: e.target.value as 'link' | 'navigate' | 'custom' }
              })}
              className="w-full p-2 border rounded"
            >
              <option value="link">External Link</option>
              <option value="navigate">Navigate to Chapter</option>
              <option value="custom">Custom Action</option>
            </select>
          </div>
          {element.properties.action === 'link' && (
            <input
              type="url"
              value={element.properties.url || ''}
              onChange={(e) => updateElement(element.id, {
                properties: { ...element.properties, url: e.target.value }
              })}
              className="w-full p-2 border rounded"
              placeholder="https://example.com"
            />
          )}
          {element.properties.action === 'navigate' && (
            <input
              type="text"
              value={element.properties.navigationTarget || ''}
              onChange={(e) => updateElement(element.id, {
                properties: { ...element.properties, navigationTarget: e.target.value }
              })}
              className="w-full p-2 border rounded"
              placeholder="chapter-id or /path"
            />
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1">Style</label>
              <select
                value={element.properties.variant}
                onChange={(e) => updateElement(element.id, {
                  properties: { ...element.properties, variant: e.target.value as 'primary' | 'secondary' | 'outline' }
                })}
                className="w-full p-2 border rounded text-sm"
              >
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
                <option value="outline">Outline</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Size</label>
              <select
                value={element.properties.size}
                onChange={(e) => updateElement(element.id, {
                  properties: { ...element.properties, size: e.target.value as 'small' | 'medium' | 'large' }
                })}
                className="w-full p-2 border rounded text-sm"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={element.properties.fullWidth}
              onChange={(e) => updateElement(element.id, {
                properties: { ...element.properties, fullWidth: e.target.checked }
              })}
              className="rounded"
            />
            <span>Full Width</span>
          </label>
        </div>
      );
    
    case 'divider':
      return (
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium mb-1">Style</label>
            <select
              value={element.properties.style}
              onChange={(e) => updateElement(element.id, {
                properties: { ...element.properties, style: e.target.value as 'solid' | 'dashed' | 'dotted' }
              })}
              className="w-full p-2 border rounded"
            >
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Color</label>
            <input
              type="color"
              value={element.properties.color || '#cccccc'}
              onChange={(e) => updateElement(element.id, {
                properties: { ...element.properties, color: e.target.value }
              })}
              className="w-full h-10 rounded border"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1">Thickness (px)</label>
              <input
                type="number"
                value={element.properties.thickness || 1}
                onChange={(e) => updateElement(element.id, {
                  properties: { ...element.properties, thickness: parseInt(e.target.value) || 1 }
                })}
                className="w-full p-2 border rounded"
                min="1"
                max="10"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Margin (px)</label>
              <input
                type="number"
                value={element.properties.margin || 16}
                onChange={(e) => updateElement(element.id, {
                  properties: { ...element.properties, margin: parseInt(e.target.value) || 0 }
                })}
                className="w-full p-2 border rounded"
                min="0"
              />
            </div>
          </div>
        </div>
      );
    
    case 'spacer':
      return (
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium mb-1">Height (px)</label>
            <input
              type="number"
              value={element.properties.height}
              onChange={(e) => updateElement(element.id, {
                properties: { ...element.properties, height: parseInt(e.target.value) || 0 }
              })}
              className="w-full p-2 border rounded"
              min="0"
              placeholder="24"
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Current height: {element.properties.height}px
          </div>
        </div>
      );
    
    default:
      return <div className="text-sm text-gray-500">No editable properties</div>;
  }
}
