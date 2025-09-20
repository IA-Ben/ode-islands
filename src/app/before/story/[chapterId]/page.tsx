'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import EnhancedCustomButton from '@/components/EnhancedCustomButton';

interface StoryCard {
  id: string;
  order: number;
  content: any; // JSON content
  hasAR: boolean;
  customButtons?: any[];
}

interface SubChapter {
  id: string;
  title: string;
  summary: string;
  order: number;
  unlockConditions?: any;
}

interface Chapter {
  id: string;
  title: string;
  summary: string;
  storyCards: StoryCard[];
  subChapters: SubChapter[];
}

export default function ChapterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.chapterId) {
      fetchChapter(params.chapterId as string);
    }
  }, [params.chapterId]);

  const fetchChapter = async (chapterId: string) => {
    try {
      const response = await fetch(`/api/chapters/${chapterId}`);
      if (response.ok) {
        const data = await response.json();
        setChapter(data);
        // Track progress
        trackProgress(chapterId, 0);
      }
    } catch (error) {
      console.error('Error fetching chapter:', error);
    } finally {
      setLoading(false);
    }
  };

  const trackProgress = async (chapterId: string, cardIndex: number) => {
    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapterId, cardIndex }),
      });
    } catch (error) {
      console.error('Error tracking progress:', error);
    }
  };

  const handleNextCard = () => {
    if (chapter && currentCardIndex < chapter.storyCards.length - 1) {
      const newIndex = currentCardIndex + 1;
      setCurrentCardIndex(newIndex);
      trackProgress(chapter.id, newIndex);
    }
  };

  const handlePrevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading chapter...</p>
        </div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Chapter not found</p>
        </div>
      </div>
    );
  }

  const currentCard = chapter.storyCards[currentCardIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with navigation */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center space-x-2 text-sm text-gray-500">
            <Link href="/before" className="hover:text-gray-700">Before</Link>
            <span>/</span>
            <Link href="/before/stories" className="hover:text-gray-700">Stories</Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{chapter.title}</span>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Story cards section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              {/* Chapter header */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{chapter.title}</h1>
                {chapter.summary && (
                  <p className="text-gray-600">{chapter.summary}</p>
                )}
              </div>

              {/* Story card content */}
              {currentCard && (
                <div className="mb-6">
                  {/* Card progress indicator */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-500 mb-2">
                      <span>Card {currentCardIndex + 1} of {chapter.storyCards.length}</span>
                      {currentCard.hasAR && (
                        <span className="text-purple-600 font-medium">AR Available</span>
                      )}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${((currentCardIndex + 1) / chapter.storyCards.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Card content rendering */}
                  <div className="prose max-w-none">
                    {currentCard.content.text && (
                      <div className="mb-4">
                        {currentCard.content.text.title && (
                          <h2 className="text-xl font-semibold mb-2">{currentCard.content.text.title}</h2>
                        )}
                        {currentCard.content.text.description && (
                          <p className="text-gray-700">{currentCard.content.text.description}</p>
                        )}
                      </div>
                    )}

                    {currentCard.content.image && (
                      <div className="mb-4">
                        <img
                          src={currentCard.content.image.url}
                          alt={currentCard.content.text?.title || 'Story image'}
                          className="w-full rounded-lg"
                        />
                      </div>
                    )}

                    {currentCard.content.video && (
                      <div className="mb-4">
                        <video
                          src={currentCard.content.video.url}
                          controls
                          className="w-full rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  {/* Custom buttons */}
                  {currentCard.customButtons && currentCard.customButtons.length > 0 && (
                    <div className="mt-6 flex flex-wrap gap-3">
                      {currentCard.customButtons.map((button) => (
                        <EnhancedCustomButton key={button.id} button={button} />
                      ))}
                    </div>
                  )}

                  {/* Navigation buttons */}
                  <div className="mt-8 flex justify-between">
                    <button
                      onClick={handlePrevCard}
                      disabled={currentCardIndex === 0}
                      className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={handleNextCard}
                      disabled={currentCardIndex === chapter.storyCards.length - 1}
                      className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sub-chapters sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Sub-Chapters</h2>
              
              {chapter.subChapters.length > 0 ? (
                <div className="space-y-3">
                  {chapter.subChapters.map((subChapter) => (
                    <div
                      key={subChapter.id}
                      className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/before/story/${chapter.id}/${subChapter.id}`)}
                    >
                      <h3 className="font-medium text-gray-900">{subChapter.title}</h3>
                      {subChapter.summary && (
                        <p className="text-sm text-gray-600 mt-1">{subChapter.summary}</p>
                      )}
                      <div className="mt-2 text-sm text-blue-600">
                        Explore →
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No sub-chapters available</p>
              )}
            </div>

            {/* AR Content */}
            {chapter.storyCards.some(card => card.hasAR) && (
              <div className="bg-white rounded-lg shadow-md p-6 mt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">AR Experiences</h2>
                <Link
                  href="/before/ar"
                  className="inline-flex items-center text-purple-600 hover:text-purple-700"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                  </svg>
                  View AR Content
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}