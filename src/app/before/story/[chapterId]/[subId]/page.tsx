'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import EnhancedCustomButton from '@/components/EnhancedCustomButton';

interface SubChapterData {
  id: string;
  title: string;
  summary: string;
  unlockConditions?: any;
  customButtons?: any[];
  content?: any; // Additional content blocks
}

interface ChapterData {
  id: string;
  title: string;
}

export default function SubChapterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [subChapter, setSubChapter] = useState<SubChapterData | null>(null);
  const [chapter, setChapter] = useState<ChapterData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.chapterId && params.subId) {
      fetchData(params.chapterId as string, params.subId as string);
    }
  }, [params.chapterId, params.subId]);

  const fetchData = async (chapterId: string, subId: string) => {
    try {
      // Fetch sub-chapter details
      const subResponse = await fetch(`/api/sub-chapters/${subId}`);
      if (subResponse.ok) {
        const subData = await subResponse.json();
        setSubChapter(subData);
      }

      // Fetch chapter info for breadcrumb
      const chapterResponse = await fetch(`/api/chapters/${chapterId}`);
      if (chapterResponse.ok) {
        const chapterData = await chapterResponse.json();
        setChapter({ id: chapterData.id, title: chapterData.title });
      }
    } catch (error) {
      console.error('Error fetching sub-chapter:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    // Track sub-chapter completion
    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          subChapterId: subChapter?.id,
          chapterId: params.chapterId,
          completed: true 
        }),
      });
      
      // Navigate back to chapter
      router.push(`/before/story/${params.chapterId}`);
    } catch (error) {
      console.error('Error completing sub-chapter:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading sub-chapter...</p>
        </div>
      </div>
    );
  }

  if (!subChapter) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Sub-chapter not found</p>
        </div>
      </div>
    );
  }

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
            {chapter && (
              <>
                <Link href={`/before/story/${chapter.id}`} className="hover:text-gray-700">
                  {chapter.title}
                </Link>
                <span>/</span>
              </>
            )}
            <span className="text-gray-900 font-medium">{subChapter.title}</span>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Sub-chapter header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">{subChapter.title}</h1>
            {subChapter.summary && (
              <p className="text-lg text-gray-600">{subChapter.summary}</p>
            )}
          </div>

          {/* Content blocks */}
          {subChapter.content && (
            <div className="prose max-w-none mb-8">
              {/* Render content blocks based on type */}
              {subChapter.content.blocks && subChapter.content.blocks.map((block: any, index: number) => {
                switch (block.type) {
                  case 'text':
                    return (
                      <div key={index} className="mb-6">
                        {block.title && <h2 className="text-xl font-semibold mb-2">{block.title}</h2>}
                        <p className="text-gray-700">{block.content}</p>
                      </div>
                    );
                  case 'image':
                    return (
                      <div key={index} className="mb-6">
                        <img
                          src={block.url}
                          alt={block.caption || 'Content image'}
                          className="w-full rounded-lg"
                        />
                        {block.caption && (
                          <p className="text-sm text-gray-600 mt-2 text-center">{block.caption}</p>
                        )}
                      </div>
                    );
                  case 'video':
                    return (
                      <div key={index} className="mb-6">
                        <video
                          src={block.url}
                          controls
                          className="w-full rounded-lg"
                        />
                      </div>
                    );
                  case 'quiz':
                    return (
                      <div key={index} className="mb-6 p-6 bg-blue-50 rounded-lg">
                        <h3 className="font-semibold mb-3">{block.question}</h3>
                        <div className="space-y-2">
                          {block.options?.map((option: string, optionIndex: number) => (
                            <label key={optionIndex} className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                name={`quiz-${index}`}
                                className="mr-2"
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  default:
                    return null;
                }
              })}
            </div>
          )}

          {/* Custom buttons */}
          {subChapter.customButtons && subChapter.customButtons.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
              <div className="flex flex-wrap gap-3">
                {subChapter.customButtons.map((button) => (
                  <EnhancedCustomButton key={button.id} button={button} />
                ))}
              </div>
            </div>
          )}

          {/* Completion section */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <Link
                href={`/before/story/${params.chapterId}`}
                className="text-gray-600 hover:text-gray-800"
              >
                ← Back to Chapter
              </Link>
              <button
                onClick={handleComplete}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Complete Sub-Chapter
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}