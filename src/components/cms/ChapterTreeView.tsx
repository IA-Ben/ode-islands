'use client';

import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface TreeChapter {
  id: string;
  title: string;
  order: number;
  parentId: string | null | undefined;
  depth: number | null | undefined;
  path?: string | null;
  cardCount: number;
  hasAR: boolean;
  children?: TreeChapter[];
}

interface ChapterTreeViewProps {
  chapters: TreeChapter[];
  onReorder: (updates: Array<{ id: string; order: number; parentId: string | null }>) => void;
  onDelete?: (id: string, title: string) => void;
}

const MAX_DEPTH = 5;

function TreeNode({
  chapter,
  onToggleExpand,
  isExpanded,
  onDelete,
  isDragOverlay = false,
}: {
  chapter: TreeChapter;
  onToggleExpand: (id: string) => void;
  isExpanded: boolean;
  onDelete?: (id: string, title: string) => void;
  isDragOverlay?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chapter.id });

  const safeDepth = chapter.depth ?? 0;
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    paddingLeft: isDragOverlay ? 0 : `${safeDepth * 20}px`,
  };

  const hasChildren = chapter.children && chapter.children.length > 0;

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div
        className={`
          group relative bg-white border-2 rounded-lg p-4 mb-2 transition-all duration-200
          ${isDragging ? 'opacity-50 scale-95' : ''}
          ${isDragOverlay ? 'shadow-lg' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'}
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1">
            {hasChildren && (
              <button
                onClick={() => onToggleExpand(chapter.id)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                type="button"
              >
                <svg
                  className={`w-4 h-4 text-gray-600 transition-transform ${
                    isExpanded ? 'transform rotate-90' : ''
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
            {!hasChildren && <div className="w-6" />}

            <div
              className="cursor-move flex items-center space-x-3 flex-1"
              {...attributes}
              {...listeners}
            >
              <div className="opacity-40 group-hover:opacity-70">
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zM8 4h4v2H8V4zm0 4h4v2H8V8zm0 4h4v2H8v-2z" />
                </svg>
              </div>

              <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full text-sm font-semibold text-gray-600">
                {chapter.order}
              </div>

              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{chapter.title}</h4>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>{chapter.cardCount} cards</span>
                  {chapter.hasAR && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700">
                      AR Content
                    </span>
                  )}
                  <span className="text-xs text-gray-400">Level {(chapter.depth ?? 0) + 1}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(chapter.id, chapter.title);
                }}
                className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Delete chapter"
                type="button"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function flattenTree(chapters: TreeChapter[]): TreeChapter[] {
  const result: TreeChapter[] = [];
  
  function traverse(items: TreeChapter[]) {
    items.forEach((item) => {
      result.push(item);
      if (item.children && item.children.length > 0) {
        traverse(item.children);
      }
    });
  }
  
  traverse(chapters);
  return result;
}

