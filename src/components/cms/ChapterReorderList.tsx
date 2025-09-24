'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface Chapter {
  id: string;
  title: string;
  order: number;
  cardCount: number;
  hasAR: boolean;
}

interface ChapterReorderListProps {
  chapters: Chapter[];
  onReorderComplete: (newOrder: Array<{ id: string; order: number }>) => Promise<void>;
  onReorderStart?: () => void;
  className?: string;
}

export const ChapterReorderList: React.FC<ChapterReorderListProps> = ({
  chapters,
  onReorderComplete,
  onReorderStart,
  className = ''
}) => {
  const [orderedChapters, setOrderedChapters] = useState<Chapter[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

  // Sort chapters by order when they change
  useEffect(() => {
    const sorted = [...chapters].sort((a, b) => a.order - b.order);
    setOrderedChapters(sorted);
    setHasChanges(false);
  }, [chapters]);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    onReorderStart?.();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newOrderedChapters = [...orderedChapters];
    const draggedChapter = newOrderedChapters[draggedIndex];
    
    // Remove the dragged item
    newOrderedChapters.splice(draggedIndex, 1);
    
    // Insert at the new position
    newOrderedChapters.splice(dropIndex, 0, draggedChapter);

    setOrderedChapters(newOrderedChapters);
    setHasChanges(true);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSaveOrder = async () => {
    setIsReordering(true);
    try {
      // Create the new order array with updated order values
      const newOrder = orderedChapters.map((chapter, index) => ({
        id: chapter.id,
        order: index + 1 // Start from 1
      }));

      await onReorderComplete(newOrder);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to reorder chapters:', error);
      // Reset to original order on error
      const sorted = [...chapters].sort((a, b) => a.order - b.order);
      setOrderedChapters(sorted);
      setHasChanges(false);
    } finally {
      setIsReordering(false);
    }
  };

  const handleCancelReorder = () => {
    const sorted = [...chapters].sort((a, b) => a.order - b.order);
    setOrderedChapters(sorted);
    setHasChanges(false);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900">Chapter Order</h3>
          <span className="text-sm text-gray-500">
            Drag and drop to reorder chapters
          </span>
        </div>
        
        {hasChanges && (
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleCancelReorder}
              variant="secondary"
              size="sm"
              disabled={isReordering}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveOrder}
              size="sm"
              disabled={isReordering}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isReordering ? 'Saving...' : 'Save Order'}
            </Button>
          </div>
        )}
      </div>

      {/* Chapter list */}
      <div className="space-y-2">
        {orderedChapters.map((chapter, index) => (
          <div
            key={chapter.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            className={`
              group relative bg-white border-2 rounded-lg p-4 cursor-move transition-all duration-200
              ${draggedIndex === index ? 'opacity-50 scale-95' : ''}
              ${dragOverIndex === index && draggedIndex !== index ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}
              ${draggedIndex === null ? 'hover:border-gray-300 hover:shadow-sm' : ''}
            `}
          >
            {/* Drag handle indicator */}
            <div className="absolute left-2 top-1/2 transform -translate-y-1/2 opacity-40 group-hover:opacity-70">
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zM8 4h4v2H8V4zm0 4h4v2H8V8zm0 4h4v2H8v-2z"/>
              </svg>
            </div>

            <div className="flex items-center justify-between pl-6">
              {/* Chapter info */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full text-sm font-semibold text-gray-600">
                  {index + 1}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{chapter.title}</h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{chapter.cardCount} cards</span>
                    {chapter.hasAR && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700">
                        AR Content
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Order indicator */}
              <div className="text-sm text-gray-400">
                Order: {index + 1}
              </div>
            </div>
          </div>
        ))}
      </div>

      {orderedChapters.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No chapters available to reorder
        </div>
      )}
    </div>
  );
};