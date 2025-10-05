'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VisualCardEditor } from '../VisualCardEditor';
import { VisualCardLayout, createEmptyLayout } from '@/../../shared/cardTypes';

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
    initialData?.visualLayout || createEmptyLayout()
  );
  const [traditionalContent, setTraditionalContent] = useState(initialData?.content || {});
  const [order, setOrder] = useState(initialData?.order || 0);
  const [hasAR, setHasAR] = useState(initialData?.hasAR || false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      if (initialData.visualLayout) {
        setVisualLayout(initialData.visualLayout);
        setEditingMode('visual');
      }
      setTraditionalContent(initialData.content || {});
      setOrder(initialData.order || 0);
      setHasAR(initialData.hasAR || false);
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = editMode && cardId 
        ? `/api/cms/story-cards/${cardId}` 
        : '/api/cms/story-cards';
      const method = editMode ? 'PUT' : 'POST';

      const data = editingMode === 'visual' 
        ? {
            chapterId,
            visualLayout,
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

            <div className="flex gap-2 mb-4">
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

            {editingMode === 'traditional' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Content (JSON)</label>
                  <textarea
                    className="w-full p-2 border border-gray-300 rounded-md h-48 font-mono text-sm"
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