function buildTree(flatChapters: TreeChapter[]): TreeChapter[] {
  const map = new Map<string, TreeChapter>();
  const roots: TreeChapter[] = [];

  // First pass: create all nodes
  flatChapters.forEach((chapter) => {
    map.set(chapter.id, { ...chapter, children: [] });
  });

  // Second pass: build tree structure with graceful error handling
  flatChapters.forEach((chapter) => {
    // FIXED: Remove non-null assertion and add explicit check (Issue 3)
    const node = map.get(chapter.id);
    if (!node) {
      console.warn(`Warning: Chapter ${chapter.id} not found in map during tree building`);
      return; // Skip this chapter
    }

    const hasParent = chapter.parentId !== null && chapter.parentId !== undefined;
    
    if (hasParent) {
      // FIXED: Remove non-null assertion and add explicit check (Issue 3)
      const parent = map.get(chapter.parentId!);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      } else {
        // FIXED: Handle missing parents gracefully (Issue 3)
        // Treat orphaned chapters as root-level for backward compatibility
        console.warn(`Warning: Parent ${chapter.parentId} not found for chapter ${chapter.id}. Treating as root-level chapter.`);
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  const sortChildren = (items: TreeChapter[]) => {
    items.sort((a, b) => a.order - b.order);
    items.forEach((item) => {
      if (item.children && item.children.length > 0) {
        sortChildren(item.children);
      }
    });
  };

  sortChildren(roots);
  return roots;
}

export function ChapterTreeView({ chapters, onReorder, onDelete }: ChapterTreeViewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const renderTree = (items: TreeChapter[]): React.ReactElement[] => {
    const result: React.ReactElement[] = [];

    items.forEach((chapter) => {
      result.push(
        <TreeNode
          key={chapter.id}
          chapter={chapter}
          onToggleExpand={toggleExpand}
          isExpanded={expandedIds.has(chapter.id)}
          onDelete={onDelete}
        />
      );

      if (chapter.children && chapter.children.length > 0 && expandedIds.has(chapter.id)) {
        result.push(...renderTree(chapter.children));
      }
    });

    return result;
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    const flatChapters = flattenTree(chapters);
    const activeChapter = flatChapters.find((c) => c.id === active.id);
    const overChapter = flatChapters.find((c) => c.id === over.id);

    if (!activeChapter || !overChapter) {
      setActiveId(null);
      return;
    }

    const updates: Array<{ id: string; order: number; parentId: string | null }> = [];
    
    const activeSiblings = flatChapters.filter(
      (c) => c.parentId === activeChapter.parentId && c.id !== activeChapter.id
    );
    const overSiblings = flatChapters.filter((c) => c.parentId === overChapter.parentId);

    const isSameParent = activeChapter.parentId === overChapter.parentId;

    if (isSameParent) {
      const allSiblings = [...activeSiblings, activeChapter].sort((a, b) => a.order - b.order);
      const oldIndex = allSiblings.findIndex((c) => c.id === activeChapter.id);
      const newIndex = allSiblings.findIndex((c) => c.id === overChapter.id);

      if (oldIndex !== newIndex) {
        const reordered = [...allSiblings];
        const [removed] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, removed);

        reordered.forEach((chapter, index) => {
          if (chapter.order !== index + 1) {
            updates.push({
              id: chapter.id,
              order: index + 1,
              parentId: chapter.parentId ?? null,
            });
          }
        });
      }
    } else {
      const safeOverDepth = overChapter.depth ?? 0;
      const newDepth = safeOverDepth + 1;
      if (newDepth >= MAX_DEPTH) {
        alert(`Cannot move chapter: Maximum depth of ${MAX_DEPTH} levels would be exceeded.`);
        setActiveId(null);
        return;
      }

      updates.push({
        id: activeChapter.id,
        order: overSiblings.length + 1,
        parentId: overChapter.parentId ?? null,
      });

      activeSiblings.forEach((chapter, index) => {
        if (chapter.order !== index + 1) {
          updates.push({
            id: chapter.id,
            order: index + 1,
            parentId: chapter.parentId ?? null,
          });
        }
      });
    }

    if (updates.length > 0) {
      onReorder(updates);
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const flatChapters = flattenTree(chapters);
  const visibleChapters = flatChapters.filter((chapter) => {
    const hasParent = chapter.parentId !== null && chapter.parentId !== undefined;
    if (!hasParent) return true;
    
    let parent = flatChapters.find((c) => c.id === chapter.parentId);
    while (parent) {
      if (!expandedIds.has(parent.id)) return false;
      const parentHasParent = parent.parentId !== null && parent.parentId !== undefined;
      parent = parentHasParent ? flatChapters.find((c) => c.id === parent!.parentId) : undefined;
    }
    return true;
  });

  const activeChapter = activeId ? flatChapters.find((c) => c.id === activeId) : null;

  return (
    <div className="space-y-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={visibleChapters.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {renderTree(chapters)}
        </SortableContext>

        <DragOverlay>
          {activeChapter ? (
            <TreeNode
              chapter={activeChapter}
              onToggleExpand={toggleExpand}
              isExpanded={false}
              isDragOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {chapters.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No chapters available
        </div>
      )}
    </div>
  );
}
