'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChapterTreeView, TreeChapter } from './ChapterTreeView';

interface Chapter {
  id: string;
  title: string;
  order: number;
  cardCount: number;
  hasAR: boolean;
  parentId?: string | null;
  depth?: number;
}

interface ChapterReorderListProps {
  chapters: Chapter[];
  onReorderComplete: (newOrder: Array<{ id: string; order: number; parentId?: string | null }>) => Promise<void>;
  onReorderStart?: () => void;
  onDelete?: (id: string, title: string) => Promise<void>;
  onEdit?: (chapter: TreeChapter) => void;
  className?: string;
  csrfToken?: string;
}

export const ChapterReorderList: React.FC<ChapterReorderListProps> = ({
  chapters,
  onReorderComplete,
  onReorderStart,
  onDelete,
  onEdit,
  className = '',
  csrfToken = '',
}) => {
  const [orderedChapters, setOrderedChapters] = useState<Chapter[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [viewMode, setViewMode] = useState<'flat' | 'tree'>('flat');
  const [treeChapters, setTreeChapters] = useState<TreeChapter[]>([]);
  const [isLoadingTree, setIsLoadingTree] = useState(false);

  useEffect(() => {
    const sorted = [...chapters].sort((a, b) => a.order - b.order);
    setOrderedChapters(sorted);
    setHasChanges(false);
  }, [chapters]);

  useEffect(() => {
    if (viewMode === 'tree') {
      fetchTreeStructure();
    }
  }, [viewMode]);

  const fetchTreeStructure = async () => {
    setIsLoadingTree(true);
    try {
      const response = await fetch('/api/chapters?tree=true');
      if (response.ok) {
        const data = await response.json();
        setTreeChapters(data);
      }
    } catch (error) {
      console.error('Failed to fetch tree structure:', error);
    } finally {
      setIsLoadingTree(false);
    }
  };

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

    newOrderedChapters.splice(draggedIndex, 1);
    newOrderedChapters.splice(dropIndex, 0, draggedChapter);

    setOrderedChapters(newOrderedChapters);
    setHasChanges(true);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSaveOrder = async () => {
    setIsReordering(true);
    try {
      const newOrder = orderedChapters.map((chapter, index) => ({
        id: chapter.id,
        order: index + 1,
        parentId: chapter.parentId || null,
      }));

      await onReorderComplete(newOrder);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to reorder chapters:', error);
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

  const handleTreeReorder = async (updates: Array<{ id: string; order: number; parentId: string | null }>) => {
    setIsReordering(true);
    const originalState = [...treeChapters];
    
    try {
      // FIXED: Single transactional POST request instead of Promise.all (Issue 2)
      // Server handles all updates in one database transaction
      // Either all updates succeed or all fail - no partial updates
      const response = await fetch('/api/cms/chapters/reorder-hierarchy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ updates }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to reorder hierarchy');
      }

      // Refresh tree structure after successful update
      await fetchTreeStructure();
      
      if (onReorderComplete) {
        await onReorderComplete(updates);
      }
    } catch (error) {
      console.error('Failed to reorder chapters:', error);
      alert(`Failed to reorder chapters: ${error instanceof Error ? error.message : 'Unknown error'}. Changes were not saved.`);
      
      // Restore original state and refresh from server
      setTreeChapters(originalState);
      await fetchTreeStructure();
    } finally {
      setIsReordering(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">Chapter Order</h3>
          
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('flat')}
              className={`px-3 py-1 text-sm font-medium rounded transition-all ${
                viewMode === 'flat'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Flat View
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`px-3 py-1 text-sm font-medium rounded transition-all ${
                viewMode === 'tree'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tree View
            </button>
          </div>

          <span className="text-sm text-gray-500">
            {viewMode === 'flat' ? 'Drag and drop to reorder chapters' : 'Hierarchical chapter management'}
          </span>
        </div>

        {hasChanges && viewMode === 'flat' && (
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

      {viewMode === 'flat' ? (
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
              <div className="absolute left-2 top-1/2 transform -translate-y-1/2 opacity-40 group-hover:opacity-70">
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zM8 4h4v2H8V4zm0 4h4v2H8V8zm0 4h4v2H8v-2z" />
                </svg>
              </div>

              <div className="flex items-center justify-between pl-6">
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

                <div className="flex items-center space-x-2">
                  <div className="text-sm text-gray-400 mr-2">Order: {index + 1}</div>
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(chapter.id, chapter.title);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete chapter"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {orderedChapters.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No chapters available to reorder
            </div>
          )}
        </div>
      ) : (
        <div>
          {isLoadingTree ? (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="text-gray-600 mt-2">Loading tree structure...</p>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="mb-4 flex items-center space-x-2 text-sm text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  Drag chapters to reorder or change hierarchy. Maximum depth: 5 levels.
                </span>
              </div>
              <ChapterTreeView
                chapters={treeChapters}
                onReorder={handleTreeReorder}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
