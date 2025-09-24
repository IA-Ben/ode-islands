'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CardDataWithOptionalId } from '@/lib/utils/jsonFileUtils';

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterKey: string;
  onCardAdded: () => void;
}

export default function AddCardModal({ isOpen, onClose, chapterKey, onCardAdded }: AddCardModalProps) {
  const [cardData, setCardData] = useState<Partial<CardDataWithOptionalId>>({
    text: { title: '', subtitle: '', description: '' },
    ctaStart: '',
    theme: {}
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/cards/${chapterKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cardData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add card');
      }

      onCardAdded();
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCardData({
      text: { title: '', subtitle: '', description: '' },
      ctaStart: '',
      theme: {}
    });
    setError('');
  };

  const updateText = (field: string, value: string) => {
    setCardData(prev => ({
      ...prev,
      text: {
        ...prev.text,
        [field]: value
      }
    }));
  };

  const updateVideo = (field: string, value: string | number | boolean) => {
    setCardData(prev => ({
      ...prev,
      video: {
        url: '',
        width: 1920,
        height: 1080,
        ...prev.video,
        [field]: value
      }
    }));
  };

  const updateTheme = (field: string, value: string) => {
    setCardData(prev => ({
      ...prev,
      theme: {
        ...prev.theme,
        [field]: value
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Add New Card to {chapterKey}</CardTitle>
              <Button variant="outline" onClick={onClose}>×</Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              {/* Text Content */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Text Content</h3>
                <div>
                  <label className="block text-sm font-medium mb-1">Title</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={cardData.text?.title || ''}
                    onChange={(e) => updateText('title', e.target.value)}
                    placeholder="Card title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Subtitle</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={cardData.text?.subtitle || ''}
                    onChange={(e) => updateText('subtitle', e.target.value)}
                    placeholder="Card subtitle"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    className="w-full p-2 border border-gray-300 rounded-md h-20"
                    value={cardData.text?.description || ''}
                    onChange={(e) => updateText('description', e.target.value)}
                    placeholder="Card description"
                  />
                </div>
              </div>

              {/* Call to Action */}
              <div>
                <label className="block text-sm font-medium mb-1">Call to Action Button Text</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={cardData.ctaStart || ''}
                  onChange={(e) => setCardData(prev => ({ ...prev, ctaStart: e.target.value }))}
                  placeholder="Begin Journey, Continue, etc."
                />
              </div>

              {/* Video Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Video (Optional)</h3>
                <div>
                  <label className="block text-sm font-medium mb-1">Video URL/ID</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={cardData.video?.url || ''}
                    onChange={(e) => updateVideo('url', e.target.value)}
                    placeholder="video-identifier or full URL"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Width</label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={cardData.video?.width || 1920}
                      onChange={(e) => updateVideo('width', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Height</label>
                    <input
                      type="number"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={cardData.video?.height || 1080}
                      onChange={(e) => updateVideo('height', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              {/* Theme */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Theme (Optional)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Title Color</label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={cardData.theme?.title || ''}
                      onChange={(e) => updateTheme('title', e.target.value)}
                      placeholder="#37ffce"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Mix Blend Mode</label>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={cardData.theme?.mix || ''}
                      onChange={(e) => updateTheme('mix', e.target.value)}
                    >
                      <option value="">None</option>
                      <option value="exclusion">Exclusion</option>
                      <option value="multiply">Multiply</option>
                      <option value="screen">Screen</option>
                      <option value="overlay">Overlay</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Adding Card...' : 'Add Card'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}