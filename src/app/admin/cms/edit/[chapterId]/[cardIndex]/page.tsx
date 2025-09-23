'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { LazyClientCardWrapper } from '@/components/LazyComponentWrapper';
import { ObjectUploader } from '@/components/ObjectUploader';
import { CardEditorButtons } from '@/components/CardEditorButtons';
import type { CardData } from '@/@typings';

type ChapterData = {
  [key: string]: CardData[];
};

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
};

export default function CardEditorPage() {
  const params = useParams();
  const router = useRouter();
  const chapterId = params.chapterId as string;
  const cardIndex = params.cardIndex as string;
  
  const [chapters, setChapters] = useState<ChapterData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cardData, setCardData] = useState<CardData>({});
  const [user, setUser] = useState<User | null>(null);
  const [uploadedMedia, setUploadedMedia] = useState<{
    url: string;
    type: string;
    objectId: string;
  } | null>(null);
  const [csrfToken, setCsrfToken] = useState<string>('');
  
  const isNewCard = cardIndex === 'new';
  const cardIndexNum = isNewCard ? -1 : parseInt(cardIndex);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user?.isAdmin) {
      fetchCSRFToken();
      fetchChapters();
    }
  }, [user]);

  useEffect(() => {
    if (chapters[chapterId]) {
      const cards = chapters[chapterId];
      if (isNewCard) {
        // Initialize new card with default data
        setCardData({
          text: {
            title: '',
            subtitle: '',
            description: ''
          },
          theme: {
            background: '#000000',
            title: '#ffffff',
            subtitle: '#ffffff',
            description: '#ffffff'
          },
          ar: {
            mode: 'auto',
            markers: [],
            locations: []
          },
          playcanvas: {
            type: 'iframe',
            fillMode: 'KEEP_ASPECT',
            transparency: false,
            autoPlay: false
          }
        });
      } else if (cards[cardIndexNum]) {
        setCardData({ ...cards[cardIndexNum] });
      }
      setLoading(false);
    }
  }, [chapters, chapterId, cardIndexNum, isNewCard]);

  const checkAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/user');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        router.push('/admin/cms');
      }
    } catch (error: unknown) {
      console.error('Auth check failed:', error instanceof Error ? error.message : String(error));
      router.push('/admin/cms');
    }
  }, [router]);

  const fetchCSRFToken = async () => {
    try {
      const response = await fetch('/api/csrf-token', {
        credentials: 'same-origin'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.csrfToken) {
          setCsrfToken(data.csrfToken);
        }
      }
    } catch (error: unknown) {
      console.error('Error fetching CSRF token:', error instanceof Error ? error.message : String(error));
    }
  };

  const fetchChapters = async () => {
    try {
      const response = await fetch('/api/cms/chapters');
      if (response.ok) {
        const data = await response.json();
        setChapters(data);
      }
    } catch (error: unknown) {
      console.error('Error fetching chapters:', error instanceof Error ? error.message : String(error));
    }
  };

  const saveCard = async () => {
    setSaving(true);
    try {
      const updatedCards = [...(chapters[chapterId] || [])];
      
      if (isNewCard) {
        // Add new card
        updatedCards.push(cardData);
      } else {
        // Update existing card
        updatedCards[cardIndexNum] = cardData;
      }

      const response = await fetch('/api/cms/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: chapterId, cards: updatedCards }),
      });

      if (response.ok) {
        // Update local state
        setChapters(prev => ({
          ...prev,
          [chapterId]: updatedCards
        }));
        
        // Check if we need to create a sub-chapter
        const ctaUrl = cardData.cta?.url;
        if (ctaUrl && ctaUrl.startsWith('/') && ctaUrl.match(/^\/chapter-\d+-sub-\d+$/)) {
          const subChapterId = ctaUrl.substring(1); // Remove leading slash
          
          // Check if sub-chapter already exists
          const checkResponse = await fetch('/api/cms/chapters');
          const allChapters = await checkResponse.json();
          
          if (!allChapters[subChapterId]) {
            // Create the sub-chapter with a starter card
            const createSubResponse = await fetch('/api/cms/chapters', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                id: subChapterId, 
                cards: [{
                  text: {
                    title: "New Sub-Chapter",
                    subtitle: "Edit this card to customize your sub-chapter",
                    description: "This is a sub-chapter created automatically. Click to edit and customize the content."
                  },
                  theme: {
                    background: "#1a1a2e",
                    title: "#ffffff",
                    subtitle: "#cccccc"
                  },
                  ar: {
                    mode: 'auto',
                    markers: [],
                    locations: []
                  },
                  playcanvas: {
                    type: 'iframe',
                    fillMode: 'KEEP_ASPECT',
                    transparency: false,
                    autoPlay: false
                  }
                }]
              }),
            });

            if (createSubResponse.ok) {
              // Update local state with new sub-chapter
              setChapters(prev => ({
                ...prev,
                [subChapterId]: [{
                  text: {
                    title: "New Sub-Chapter",
                    subtitle: "Edit this card to customize your sub-chapter",
                    description: "This is a sub-chapter created automatically. Click to edit and customize the content."
                  },
                  theme: {
                    background: "#1a1a2e",
                    title: "#ffffff",
                    subtitle: "#cccccc"
                  },
                  ar: {
                    mode: 'auto',
                    markers: [],
                    locations: []
                  },
                  playcanvas: {
                    type: 'iframe',
                    fillMode: 'KEEP_ASPECT',
                    transparency: false,
                    autoPlay: false
                  }
                }]
              }));
              
              alert(`Sub-chapter "${subChapterId}" created successfully! You can edit it by going to /admin/cms/edit/${subChapterId}/0`);
            } else {
              console.error('Failed to create sub-chapter');
            }
          }
        }
        
        // If it was a new card, redirect to its permanent URL
        if (isNewCard) {
          const newIndex = updatedCards.length - 1;
          router.push(`/cms/edit/${chapterId}/${newIndex}`);
        }
        
        alert('Card saved successfully!');
      } else {
        alert('Failed to save card');
      }
    } catch (error: unknown) {
      console.error('Error saving card:', error instanceof Error ? error.message : String(error));
      alert('Error saving card');
    } finally {
      setSaving(false);
    }
  };

  const getUploadParameters = async (file: { name: string; type: string; size: number }) => {
    try {
      if (!csrfToken) {
        throw new Error('CSRF token not available');
      }

      // Get upload URL with real file information
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
      const mediaUrl = file.uploadURL?.split('?')[0] || '';
      const mediaType = file.type.split('/')[0]; // Get main type: image, video, audio
      
      setUploadedMedia({
        url: mediaUrl,
        type: mediaType,
        objectId: file.uploadURL?.split('/').pop()?.split('?')[0] || ''
      });

      // Update card data with the uploaded media URL
      if (mediaType === 'video') {
        setCardData(prev => ({
          ...prev,
          video: {
            ...prev.video,
            url: mediaUrl,
            width: prev.video?.width || 1920,
            height: prev.video?.height || 1080,
            audio: true // Assume uploaded videos have audio
          }
        }));
      } else if (mediaType === 'audio') {
        setCardData(prev => ({
          ...prev,
          audio: {
            ...prev.audio,
            url: mediaUrl
          }
        }));
      } else if (mediaType === 'image') {
        setCardData(prev => ({
          ...prev,
          backgroundImage: mediaUrl
        }));
      }

      alert(`${mediaType} uploaded successfully!`);
    }
  };

  if (loading) {
    return (
      <div className="scroll-container bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading Editor...</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="scroll-container bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {isNewCard ? 'Add New Card' : 'Edit Card'} - {chapterId.replace('-', ' ').toUpperCase()}
            </h1>
            <p className="text-gray-400">
              {isNewCard ? 'Creating new card' : `Editing card ${cardIndexNum + 1}`}
            </p>
          </div>
          <div className="space-x-3">
            <Button 
              onClick={() => router.push('/cms')}
              variant="outline"
            >
              ← Back to CMS
            </Button>
            <Button 
              onClick={saveCard}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving ? 'Saving...' : '💾 Save Card'}
            </Button>
          </div>
        </div>

        {/* Two-Pane Editor */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-screen">
          {/* Left Pane - Live Preview */}
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            <div className="bg-gray-800 p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold">Live Preview</h2>
              <p className="text-sm text-gray-400">Exactly as it appears in the app</p>
            </div>
            <div className="relative" style={{ height: '600px' }}>
              <div className="absolute inset-0 scale-50 origin-top-left" style={{ width: '200%', height: '200%' }}>
                <LazyClientCardWrapper 
                  componentProps={{ data: cardData, active: true }}
                />
              </div>
            </div>
          </div>

          {/* Right Pane - Editor Form */}
          <div className="bg-gray-900 rounded-lg">
            <div className="bg-gray-800 p-4 border-b border-gray-700">
              <h2 className="text-lg font-semibold">Card Properties</h2>
              <p className="text-sm text-gray-400">Edit card content and styling</p>
            </div>
            
            <div className="p-4 space-y-6 overflow-y-auto" style={{ maxHeight: '600px' }}>
              {/* Text Content Section */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-base">Text Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Title</label>
                    <input
                      type="text"
                      value={cardData.text?.title || ''}
                      onChange={(e) => setCardData(prev => ({
                        ...prev,
                        text: { ...prev.text, title: e.target.value }
                      }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      placeholder="Card title..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Subtitle</label>
                    <input
                      type="text"
                      value={cardData.text?.subtitle || ''}
                      onChange={(e) => setCardData(prev => ({
                        ...prev,
                        text: { ...prev.text, subtitle: e.target.value }
                      }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      placeholder="Card subtitle..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea
                      value={cardData.text?.description || ''}
                      onChange={(e) => setCardData(prev => ({
                        ...prev,
                        text: { ...prev.text, description: e.target.value }
                      }))}
                      rows={4}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      placeholder="Card description..."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Call to Action Section */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-base">Call to Action</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">CTA Title</label>
                    <input
                      type="text"
                      value={cardData.cta?.title || ''}
                      onChange={(e) => setCardData(prev => ({
                        ...prev,
                        cta: { ...prev.cta, title: e.target.value, url: prev.cta?.url || '' }
                      }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      placeholder="Button text..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">CTA URL</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={cardData.cta?.url || ''}
                        onChange={(e) => setCardData(prev => ({
                          ...prev,
                          cta: { ...prev.cta, url: e.target.value, title: prev.cta?.title || '' }
                        }))}
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                        placeholder="/chapter-2 or https://external-url.com"
                      />
                      <Button
                        onClick={() => {
                          const subChapterId = `${chapterId}-sub-${Date.now()}`;
                          setCardData(prev => ({
                            ...prev,
                            cta: { ...prev.cta, url: `/${subChapterId}`, title: prev.cta?.title || 'Continue' }
                          }));
                          alert(`Sub-chapter "${subChapterId}" will be created when you save. You can edit it by going to /admin/cms/edit/${subChapterId}/new`);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-xs px-3"
                      >
                        + Sub-Chapter
                      </Button>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Sub-chapters are hidden chapters accessible only via buttons. Use format: /chapter-X-sub-name
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Start CTA Text</label>
                    <input
                      type="text"
                      value={cardData.ctaStart || ''}
                      onChange={(e) => setCardData(prev => ({
                        ...prev,
                        ctaStart: e.target.value
                      }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      placeholder="Begin Journey, Start Experience..."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Media Section */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-base">Media Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* File Upload Section */}
                  <div className="p-4 bg-gray-900 rounded-lg border border-gray-600">
                    <h3 className="text-sm font-semibold mb-3 text-gray-200">Upload Media Files</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium mb-2 text-gray-400">
                          Upload Image, Video, or Audio
                        </label>
                        <ObjectUploader
                          maxNumberOfFiles={1}
                          maxFileSize={100 * 1024 * 1024} // 100MB
                          allowedFileTypes={[
                            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
                            'video/mp4', 'video/mov', 'video/quicktime', 'video/avi', 'video/x-msvideo', 'video/webm',
                            'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/mp4', 'audio/x-m4a'
                          ]}
                          onGetUploadParameters={getUploadParameters}
                          onComplete={handleUploadComplete}
                          buttonClassName="w-full bg-blue-600 hover:bg-blue-700 border border-blue-500 rounded text-white text-sm"
                        >
                          <div className="flex items-center justify-center py-3 gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            {uploadedMedia ? 'Change Media File' : '📁 Upload Media'}
                          </div>
                        </ObjectUploader>
                        <p className="text-xs text-gray-500 mt-2">
                          Images (JPG, PNG, GIF, WebP), Videos (MP4, MOV, AVI, WebM), Audio (MP3, WAV, OGG, M4A). Max 100MB.
                        </p>
                      </div>
                      
                      {uploadedMedia && (
                        <div className="p-3 bg-gray-800 rounded border">
                          <h4 className="text-sm font-medium text-gray-200 mb-2">Uploaded Successfully</h4>
                          <div className="text-xs text-gray-400">
                            📄 Type: {uploadedMedia.type} • ID: {uploadedMedia.objectId}
                          </div>
                          <div className="text-xs text-gray-400 mt-1 break-all">
                            URL: {uploadedMedia.url}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-600 pt-4">
                    <label className="block text-sm font-medium mb-2">Video URL</label>
                    <input
                      type="text"
                      value={cardData.video?.url || ''}
                      onChange={(e) => setCardData(prev => ({
                        ...prev,
                        video: { 
                          ...prev.video, 
                          url: e.target.value,
                          width: prev.video?.width || 1920,
                          height: prev.video?.height || 1080
                        }
                      }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      placeholder="1-crawling, 1-poem1, or full URL..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Width</label>
                      <input
                        type="number"
                        value={cardData.video?.width || 1920}
                        onChange={(e) => setCardData(prev => ({
                          ...prev,
                          video: { 
                            ...prev.video, 
                            width: parseInt(e.target.value) || 1920,
                            url: prev.video?.url || '',
                            height: prev.video?.height || 1080
                          }
                        }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Height</label>
                      <input
                        type="number"
                        value={cardData.video?.height || 1080}
                        onChange={(e) => setCardData(prev => ({
                          ...prev,
                          video: { 
                            ...prev.video, 
                            height: parseInt(e.target.value) || 1080,
                            url: prev.video?.url || '',
                            width: prev.video?.width || 1920
                          }
                        }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={cardData.video?.audio || false}
                        onChange={(e) => setCardData(prev => ({
                          ...prev,
                          video: { 
                            ...prev.video, 
                            audio: e.target.checked,
                            url: prev.video?.url || '',
                            width: prev.video?.width || 1920,
                            height: prev.video?.height || 1080
                          }
                        }))}
                        className="mr-2"
                      />
                      <span className="text-sm">Has Audio</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={cardData.video?.audioMuted || false}
                        onChange={(e) => setCardData(prev => ({
                          ...prev,
                          video: { 
                            ...prev.video, 
                            audioMuted: e.target.checked,
                            url: prev.video?.url || '',
                            width: prev.video?.width || 1920,
                            height: prev.video?.height || 1080
                          }
                        }))}
                        className="mr-2"
                      />
                      <span className="text-sm">Mute Audio</span>
                    </label>
                    
                    <select
                      value={cardData.video?.type || 'background'}
                      onChange={(e) => setCardData(prev => ({
                        ...prev,
                        video: { 
                          ...prev.video, 
                          type: e.target.value as 'background' | 'immersive',
                          url: prev.video?.url || '',
                          width: prev.video?.width || 1920,
                          height: prev.video?.height || 1080
                        }
                      }))}
                      className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    >
                      <option value="background">Background</option>
                      <option value="immersive">Immersive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Image URL</label>
                    <input
                      type="text"
                      value={cardData.image?.url || ''}
                      onChange={(e) => setCardData(prev => ({
                        ...prev,
                        image: { 
                          ...prev.image, 
                          url: e.target.value,
                          width: prev.image?.width || 1920,
                          height: prev.image?.height || 1080
                        }
                      }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      placeholder="image-filename.jpg or full URL..."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Theme Section */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-base">Theme & Styling</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <ColorPicker
                      label="Background Color"
                      value={cardData.theme?.background || '#000000'}
                      onChange={(color) => setCardData(prev => ({
                        ...prev,
                        theme: { ...prev.theme, background: color }
                      }))}
                      showSavedColors={true}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <ColorPicker
                        label="Title Color"
                        value={cardData.theme?.title || '#ffffff'}
                        onChange={(color) => setCardData(prev => ({
                          ...prev,
                          theme: { ...prev.theme, title: color }
                        }))}
                        showSavedColors={true}
                      />
                    </div>
                    
                    <div>
                      <ColorPicker
                        label="Subtitle Color"
                        value={cardData.theme?.subtitle || '#ffffff'}
                        onChange={(color) => setCardData(prev => ({
                          ...prev,
                          theme: { ...prev.theme, subtitle: color }
                        }))}
                        showSavedColors={true}
                      />
                    </div>
                  </div>

                  <div>
                    <ColorPicker
                      label="Description Color"
                      value={cardData.theme?.description || '#ffffff'}
                      onChange={(color) => setCardData(prev => ({
                        ...prev,
                        theme: { ...prev.theme, description: color }
                      }))}
                      showSavedColors={true}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Mix Blend Mode</label>
                    <select
                      value={cardData.theme?.mix || 'normal'}
                      onChange={(e) => setCardData(prev => ({
                        ...prev,
                        theme: { ...prev.theme, mix: e.target.value as 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'hard-light' | 'color-dodge' | 'color-burn' | 'darken' | 'lighten' | 'difference' | 'exclusion' | 'hue' | 'saturation' | 'color' | 'luminosity' }
                      }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
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

                  <div className="flex items-center gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={cardData.theme?.shadow || false}
                        onChange={(e) => setCardData(prev => ({
                          ...prev,
                          theme: { ...prev.theme, shadow: e.target.checked }
                        }))}
                        className="mr-2"
                      />
                      <span className="text-sm">Text Shadow</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={cardData.theme?.invert || false}
                        onChange={(e) => setCardData(prev => ({
                          ...prev,
                          theme: { ...prev.theme, invert: e.target.checked }
                        }))}
                        className="mr-2"
                      />
                      <span className="text-sm">Invert CTA</span>
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* AR Configuration Section */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-base">🥽 AR Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">AR Mode</label>
                    <select
                      value={cardData.ar?.mode || 'auto'}
                      onChange={(e) => setCardData(prev => ({
                        ...prev,
                        ar: { ...(prev.ar || {}), mode: e.target.value as 'auto' | 'object' | 'marker' | 'location' }
                      }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    >
                      <option value="auto">Auto (Smart Detection)</option>
                      <option value="object">Object AR (iOS/Android)</option>
                      <option value="marker">Marker AR (Image Tracking)</option>
                      <option value="location">Location AR (GPS-based)</option>
                    </select>
                  </div>

                  {/* Object AR Configuration */}
                  {(!cardData.ar?.mode || cardData.ar?.mode === 'auto' || cardData.ar?.mode === 'object') && (
                    <div className="space-y-4 border-t border-gray-600 pt-4">
                      <h4 className="text-sm font-semibold text-blue-400">Object AR Settings</h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Android Model (.glb)</label>
                          <input
                            type="text"
                            value={cardData.ar?.glbUrl || ''}
                            onChange={(e) => setCardData(prev => ({
                              ...prev,
                              ar: { ...(prev.ar || {}), glbUrl: e.target.value }
                            }))}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                            placeholder="model.glb"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-2">iOS Model (.usdz)</label>
                          <input
                            type="text"
                            value={cardData.ar?.usdzUrl || ''}
                            onChange={(e) => setCardData(prev => ({
                              ...prev,
                              ar: { ...(prev.ar || {}), usdzUrl: e.target.value }
                            }))}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                            placeholder="model.usdz"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Preview Image</label>
                          <input
                            type="text"
                            value={cardData.ar?.poster || ''}
                            onChange={(e) => setCardData(prev => ({
                              ...prev,
                              ar: { ...(prev.ar || {}), poster: e.target.value }
                            }))}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                            placeholder="preview.jpg"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-2">Scale</label>
                          <input
                            type="text"
                            value={cardData.ar?.scale || ''}
                            onChange={(e) => setCardData(prev => ({
                              ...prev,
                              ar: { ...(prev.ar || {}), scale: e.target.value }
                            }))}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                            placeholder="1 1 1"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Placement</label>
                          <select
                            value={cardData.ar?.placement || 'floor'}
                            onChange={(e) => setCardData(prev => ({
                              ...prev,
                              ar: { ...(prev.ar || {}), placement: e.target.value as 'floor' | 'wall' }
                            }))}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                          >
                            <option value="floor">Floor</option>
                            <option value="wall">Wall</option>
                          </select>
                        </div>
                        
                        <label className="flex items-center pt-6">
                          <input
                            type="checkbox"
                            checked={cardData.ar?.cameraControls || false}
                            onChange={(e) => setCardData(prev => ({
                              ...prev,
                              ar: { ...(prev.ar || {}), cameraControls: e.target.checked }
                            }))}
                            className="mr-2"
                          />
                          <span className="text-sm">Camera Controls</span>
                        </label>
                        
                        <label className="flex items-center pt-6">
                          <input
                            type="checkbox"
                            checked={cardData.ar?.autoRotate || false}
                            onChange={(e) => setCardData(prev => ({
                              ...prev,
                              ar: { ...(prev.ar || {}), autoRotate: e.target.checked }
                            }))}
                            className="mr-2"
                          />
                          <span className="text-sm">Auto Rotate</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Marker AR Configuration */}
                  {cardData.ar?.mode === 'marker' && (
                    <div className="space-y-4 border-t border-gray-600 pt-4">
                      <h4 className="text-sm font-semibold text-green-400">Marker AR Settings</h4>
                      <p className="text-xs text-gray-400">Configure image markers and associated 3D models</p>
                      
                      {cardData.ar?.markers?.map((marker, index) => (
                        <div key={index} className="space-y-4 border border-gray-600 rounded p-4">
                          <div className="flex justify-between items-center">
                            <h5 className="text-sm font-medium">Marker {index + 1}</h5>
                            <Button
                              onClick={() => setCardData(prev => ({
                                ...prev,
                                ar: {
                                  ...(prev.ar || {}),
                                  markers: prev.ar?.markers?.filter((_, i) => i !== index)
                                }
                              }))}
                              className="bg-red-600 hover:bg-red-700 text-xs px-2 py-1"
                            >
                              Remove
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-2">Marker ID</label>
                              <input
                                type="text"
                                value={marker.id}
                                onChange={(e) => {
                                  const newMarkers = [...(cardData.ar?.markers || [])];
                                  newMarkers[index] = { ...marker, id: e.target.value };
                                  setCardData(prev => ({
                                    ...prev,
                                    ar: { ...(prev.ar || {}), markers: newMarkers }
                                  }));
                                }}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                                placeholder="marker-1"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium mb-2">Physical Width (meters)</label>
                              <input
                                type="number"
                                step="0.01"
                                value={marker.physicalWidthM}
                                onChange={(e) => {
                                  const newMarkers = [...(cardData.ar?.markers || [])];
                                  newMarkers[index] = { ...marker, physicalWidthM: parseFloat(e.target.value) || 0.1 };
                                  setCardData(prev => ({
                                    ...prev,
                                    ar: { ...(prev.ar || {}), markers: newMarkers }
                                  }));
                                }}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                                placeholder="0.1"
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-2">MindAR Target File (.mind)</label>
                              <input
                                type="text"
                                value={marker.mindFileUrl || ''}
                                onChange={(e) => {
                                  const newMarkers = [...(cardData.ar?.markers || [])];
                                  newMarkers[index] = { ...marker, mindFileUrl: e.target.value };
                                  setCardData(prev => ({
                                    ...prev,
                                    ar: { ...(prev.ar || {}), markers: newMarkers }
                                  }));
                                }}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                                placeholder="marker.mind"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium mb-2">Preview Image</label>
                              <input
                                type="text"
                                value={marker.previewImageUrl || ''}
                                onChange={(e) => {
                                  const newMarkers = [...(cardData.ar?.markers || [])];
                                  newMarkers[index] = { ...marker, previewImageUrl: e.target.value };
                                  setCardData(prev => ({
                                    ...prev,
                                    ar: { ...(prev.ar || {}), markers: newMarkers }
                                  }));
                                }}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                                placeholder="marker-preview.jpg"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-2">3D Model (.glb)</label>
                            <input
                              type="text"
                              value={marker.model.glbUrl}
                              onChange={(e) => {
                                const newMarkers = [...(cardData.ar?.markers || [])];
                                newMarkers[index] = { ...marker, model: { ...marker.model, glbUrl: e.target.value } };
                                setCardData(prev => ({
                                  ...prev,
                                  ar: { ...(prev.ar || {}), markers: newMarkers }
                                }));
                              }}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                              placeholder="model.glb"
                            />
                          </div>
                        </div>
                      )) || <p className="text-gray-400 text-sm">No markers configured</p>}
                      
                      <Button
                        onClick={() => setCardData(prev => ({
                          ...prev,
                          ar: {
                            ...(prev.ar || {}),
                            markers: [
                              ...(prev.ar?.markers || []),
                              {
                                id: `marker-${(prev.ar?.markers?.length || 0) + 1}`,
                                physicalWidthM: 0.1,
                                model: { glbUrl: '' }
                              }
                            ]
                          }
                        }))}
                        className="bg-green-600 hover:bg-green-700 text-sm"
                      >
                        + Add Marker
                      </Button>
                    </div>
                  )}

                  {/* Location AR Configuration */}
                  {cardData.ar?.mode === 'location' && (
                    <div className="space-y-4 border-t border-gray-600 pt-4">
                      <h4 className="text-sm font-semibold text-purple-400">Location AR Settings</h4>
                      <p className="text-xs text-gray-400">Configure GPS-based AR experiences</p>
                      
                      {cardData.ar?.locations?.map((location, index) => (
                        <div key={index} className="space-y-4 border border-gray-600 rounded p-4">
                          <div className="flex justify-between items-center">
                            <h5 className="text-sm font-medium">Location {index + 1}</h5>
                            <Button
                              onClick={() => setCardData(prev => ({
                                ...prev,
                                ar: {
                                  ...(prev.ar || {}),
                                  locations: prev.ar?.locations?.filter((_, i) => i !== index)
                                }
                              }))}
                              className="bg-red-600 hover:bg-red-700 text-xs px-2 py-1"
                            >
                              Remove
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-2">Location ID</label>
                              <input
                                type="text"
                                value={location.id}
                                onChange={(e) => {
                                  const newLocations = [...(cardData.ar?.locations || [])];
                                  newLocations[index] = { ...location, id: e.target.value };
                                  setCardData(prev => ({
                                    ...prev,
                                    ar: { ...(prev.ar || {}), locations: newLocations }
                                  }));
                                }}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                                placeholder="location-1"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium mb-2">Detection Radius (meters)</label>
                              <input
                                type="number"
                                value={location.radiusM}
                                onChange={(e) => {
                                  const newLocations = [...(cardData.ar?.locations || [])];
                                  newLocations[index] = { ...location, radiusM: parseInt(e.target.value) || 10 };
                                  setCardData(prev => ({
                                    ...prev,
                                    ar: { ...(prev.ar || {}), locations: newLocations }
                                  }));
                                }}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                                placeholder="10"
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-2">Latitude</label>
                              <input
                                type="number"
                                step="0.000001"
                                value={location.lat}
                                onChange={(e) => {
                                  const newLocations = [...(cardData.ar?.locations || [])];
                                  newLocations[index] = { ...location, lat: parseFloat(e.target.value) || 0 };
                                  setCardData(prev => ({
                                    ...prev,
                                    ar: { ...(prev.ar || {}), locations: newLocations }
                                  }));
                                }}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                                placeholder="40.7128"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium mb-2">Longitude</label>
                              <input
                                type="number"
                                step="0.000001"
                                value={location.lng}
                                onChange={(e) => {
                                  const newLocations = [...(cardData.ar?.locations || [])];
                                  newLocations[index] = { ...location, lng: parseFloat(e.target.value) || 0 };
                                  setCardData(prev => ({
                                    ...prev,
                                    ar: { ...(prev.ar || {}), locations: newLocations }
                                  }));
                                }}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                                placeholder="-74.0060"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium mb-2">Altitude (optional)</label>
                              <input
                                type="number"
                                value={location.altitude || ''}
                                onChange={(e) => {
                                  const newLocations = [...(cardData.ar?.locations || [])];
                                  newLocations[index] = { ...location, altitude: e.target.value ? parseFloat(e.target.value) : undefined };
                                  setCardData(prev => ({
                                    ...prev,
                                    ar: { ...(prev.ar || {}), locations: newLocations }
                                  }));
                                }}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                                placeholder="10"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-2">3D Model (.glb)</label>
                            <input
                              type="text"
                              value={location.model.glbUrl}
                              onChange={(e) => {
                                const newLocations = [...(cardData.ar?.locations || [])];
                                newLocations[index] = { ...location, model: { ...location.model, glbUrl: e.target.value } };
                                setCardData(prev => ({
                                  ...prev,
                                  ar: { ...(prev.ar || {}), locations: newLocations }
                                }));
                              }}
                              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                              placeholder="model.glb"
                            />
                          </div>
                        </div>
                      )) || <p className="text-gray-400 text-sm">No locations configured</p>}
                      
                      <Button
                        onClick={() => setCardData(prev => ({
                          ...prev,
                          ar: {
                            ...(prev.ar || {}),
                            locations: [
                              ...(prev.ar?.locations || []),
                              {
                                id: `location-${(prev.ar?.locations?.length || 0) + 1}`,
                                lat: 0,
                                lng: 0,
                                radiusM: 10,
                                model: { glbUrl: '' }
                              }
                            ]
                          }
                        }))}
                        className="bg-purple-600 hover:bg-purple-700 text-sm"
                      >
                        + Add Location
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* PlayCanvas Configuration Section */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white text-base">🎮 PlayCanvas Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Integration Type</label>
                    <select
                      value={cardData.playcanvas?.type || 'iframe'}
                      onChange={(e) => setCardData(prev => ({
                        ...prev,
                        playcanvas: { ...(prev.playcanvas || {}), type: e.target.value as 'iframe' | 'engine' | 'self-hosted' }
                      }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    >
                      <option value="iframe">Iframe (Embedded Project)</option>
                      <option value="engine">Engine (Custom Scene)</option>
                      <option value="self-hosted">Self-Hosted Build</option>
                    </select>
                  </div>

                  {/* Basic Configuration */}
                  <div className="grid grid-cols-2 gap-4">
                    {cardData.playcanvas?.type === 'iframe' && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Project ID</label>
                        <input
                          type="text"
                          value={cardData.playcanvas?.projectId || ''}
                          onChange={(e) => setCardData(prev => ({
                            ...prev,
                            playcanvas: { ...(prev.playcanvas || {}), projectId: e.target.value }
                          }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                          placeholder="your-project-id"
                        />
                      </div>
                    )}
                    
                    {cardData.playcanvas?.type === 'self-hosted' && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Build Path</label>
                        <input
                          type="text"
                          value={cardData.playcanvas?.buildPath || ''}
                          onChange={(e) => setCardData(prev => ({
                            ...prev,
                            playcanvas: { ...(prev.playcanvas || {}), buildPath: e.target.value }
                          }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                          placeholder="/path/to/build/"
                        />
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Fill Mode</label>
                      <select
                        value={cardData.playcanvas?.fillMode || 'KEEP_ASPECT'}
                        onChange={(e) => setCardData(prev => ({
                          ...prev,
                          playcanvas: { ...(prev.playcanvas || {}), fillMode: e.target.value as 'FILL_WINDOW' | 'KEEP_ASPECT' }
                        }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                      >
                        <option value="KEEP_ASPECT">Keep Aspect</option>
                        <option value="FILL_WINDOW">Fill Window</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Width</label>
                      <input
                        type="number"
                        value={cardData.playcanvas?.width || ''}
                        onChange={(e) => setCardData(prev => ({
                          ...prev,
                          playcanvas: { ...(prev.playcanvas || {}), width: e.target.value ? parseInt(e.target.value) : undefined }
                        }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                        placeholder="800"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Height</label>
                      <input
                        type="number"
                        value={cardData.playcanvas?.height || ''}
                        onChange={(e) => setCardData(prev => ({
                          ...prev,
                          playcanvas: { ...(prev.playcanvas || {}), height: e.target.value ? parseInt(e.target.value) : undefined }
                        }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                        placeholder="600"
                      />
                    </div>
                    
                    <div className="flex flex-col justify-end space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={cardData.playcanvas?.transparency || false}
                          onChange={(e) => setCardData(prev => ({
                            ...prev,
                            playcanvas: { ...(prev.playcanvas || {}), transparency: e.target.checked }
                          }))}
                          className="mr-2"
                        />
                        <span className="text-sm">Transparency</span>
                      </label>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={cardData.playcanvas?.autoPlay || false}
                          onChange={(e) => setCardData(prev => ({
                            ...prev,
                            playcanvas: { ...(prev.playcanvas || {}), autoPlay: e.target.checked }
                          }))}
                          className="mr-2"
                        />
                        <span className="text-sm">Auto Play</span>
                      </label>
                    </div>
                  </div>

                  {/* Engine Scene Configuration */}
                  {cardData.playcanvas?.type === 'engine' && (
                    <div className="space-y-4 border-t border-gray-600 pt-4">
                      <h4 className="text-sm font-semibold text-indigo-400">Scene Configuration</h4>
                      
                      {/* Camera Settings */}
                      <div className="space-y-3">
                        <h5 className="text-sm font-medium text-gray-300">Camera</h5>
                        <div className="grid grid-cols-4 gap-3">
                          <div className="col-span-3">
                            <label className="block text-xs font-medium mb-1">Position (x, y, z)</label>
                            <input
                              type="text"
                              value={cardData.playcanvas?.sceneConfig?.camera?.position?.join(', ') || ''}
                              onChange={(e) => {
                                const values = e.target.value.split(',').map(v => parseFloat(v.trim()) || 0);
                                setCardData(prev => ({
                                  ...prev,
                                  playcanvas: {
                                    ...(prev.playcanvas || {}),
                                    sceneConfig: {
                                      ...(prev.playcanvas?.sceneConfig || {}),
                                      camera: {
                                        ...(prev.playcanvas?.sceneConfig?.camera || {}),
                                        position: [values[0] || 0, values[1] || 0, values[2] || 0] as [number, number, number],
                                        target: prev.playcanvas?.sceneConfig?.camera?.target || [0, 0, 0]
                                      }
                                    }
                                  }
                                }));
                              }}
                              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                              placeholder="0, 5, 10"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium mb-1">FOV</label>
                            <input
                              type="number"
                              value={cardData.playcanvas?.sceneConfig?.camera?.fov || ''}
                              onChange={(e) => setCardData(prev => ({
                                ...prev,
                                playcanvas: {
                                  ...(prev.playcanvas || {}),
                                  sceneConfig: {
                                    ...(prev.playcanvas?.sceneConfig || {}),
                                    camera: {
                                      ...(prev.playcanvas?.sceneConfig?.camera || {}),
                                      fov: e.target.value ? parseFloat(e.target.value) : undefined,
                                      position: prev.playcanvas?.sceneConfig?.camera?.position || [0, 0, 0],
                                      target: prev.playcanvas?.sceneConfig?.camera?.target || [0, 0, 0]
                                    }
                                  }
                                }
                              }))}
                              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                              placeholder="45"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Lighting Settings */}
                      <div className="space-y-3">
                        <h5 className="text-sm font-medium text-gray-300">Lighting</h5>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium mb-1">Ambient Color (r, g, b)</label>
                            <input
                              type="text"
                              value={cardData.playcanvas?.sceneConfig?.lighting?.ambientColor?.join(', ') || ''}
                              onChange={(e) => {
                                const values = e.target.value.split(',').map(v => parseFloat(v.trim()) || 0);
                                setCardData(prev => ({
                                  ...prev,
                                  playcanvas: {
                                    ...(prev.playcanvas || {}),
                                    sceneConfig: {
                                      ...(prev.playcanvas?.sceneConfig || {}),
                                      lighting: {
                                        ...(prev.playcanvas?.sceneConfig?.lighting || {}),
                                        ambientColor: [values[0] || 0.2, values[1] || 0.2, values[2] || 0.2] as [number, number, number]
                                      }
                                    }
                                  }
                                }));
                              }}
                              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                              placeholder="0.2, 0.2, 0.2"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium mb-1">Directional Light Color</label>
                            <input
                              type="text"
                              value={cardData.playcanvas?.sceneConfig?.lighting?.directionalLight?.color?.join(', ') || ''}
                              onChange={(e) => {
                                const values = e.target.value.split(',').map(v => parseFloat(v.trim()) || 0);
                                setCardData(prev => ({
                                  ...prev,
                                  playcanvas: {
                                    ...(prev.playcanvas || {}),
                                    sceneConfig: {
                                      ...(prev.playcanvas?.sceneConfig || {}),
                                      lighting: {
                                        ...(prev.playcanvas?.sceneConfig?.lighting || {}),
                                        directionalLight: {
                                          color: [values[0] || 1, values[1] || 1, values[2] || 1] as [number, number, number],
                                          direction: prev.playcanvas?.sceneConfig?.lighting?.directionalLight?.direction || [0, -1, 0]
                                        }
                                      }
                                    }
                                  }
                                }));
                              }}
                              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                              placeholder="1, 1, 1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Messaging Configuration */}
                  <div className="space-y-4 border-t border-gray-600 pt-4">
                    <h4 className="text-sm font-semibold text-yellow-400">Advanced Settings</h4>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={cardData.playcanvas?.messaging?.enableApi || false}
                        onChange={(e) => setCardData(prev => ({
                          ...prev,
                          playcanvas: {
                            ...(prev.playcanvas || {}),
                            messaging: {
                              ...prev.playcanvas?.messaging,
                              enableApi: e.target.checked
                            }
                          }
                        }))}
                        className="mr-2"
                      />
                      <span className="text-sm">Enable API Communication</span>
                    </label>
                    
                    {cardData.playcanvas?.messaging?.enableApi && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Exposed Methods (comma-separated)</label>
                        <input
                          type="text"
                          value={cardData.playcanvas?.messaging?.exposedMethods?.join(', ') || ''}
                          onChange={(e) => setCardData(prev => ({
                            ...prev,
                            playcanvas: {
                              ...(prev.playcanvas || {}),
                              messaging: {
                                ...prev.playcanvas?.messaging,
                                exposedMethods: e.target.value.split(',').map(m => m.trim()).filter(m => m)
                              }
                            }
                          }))}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                          placeholder="playAnimation, changeColor, resetScene"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Enhanced Custom Buttons Configuration */}
              <CardEditorButtons
                cardData={cardData}
                onCardDataChange={setCardData}
              />

              {/* Save Button at Bottom */}
              <Button 
                onClick={saveCard}
                disabled={saving}
                className="w-full bg-green-600 hover:bg-green-700 h-12"
              >
                {saving ? 'Saving...' : '💾 Save Card'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Button Text</label>
                          <input
                            type="text"
                            value={button.text}
                            onChange={(e) => setCardData(prev => ({
                              ...prev,
                              customButtons: prev.customButtons?.map((b, i) => 
                                i === index ? { ...b, text: e.target.value } : b
                              )
                            }))}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                            placeholder="Click here"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Visible From (seconds)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={button.timing.visibleFrom}
                            onChange={(e) => setCardData(prev => ({
                              ...prev,
                              customButtons: prev.customButtons?.map((b, i) => 
                                i === index ? { 
                                  ...b, 
                                  timing: { ...b.timing, visibleFrom: parseFloat(e.target.value) || 0 }
                                } : b
                              )
                            }))}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                            placeholder="0"
                          />
                        </div>
                      </div>

                      {/* Position Settings */}
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-gray-300">Position</h5>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-medium mb-1">X Position</label>
                            <input
                              type="number"
                              value={button.position.x}
                              onChange={(e) => setCardData(prev => ({
                                ...prev,
                                customButtons: prev.customButtons?.map((b, i) => 
                                  i === index ? { 
                                    ...b, 
                                    position: { ...b.position, x: parseFloat(e.target.value) || 0 }
                                  } : b
                                )
                              }))}
                              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                              placeholder="50"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">Y Position</label>
                            <input
                              type="number"
                              value={button.position.y}
                              onChange={(e) => setCardData(prev => ({
                                ...prev,
                                customButtons: prev.customButtons?.map((b, i) => 
                                  i === index ? { 
                                    ...b, 
                                    position: { ...b.position, y: parseFloat(e.target.value) || 0 }
                                  } : b
                                )
                              }))}
                              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                              placeholder="50"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">Unit</label>
                            <select
                              value={button.position.unit}
                              onChange={(e) => setCardData(prev => ({
                                ...prev,
                                customButtons: prev.customButtons?.map((b, i) => 
                                  i === index ? { 
                                    ...b, 
                                    position: { ...b.position, unit: e.target.value as 'percent' | 'px' }
                                  } : b
                                )
                              }))}
                              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                            >
                              <option value="percent">%</option>
                              <option value="px">px</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Animation Settings */}
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-gray-300">Animation</h5>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-medium mb-1">Type</label>
                            <select
                              value={button.animation?.type || 'fadeIn'}
                              onChange={(e) => setCardData(prev => ({
                                ...prev,
                                customButtons: prev.customButtons?.map((b, i) => 
                                  i === index ? { 
                                    ...b, 
                                    animation: { ...b.animation, type: e.target.value as any }
                                  } : b
                                )
                              }))}
                              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                            >
                              <option value="fadeIn">Fade In</option>
                              <option value="slideUp">Slide Up</option>
                              <option value="slideDown">Slide Down</option>
                              <option value="slideLeft">Slide Left</option>
                              <option value="slideRight">Slide Right</option>
                              <option value="bounce">Bounce</option>
                              <option value="scale">Scale</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">Duration (s)</label>
                            <input
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={button.animation?.duration || ''}
                              onChange={(e) => setCardData(prev => ({
                                ...prev,
                                customButtons: prev.customButtons?.map((b, i) => 
                                  i === index ? { 
                                    ...b, 
                                    animation: { ...b.animation, duration: e.target.value ? parseFloat(e.target.value) : undefined }
                                  } : b
                                )
                              }))}
                              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                              placeholder="0.6"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">Delay (s)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={button.timing.animationDelay || ''}
                              onChange={(e) => setCardData(prev => ({
                                ...prev,
                                customButtons: prev.customButtons?.map((b, i) => 
                                  i === index ? { 
                                    ...b, 
                                    timing: { ...b.timing, animationDelay: e.target.value ? parseFloat(e.target.value) : undefined }
                                  } : b
                                )
                              }))}
                              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Link Settings */}
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-gray-300">Link Action</h5>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium mb-1">Link Type</label>
                            <select
                              value={button.link.type}
                              onChange={(e) => setCardData(prev => ({
                                ...prev,
                                customButtons: prev.customButtons?.map((b, i) => 
                                  i === index ? { 
                                    ...b, 
                                    link: { ...b.link, type: e.target.value as any }
                                  } : b
                                )
                              }))}
                              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                            >
                              <option value="external">External URL</option>
                              <option value="chapter">Chapter</option>
                              <option value="subchapter">Sub-Chapter</option>
                              <option value="iframe">Iframe</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1">
                              {button.link.type === 'external' || button.link.type === 'iframe' ? 'URL' : 'Target'}
                            </label>
                            <input
                              type="text"
                              value={button.link.type === 'external' || button.link.type === 'iframe' ? (button.link.url || '') : (button.link.target || '')}
                              onChange={(e) => setCardData(prev => ({
                                ...prev,
                                customButtons: prev.customButtons?.map((b, i) => 
                                  i === index ? { 
                                    ...b, 
                                    link: button.link.type === 'external' || button.link.type === 'iframe' 
                                      ? { ...b.link, url: e.target.value }
                                      : { ...b.link, target: e.target.value }
                                  } : b
                                )
                              }))}
                              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                              placeholder={
                                button.link.type === 'external' ? 'https://example.com' :
                                button.link.type === 'iframe' ? 'https://example.com' :
                                button.link.type === 'chapter' ? 'chapter-1' :
                                'chapter-1-sub-1'
                              }
                            />
                          </div>
                        </div>

                        {/* Iframe Configuration */}
                        {button.link.type === 'iframe' && (
                          <div className="grid grid-cols-3 gap-4 mt-2">
                            <div>
                              <label className="block text-xs font-medium mb-1">Width (px)</label>
                              <input
                                type="number"
                                value={button.link.iframeConfig?.width || ''}
                                onChange={(e) => setCardData(prev => ({
                                  ...prev,
                                  customButtons: prev.customButtons?.map((b, i) => 
                                    i === index ? { 
                                      ...b, 
                                      link: { 
                                        ...b.link, 
                                        iframeConfig: { 
                                          ...b.link.iframeConfig, 
                                          width: e.target.value ? parseInt(e.target.value) : undefined 
                                        }
                                      }
                                    } : b
                                  )
                                }))}
                                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                                placeholder="800"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1">Height (px)</label>
                              <input
                                type="number"
                                value={button.link.iframeConfig?.height || ''}
                                onChange={(e) => setCardData(prev => ({
                                  ...prev,
                                  customButtons: prev.customButtons?.map((b, i) => 
                                    i === index ? { 
                                      ...b, 
                                      link: { 
                                        ...b.link, 
                                        iframeConfig: { 
                                          ...b.link.iframeConfig, 
                                          height: e.target.value ? parseInt(e.target.value) : undefined 
                                        }
                                      }
                                    } : b
                                  )
                                }))}
                                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                                placeholder="600"
                              />
                            </div>
                            <div className="flex items-end">
                              <label className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={button.link.iframeConfig?.allowFullscreen || false}
                                  onChange={(e) => setCardData(prev => ({
                                    ...prev,
                                    customButtons: prev.customButtons?.map((b, i) => 
                                      i === index ? { 
                                        ...b, 
                                        link: { 
                                          ...b.link, 
                                          iframeConfig: { 
                                            ...b.link.iframeConfig, 
                                            allowFullscreen: e.target.checked 
                                          }
                                        }
                                      } : b
                                    )
                                  }))}
                                  className="mr-2"
                                />
                                <span className="text-xs">Fullscreen</span>
                              </label>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Styling Settings */}
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-gray-300">Custom Styling (Optional)</h5>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <ColorPicker
                              label="Background Color"
                              value={button.styling?.backgroundColor || '#ffffff'}
                              onChange={(color) => setCardData(prev => ({
                                ...prev,
                                customButtons: prev.customButtons?.map((b, i) => 
                                  i === index ? { 
                                    ...b, 
                                    styling: { ...b.styling, backgroundColor: color }
                                  } : b
                                )
                              }))}
                              showSavedColors={true}
                              className="text-xs"
                            />
                          </div>
                          <div>
                            <ColorPicker
                              label="Text Color"
                              value={button.styling?.textColor || '#000000'}
                              onChange={(color) => setCardData(prev => ({
                                ...prev,
                                customButtons: prev.customButtons?.map((b, i) => 
                                  i === index ? { 
                                    ...b, 
                                    styling: { ...b.styling, textColor: color }
                                  } : b
                                )
                              }))}
                              showSavedColors={true}
                              className="text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add Button */}
                  <Button
                    onClick={() => {
                      const newButton = {
                        id: `btn-${Date.now()}`,
                        text: 'New Button',
                        position: { x: 50, y: 50, unit: 'percent' as const },
                        timing: { visibleFrom: 0 },
                        animation: { type: 'fadeIn' as const, duration: 0.6 },
                        link: { type: 'external' as const, url: '' }
                      };
                      setCardData(prev => ({
                        ...prev,
                        customButtons: [...(prev.customButtons || []), newButton]
                      }));
                    }}
                    className="bg-blue-600 hover:bg-blue-700 w-full"
                  >
                    + Add Custom Button
                  </Button>
                </CardContent>
              </Card>

              {/* Save Button at Bottom */}
              <Button 
                onClick={saveCard}
                disabled={saving}
                className="w-full bg-green-600 hover:bg-green-700 h-12"
              >
                {saving ? 'Saving...' : '💾 Save Card'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}