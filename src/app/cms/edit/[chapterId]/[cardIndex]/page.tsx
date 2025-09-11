'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ClientCard from '@/components/ClientCard';
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
  const [uploadedVideoFile, setUploadedVideoFile] = useState<File | null>(null);
  const [uploadedAudioFile, setUploadedAudioFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  
  const isNewCard = cardIndex === 'new';
  const cardIndexNum = isNewCard ? -1 : parseInt(cardIndex);

  useEffect(() => {
    checkAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user?.isAdmin) {
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
          }
        });
      } else if (cards[cardIndexNum]) {
        setCardData({ ...cards[cardIndexNum] });
      }
      setLoading(false);
    }
  }, [chapters, chapterId, cardIndexNum, isNewCard]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/user');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        router.push('/cms');
      }
    } catch (error: unknown) {
      console.error('Auth check failed:', error);
      router.push('/cms');
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
      console.error('Error fetching chapters:', error);
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
                  }
                }]
              }));
              
              alert(`Sub-chapter "${subChapterId}" created successfully! You can edit it by going to /cms/edit/${subChapterId}/0`);
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
      console.error('Error saving card:', error);
      alert('Error saving card');
    } finally {
      setSaving(false);
    }
  };

  const handleVideoUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setUploadedVideoFile(file);
      }
    };
    input.click();
  };

  const handleAudioUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setUploadedAudioFile(file);
      }
    };
    input.click();
  };

  const handleProcessMedia = async () => {
    if (!uploadedVideoFile) {
      alert('Please upload a video file first');
      return;
    }

    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('video', uploadedVideoFile);
      if (uploadedAudioFile) {
        formData.append('audio', uploadedAudioFile);
      }

      const response = await fetch('/api/cms/process-media', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update card data with the processed video URL
        setCardData(prev => ({
          ...prev,
          video: {
            ...prev.video,
            url: result.videoId,
            width: result.width || 1920,
            height: result.height || 1080,
            audio: result.hasAudio
          }
        }));

        // Clear uploaded files
        setUploadedVideoFile(null);
        setUploadedAudioFile(null);
        
        alert(`Video processed successfully! Video ID: ${result.videoId}`);
      } else {
        const error = await response.json();
        alert(`Processing temporarily unavailable: ${error.message}\n\nPlease use the existing video transcoding system for now.`);
      }
    } catch (error) {
      console.error('Error processing media:', error);
      alert('Error processing media. Please try again.');
    } finally {
      setProcessing(false);
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
                <ClientCard data={cardData} active={true} />
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
                          alert(`Sub-chapter "${subChapterId}" will be created when you save. You can edit it by going to /cms/edit/${subChapterId}/new`);
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
                    <h3 className="text-sm font-semibold mb-3 text-gray-200">Upload & Process New Media</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium mb-2 text-gray-400">Video File</label>
                        <div className="space-y-2">
                          <button
                            onClick={() => handleVideoUpload()}
                            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 border border-blue-500 rounded text-white text-sm flex items-center justify-center gap-2"
                          >
                            📹 Upload Video
                          </button>
                          <p className="text-xs text-gray-500">MP4, MOV, AVI (max 500MB)</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-2 text-gray-400">Audio File (Optional)</label>
                        <div className="space-y-2">
                          <button
                            onClick={() => handleAudioUpload()}
                            className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 border border-green-500 rounded text-white text-sm flex items-center justify-center gap-2"
                          >
                            🎵 Upload Audio
                          </button>
                          <p className="text-xs text-gray-500">MP3, WAV, AAC (max 100MB)</p>
                        </div>
                      </div>
                    </div>
                    {(uploadedVideoFile || uploadedAudioFile) && (
                      <div className="mt-4 p-3 bg-gray-800 rounded border">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium text-gray-200">Ready to Process</h4>
                          <button
                            onClick={handleProcessMedia}
                            disabled={processing}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded text-white text-sm flex items-center gap-2"
                          >
                            {processing ? '⏳ Processing...' : '🚀 Process & Upload'}
                          </button>
                        </div>
                        {uploadedVideoFile && (
                          <div className="text-xs text-gray-400 mb-1">📹 Video: {uploadedVideoFile.name}</div>
                        )}
                        {uploadedAudioFile && (
                          <div className="text-xs text-gray-400">🎵 Audio: {uploadedAudioFile.name}</div>
                        )}
                      </div>
                    )}
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
                    <label className="block text-sm font-medium mb-2">Background Color</label>
                    <input
                      type="color"
                      value={cardData.theme?.background || '#000000'}
                      onChange={(e) => setCardData(prev => ({
                        ...prev,
                        theme: { ...prev.theme, background: e.target.value }
                      }))}
                      className="w-full h-10 bg-gray-700 border border-gray-600 rounded"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Title Color</label>
                      <input
                        type="color"
                        value={cardData.theme?.title || '#ffffff'}
                        onChange={(e) => setCardData(prev => ({
                          ...prev,
                          theme: { ...prev.theme, title: e.target.value }
                        }))}
                        className="w-full h-10 bg-gray-700 border border-gray-600 rounded"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Subtitle Color</label>
                      <input
                        type="color"
                        value={cardData.theme?.subtitle || '#ffffff'}
                        onChange={(e) => setCardData(prev => ({
                          ...prev,
                          theme: { ...prev.theme, subtitle: e.target.value }
                        }))}
                        className="w-full h-10 bg-gray-700 border border-gray-600 rounded"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Description Color</label>
                    <input
                      type="color"
                      value={cardData.theme?.description || '#ffffff'}
                      onChange={(e) => setCardData(prev => ({
                        ...prev,
                        theme: { ...prev.theme, description: e.target.value }
                      }))}
                      className="w-full h-10 bg-gray-700 border border-gray-600 rounded"
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