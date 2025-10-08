'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowRight, GitBranch, Eye, Save, ChevronRight, Edit } from 'lucide-react';
import { surfaces, colors, components } from '@/lib/admin/designTokens';

interface Chapter {
  id: string;
  title: string;
  summary?: string;
  parentId?: string | null;
  order: number;
  publishStatus: string;
  cardCount?: number;
  children?: Chapter[];
}

interface VisualStoryBuilderProps {
  eventId?: string;
}

export function VisualStoryBuilder({ eventId }: VisualStoryBuilderProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewChapter, setShowNewChapter] = useState(false);
  const [newChapterData, setNewChapterData] = useState({
    title: '',
    summary: '',
    parentId: null as string | null,
  });

  useEffect(() => {
    loadChapters();
  }, [eventId]);

  const loadChapters = async () => {
    try {
      const response = await fetch('/api/chapters');
      if (response.ok) {
        const data = await response.json();
        setChapters(organizeChapters(data));
      }
    } catch (error) {
      console.error('Failed to load chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  const organizeChapters = (flatChapters: Chapter[]): Chapter[] => {
    const chapterMap = new Map<string, Chapter>();
    const rootChapters: Chapter[] = [];

    // Create map of all chapters
    flatChapters.forEach(chapter => {
      chapterMap.set(chapter.id, { ...chapter, children: [] });
    });

    // Organize into tree
    flatChapters.forEach(chapter => {
      const chapterWithChildren = chapterMap.get(chapter.id)!;
      if (chapter.parentId) {
        const parent = chapterMap.get(chapter.parentId);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(chapterWithChildren);
        }
      } else {
        rootChapters.push(chapterWithChildren);
      }
    });

    // Sort by order
    const sortByOrder = (chapters: Chapter[]) => {
      chapters.sort((a, b) => a.order - b.order);
      chapters.forEach(chapter => {
        if (chapter.children) {
          sortByOrder(chapter.children);
        }
      });
    };

    sortByOrder(rootChapters);
    return rootChapters;
  };

  const handleCreateChapter = async () => {
    try {
      const response = await fetch('/api/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newChapterData,
          eventId,
          order: chapters.length,
        }),
      });

      if (response.ok) {
        setShowNewChapter(false);
        setNewChapterData({ title: '', summary: '', parentId: null });
        loadChapters();
      }
    } catch (error) {
      console.error('Failed to create chapter:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-500/20 text-green-400';
      case 'in_review':
        return 'bg-amber-500/20 text-amber-400';
      case 'archived':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  const renderChapterNode = (chapter: Chapter, level: number = 0) => {
    const isSelected = selectedChapter === chapter.id;
    const hasChildren = chapter.children && chapter.children.length > 0;

    return (
      <div key={chapter.id} className="mb-3">
        <div
          className={`group relative ${surfaces.cardGlass} rounded-lg p-4 border ${
            isSelected ? 'border-fuchsia-500' : 'border-slate-700/50'
          } hover:border-fuchsia-500/50 transition-all cursor-pointer`}
          style={{ marginLeft: `${level * 2}rem` }}
          onClick={() => setSelectedChapter(chapter.id)}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {hasChildren && <GitBranch className="w-4 h-4 text-fuchsia-400" />}
                <h3 className="text-white font-semibold truncate">{chapter.title}</h3>
                <span className={`${components.badge} ${getStatusColor(chapter.publishStatus)}`}>
                  {chapter.publishStatus}
                </span>
              </div>
              {chapter.summary && (
                <p className="text-sm text-slate-400 line-clamp-2 mb-2">{chapter.summary}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>{chapter.cardCount || 0} cards</span>
                {hasChildren && <span>{chapter.children!.length} branches</span>}
              </div>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Open edit modal
                }}
                className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-white transition"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setNewChapterData({ ...newChapterData, parentId: chapter.id });
                  setShowNewChapter(true);
                }}
                className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 text-fuchsia-400 hover:text-fuchsia-300 transition"
              >
                <GitBranch className="w-4 h-4" />
              </button>
            </div>
          </div>

          {isSelected && (
            <div className="absolute -right-2 top-1/2 -translate-y-1/2">
              <ChevronRight className="w-5 h-5 text-fuchsia-500" />
            </div>
          )}
        </div>

        {hasChildren && (
          <div className="mt-3 space-y-3">
            {chapter.children!.map(child => renderChapterNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-fuchsia-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex gap-6">
      {/* Chapter Tree */}
      <div className="flex-1 overflow-y-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Story Structure</h2>
            <button
              onClick={() => setShowNewChapter(true)}
              className={components.buttonPrimary}
            >
              <Plus className="w-4 h-4" />
              Add Chapter
            </button>
          </div>
        </div>

        {chapters.length === 0 ? (
          <div className={`${surfaces.cardGlass} rounded-xl p-12 border border-slate-700/50 text-center`}>
            <GitBranch className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Chapters Yet</h3>
            <p className="text-slate-400 mb-6">
              Create your first chapter to start building your story
            </p>
            <button
              onClick={() => setShowNewChapter(true)}
              className={components.buttonPrimary}
            >
              <Plus className="w-4 h-4" />
              Create First Chapter
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {chapters.map(chapter => renderChapterNode(chapter))}
          </div>
        )}
      </div>

      {/* Chapter Editor Panel */}
      {selectedChapter && (
        <div className="w-96">
          <div className={`${surfaces.cardGlass} rounded-xl p-6 border border-slate-700/50 sticky top-6`}>
            <h3 className="text-lg font-semibold text-white mb-4">Chapter Editor</h3>
            <p className="text-slate-400 text-sm mb-4">
              Selected: {chapters.find(c => c.id === selectedChapter)?.title}
            </p>
            <div className="space-y-3">
              <button className={`w-full ${components.buttonPrimary} justify-center`}>
                <Edit className="w-4 h-4" />
                Edit Details
              </button>
              <button className={`w-full ${components.buttonSecondary} justify-center`}>
                <Plus className="w-4 h-4" />
                Add Cards
              </button>
              <button className={`w-full ${components.buttonSecondary} justify-center`}>
                <Eye className="w-4 h-4" />
                Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Chapter Modal */}
      {showNewChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`${surfaces.overlayGlass} rounded-xl p-6 border border-fuchsia-500/50 max-w-lg w-full`}>
            <h3 className="text-xl font-bold text-white mb-4">
              {newChapterData.parentId ? 'Create Branch Chapter' : 'Create New Chapter'}
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Chapter Title *
                </label>
                <input
                  type="text"
                  value={newChapterData.title}
                  onChange={(e) => setNewChapterData({ ...newChapterData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                  placeholder="Enter chapter title..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Summary
                </label>
                <textarea
                  value={newChapterData.summary}
                  onChange={(e) => setNewChapterData({ ...newChapterData, summary: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-400"
                  placeholder="Describe this chapter..."
                />
              </div>

              {newChapterData.parentId && (
                <div className={`${surfaces.subtleGlass} rounded-lg p-3 border border-amber-500/30`}>
                  <p className="text-xs text-amber-400">
                    This will create a branching path from the selected chapter
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowNewChapter(false);
                  setNewChapterData({ title: '', summary: '', parentId: null });
                }}
                className={components.buttonSecondary}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChapter}
                disabled={!newChapterData.title}
                className={`${components.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Plus className="w-4 h-4" />
                Create Chapter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
