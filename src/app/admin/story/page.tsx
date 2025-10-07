"use client";

import { useState, useEffect } from 'react';
import { BookOpen, Plus, ChevronRight, Edit, Trash2, GripVertical, Eye, EyeOff } from 'lucide-react';
import { surfaces, colors, components, typography, borders, focus } from '@/lib/admin/designTokens';
import AddChapterModal from '@/components/cms/AddChapterModal';
import { ChapterReorderList } from '@/components/cms/ChapterReorderList';
import StoryCardModal from '@/components/cms/StoryCardModal';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
}

export default function StoryBuilderPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [chapters, setChapters] = useState<any[]>([]);
  const [chapterCards, setChapterCards] = useState<Record<string, any[]>>({});
  const [csrfToken, setCsrfToken] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [showAddChapterModal, setShowAddChapterModal] = useState(false);
  const [showChapterReorder, setShowChapterReorder] = useState(false);
  const [editingChapter, setEditingChapter] = useState<any>(null);
  const [showStoryCardModal, setShowStoryCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [editingCardChapterId, setEditingCardChapterId] = useState<string>('');
  const [chapterSubChapters, setChapterSubChapters] = useState<Record<string, any[]>>({});
  const [loadingSubChapters, setLoadingSubChapters] = useState(false);

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
    if (chapters.length > 0 && !selectedChapterId) {
      setSelectedChapterId(chapters[0].id);
    }
  }, [chapters]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/user');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCSRFToken = async () => {
    try {
      const response = await fetch('/api/csrf-token');
      if (response.ok) {
        const data = await response.json();
        setCsrfToken(data.csrfToken);
      }
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
    }
  };

  const fetchChapters = async () => {
    try {
      const response = await fetch('/api/chapters');
      if (response.ok) {
        const data = await response.json();
        setChapters(data);
        
        const cardsData: Record<string, any[]> = {};
        for (const chapter of data) {
          try {
            const chapterResponse = await fetch(`/api/chapters/${chapter.id}`);
            if (chapterResponse.ok) {
              const chapterDetail = await chapterResponse.json();
              cardsData[chapter.id] = chapterDetail.storyCards || [];
            }
          } catch (error) {
            console.error(`Failed to fetch cards for chapter ${chapter.id}:`, error);
          }
        }
        setChapterCards(cardsData);
      }
    } catch (error) {
      console.error('Failed to fetch chapters:', error);
    }
  };

  const toggleSubChapters = async (chapterId: string) => {
    if (chapterSubChapters[chapterId]) {
      setChapterSubChapters(prev => {
        const updated = { ...prev };
        delete updated[chapterId];
        return updated;
      });
      return;
    }

    setLoadingSubChapters(true);
    try {
      const response = await fetch(`/api/chapters/${chapterId}/subchapters`);
      if (response.ok) {
        const data = await response.json();
        setChapterSubChapters(prev => ({
          ...prev,
          [chapterId]: data
        }));
      }
    } catch (error) {
      console.error('Failed to fetch subchapters:', error);
    } finally {
      setLoadingSubChapters(false);
    }
  };

  const handleChapterReorder = async (newOrder: Array<{ id: string; order: number; parentId?: string | null }>) => {
    try {
      const response = await fetch('/api/chapters/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ chapterIds: newOrder.map(item => item.id) }),
      });

      if (response.ok) {
        await fetchChapters();
      }
    } catch (error) {
      console.error('Failed to reorder chapters:', error);
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!confirm('Are you sure you want to delete this chapter? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/chapters/${chapterId}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });

      if (response.ok) {
        await fetchChapters();
        if (selectedChapterId === chapterId) {
          setSelectedChapterId(chapters[0]?.id || null);
        }
      }
    } catch (error) {
      console.error('Failed to delete chapter:', error);
    }
  };

  const handleEditChapter = (chapter: any) => {
    setEditingChapter(chapter);
    setShowAddChapterModal(true);
  };

  const selectedChapter = chapters.find(c => c.id === selectedChapterId);
  const selectedChapterCards = selectedChapterId ? (chapterCards[selectedChapterId] || []) : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-rose-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <p className="text-slate-400">Loading Story Builder...</p>
        </div>
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className={`${surfaces.cardGlass} rounded-xl p-8 border border-red-500/50 max-w-md`}>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-slate-400">You need admin privileges to access Story Builder.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${colors.gradients.primary} flex items-center justify-center shadow-lg`}>
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={`${typography.h1} text-white`}>
                  Story Builder
                </h1>
                <p className="text-slate-400 mt-1">
                  Create and manage immersive story experiences
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowChapterReorder(!showChapterReorder)}
                className={components.buttonSecondary}
              >
                {showChapterReorder ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    Hide Reorder
                  </>
                ) : (
                  <>
                    <GripVertical className="w-4 h-4" />
                    Reorder
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setEditingChapter(null);
                  setShowAddChapterModal(true);
                }}
                className={components.buttonPrimary}
              >
                <Plus className="w-4 h-4" />
                New Chapter
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar: Chapter List */}
          <div className="lg:col-span-1">
            <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-4`}>
              <h2 className={`${typography.h4} text-white mb-4`}>
                Chapters ({chapters.length})
              </h2>
              
              {showChapterReorder ? (
                <ChapterReorderList
                  chapters={chapters}
                  onReorderComplete={handleChapterReorder}
                  onReorderStart={() => console.log('Started reordering chapters')}
                  onDelete={handleDeleteChapter}
                  onEdit={handleEditChapter}
                  csrfToken={csrfToken}
                />
              ) : (
                <div className="space-y-2">
                  {chapters.map((chapter) => (
                    <button
                      key={chapter.id}
                      onClick={() => setSelectedChapterId(chapter.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                        selectedChapterId === chapter.id
                          ? 'bg-fuchsia-600 text-white shadow'
                          : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{chapter.title}</p>
                          <p className={`text-xs ${selectedChapterId === chapter.id ? 'text-white/70' : 'text-slate-500'}`}>
                            {chapterCards[chapter.id]?.length || 0} cards
                          </p>
                        </div>
                        <ChevronRight className={`w-4 h-4 flex-shrink-0 ml-2 ${selectedChapterId === chapter.id ? 'opacity-100' : 'opacity-0'}`} />
                      </div>
                    </button>
                  ))}
                  
                  {chapters.length === 0 && (
                    <div className="text-center py-8">
                      <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-sm text-slate-400">No chapters yet</p>
                      <p className="text-xs text-slate-500 mt-1">Create your first chapter to begin</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Content: Selected Chapter Details */}
          <div className="lg:col-span-3">
            {selectedChapter ? (
              <div className="space-y-6">
                {/* Chapter Header */}
                <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-6`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h2 className={`${typography.h2} text-white mb-2`}>
                        {selectedChapter.title}
                      </h2>
                      {selectedChapter.summary && (
                        <p className="text-slate-400 text-sm">{selectedChapter.summary}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditChapter(selectedChapter)}
                        className={`${components.buttonSecondary} !px-3 !py-2`}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteChapter(selectedChapter.id)}
                        className={`${components.buttonSecondary} !px-3 !py-2 hover:!bg-red-500/20 hover:!text-red-400`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 pt-4 border-t border-slate-700/50">
                    <div className={components.badge}>
                      {selectedChapterCards.length} Story Cards
                    </div>
                    {selectedChapter.subChapterCount !== undefined && (
                      <div className="text-purple-300 text-sm bg-purple-500/20 border border-purple-500/30 px-3 py-1 rounded-lg">
                        {selectedChapter.subChapterCount} Sub-Chapters
                      </div>
                    )}
                    <button
                      onClick={() => toggleSubChapters(selectedChapter.id)}
                      className={`ml-auto ${components.buttonSecondary} !text-sm`}
                      disabled={loadingSubChapters}
                    >
                      {loadingSubChapters ? 'Loading...' : 
                        (chapterSubChapters[selectedChapter.id] ? 'Hide Sub-Chapters' : 'Show Sub-Chapters')}
                    </button>
                    <button
                      onClick={() => {
                        setEditingCard(null);
                        setEditingCardChapterId(selectedChapter.id);
                        setShowStoryCardModal(true);
                      }}
                      className={components.buttonPrimary}
                    >
                      <Plus className="w-4 h-4" />
                      Add Card
                    </button>
                  </div>
                </div>

                {/* Story Cards Grid */}
                <div>
                  <h3 className={`${typography.h4} text-white mb-4`}>Story Cards</h3>
                  {selectedChapterCards.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedChapterCards.map((card: any, index: number) => {
                        const cardContent = card.content || {};
                        const visualLayout = cardContent.visualLayout;
                        const textContent = visualLayout?.text || cardContent.text || {};
                        const videoContent = visualLayout?.video || cardContent.video;
                        const imageContent = visualLayout?.image || cardContent.image;

                        return (
                          <div
                            key={card.id || index}
                            onClick={() => {
                              setEditingCard({
                                cardId: card.id,
                                content: card.content,
                                visualLayout: card.content?.visualLayout,
                                order: card.order,
                                hasAR: card.hasAR,
                              });
                              setEditingCardChapterId(selectedChapter.id);
                              setShowStoryCardModal(true);
                            }}
                            className={`group ${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.lg} p-5 cursor-pointer hover:bg-white/10 transition-all ${focus.ring}`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs text-slate-400 font-medium">Card {index + 1}</span>
                              <Edit className="w-4 h-4 text-slate-400 group-hover:text-fuchsia-400 transition-colors" />
                            </div>

                            {textContent.title && (
                              <h4 className="font-bold text-base mb-2 text-white group-hover:text-fuchsia-300 transition-colors line-clamp-1">
                                {textContent.title}
                              </h4>
                            )}

                            {textContent.subtitle && (
                              <p className="text-sm text-slate-300 mb-2 line-clamp-1">
                                {textContent.subtitle}
                              </p>
                            )}

                            {textContent.description && (
                              <p className="text-xs text-slate-400 mb-3 line-clamp-2">
                                {textContent.description}
                              </p>
                            )}

                            <div className="flex flex-wrap gap-1.5">
                              {videoContent?.url && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                  📺 Video
                                </span>
                              )}
                              {imageContent?.url && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                                  🖼️ Image
                                </span>
                              )}
                              {card.customButtons && card.customButtons.length > 0 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  🎯 {card.customButtons.length} Button{card.customButtons.length > 1 ? 's' : ''}
                                </span>
                              )}
                              {card.hasAR && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30">
                                  🌐 AR
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={`${surfaces.subtleGlass} ${borders.radius.lg} p-12 text-center`}>
                      <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400 mb-2">No story cards yet</p>
                      <p className="text-sm text-slate-500 mb-4">Add your first card to start building this chapter</p>
                      <button
                        onClick={() => {
                          setEditingCard(null);
                          setEditingCardChapterId(selectedChapter.id);
                          setShowStoryCardModal(true);
                        }}
                        className={components.buttonPrimary}
                      >
                        <Plus className="w-4 h-4" />
                        Add First Card
                      </button>
                    </div>
                  )}
                </div>

                {/* Sub-Chapters */}
                {selectedChapter && chapterSubChapters[selectedChapter.id] && (
                  <div>
                    <h3 className={`${typography.h4} text-white mb-4`}>
                      Sub-Chapters ({chapterSubChapters[selectedChapter.id].length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {chapterSubChapters[selectedChapter.id].map((subChapter: any) => (
                        <div
                          key={subChapter.id}
                          className={`${surfaces.subtleGlass} border border-purple-500/30 ${borders.radius.lg} p-4 cursor-pointer hover:bg-purple-500/10 transition-all`}
                          onClick={() => window.location.href = `/before/story/${selectedChapter.id}/${subChapter.id}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-purple-400 font-medium uppercase tracking-wide">
                              Sub-Chapter
                            </span>
                            {subChapter.customButtons && subChapter.customButtons.length > 0 && (
                              <span className="text-xs text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30">
                                {subChapter.customButtons.length} buttons
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-white mb-1 line-clamp-1">{subChapter.title}</h4>
                          {subChapter.summary && (
                            <p className="text-sm text-slate-400 line-clamp-2">{subChapter.summary}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={`${surfaces.cardGlass} ${borders.radius.xl} p-12 text-center`}>
                <BookOpen className="w-20 h-20 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Select a Chapter</h3>
                <p className="text-slate-400">Choose a chapter from the left to view and edit its content</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddChapterModal
        isOpen={showAddChapterModal}
        onClose={() => {
          setShowAddChapterModal(false);
          setEditingChapter(null);
        }}
        onChapterAdded={() => {
          fetchChapters();
          setShowAddChapterModal(false);
          setEditingChapter(null);
        }}
        csrfToken={csrfToken}
        editMode={!!editingChapter}
        chapterId={editingChapter?.id}
        initialData={editingChapter ? {
          title: editingChapter.title,
          summary: editingChapter.summary,
          hasAR: editingChapter.hasAR,
          parentId: editingChapter.parentId,
          imageMediaId: editingChapter.imageMediaId,
          videoMediaId: editingChapter.videoMediaId,
        } : undefined}
      />

      <StoryCardModal
        isOpen={showStoryCardModal}
        onClose={() => {
          setShowStoryCardModal(false);
          setEditingCard(null);
          setEditingCardChapterId('');
        }}
        onCardSaved={() => {
          fetchChapters();
          setShowStoryCardModal(false);
          setEditingCard(null);
          setEditingCardChapterId('');
        }}
        chapterId={editingCardChapterId}
        csrfToken={csrfToken}
        editMode={!!editingCard}
        cardId={editingCard?.cardId}
        initialData={editingCard ? {
          content: editingCard.content,
          visualLayout: editingCard.visualLayout,
          order: editingCard.order,
          hasAR: editingCard.hasAR,
        } : undefined}
      />
    </div>
  );
}
