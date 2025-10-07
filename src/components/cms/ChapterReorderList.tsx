'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChapterTreeView, TreeChapter } from './ChapterTreeView';
import { surfaces, borders, typography, components, colors, shadows } from '@/lib/admin/designTokens';

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
    <div className={`space-y-6 ${className}`}>
      {/* Header with View Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <h3 className={typography.h3}>Chapter Order</h3>
          
          {/* View Mode Toggle */}
          <div className={`flex items-center ${surfaces.subtleGlass} ${borders.glassBorder} ${borders.radius.lg} p-1`}>
            <button
              onClick={() => setViewMode('flat')}
              className={`px-4 py-1.5 text-sm font-medium ${borders.radius.md} transition-all ${
                viewMode === 'flat'
                  ? `${surfaces.cardGlass} text-white ${shadows.sm}`
                  : `${colors.slate.textMuted} hover:text-white`
              }`}
            >
              Flat View
            </button>
            <button
              onClick={() => setViewMode('tree')}
              className={`px-4 py-1.5 text-sm font-medium ${borders.radius.md} transition-all ${
                viewMode === 'tree'
                  ? `${surfaces.cardGlass} text-white ${shadows.sm}`
                  : `${colors.slate.textMuted} hover:text-white`
              }`}
            >
              Tree View
            </button>
          </div>

          <span className={`text-sm ${colors.slate.textMuted}`}>
            {viewMode === 'flat' ? 'Drag and drop to reorder chapters' : 'Hierarchical chapter management'}
          </span>
        </div>

        {hasChanges && viewMode === 'flat' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancelReorder}
              disabled={isReordering}
              className={components.buttonSecondary}
            >
              Cancel
            </button>
            <button
              onClick={handleSaveOrder}
              disabled={isReordering}
              className={components.buttonPrimary}
            >
              {isReordering ? 'Saving...' : 'Save Order'}
            </button>
          </div>
        )}
      </div>

      {viewMode === 'flat' ? (
        <div className="space-y-3">
          {orderedChapters.map((chapter, index) => (
            <div
              key={chapter.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              className={`
                group relative ${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.lg} p-4 cursor-move transition-all duration-200
                ${draggedIndex === index ? 'opacity-50 scale-95' : ''}
                ${dragOverIndex === index && draggedIndex !== index ? `${colors.accent.borderSubtle} ${colors.accent.bgDragOver}` : ''}
                ${draggedIndex === null ? `${colors.slate.borderHover} hover:${shadows.lg}` : ''}
              `}
            >
              {/* Drag Handle */}
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 opacity-30 group-hover:opacity-60 transition-opacity">
                <svg className={`w-5 h-5 ${colors.icon.muted}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zM8 4h4v2H8V4zm0 4h4v2H8V8zm0 4h4v2H8v-2z" />
                </svg>
              </div>

              <div className="flex items-center justify-between pl-8">
                <div className="flex items-center gap-3">
                  {/* Order Badge */}
                  <div className={`flex items-center justify-center w-9 h-9 ${colors.accent.bgTranslucent} ${colors.accent.borderTranslucent} border rounded-full text-sm font-semibold ${colors.accent.primary}`}>
                    {index + 1}
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-white">{chapter.title}</h4>
                    <div className={`flex items-center gap-3 text-sm ${colors.slate.textMuted} mt-0.5`}>
                      <span>{chapter.cardCount} cards</span>
                      {chapter.hasAR && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${colors.accent.bgTranslucent} ${colors.accent.primary} ${colors.accent.borderTranslucent} border`}>
                          AR Content
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className={`text-sm ${colors.slate.textMuted} mr-2`}>Order: {index + 1}</div>
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(chapter.id, chapter.title);
                      }}
                      className={`p-2 ${colors.error.textAlt} ${colors.error.hover} ${colors.error.bgHover} ${borders.radius.lg} transition-colors`}
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
            <div className={`text-center py-12 ${colors.slate.textMuted}`}>
              No chapters available to reorder
            </div>
          )}
        </div>
      ) : (
        <div>
          {isLoadingTree ? (
            <div className="text-center py-12">
              <div className={`inline-block w-8 h-8 border-4 ${colors.slate.border} ${colors.accent.borderTop} rounded-full animate-spin`}></div>
              <p className={`${colors.slate.textMuted} mt-3`}>Loading tree structure...</p>
            </div>
          ) : (
            <div className={`${surfaces.subtleGlass} ${borders.glassBorder} ${borders.radius.lg} p-6`}>
              <div className={`mb-6 flex items-center gap-3 text-sm ${colors.slate.textMuted}`}>
                <svg className={`w-5 h-5 ${colors.accent.primary}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
