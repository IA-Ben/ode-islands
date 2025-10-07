'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import type { CardData } from '@/@typings';
import odeIslandsData from '../../data/ode-islands.json';
import AddChapterModal from '@/components/cms/AddChapterModal';
import { ChapterReorderList } from '@/components/cms/ChapterReorderList';
import AdvancedSearch from '@/components/cms/AdvancedSearch';
import { MediaLibrary } from '@/components/cms/MediaLibrary';
import StoryCardModal from '@/components/cms/StoryCardModal';
import { surfaces, colors, typography, components, focus, borders } from '@/lib/admin/designTokens';

type ChapterData = {
  [key: string]: CardData[];
};

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
};

export default function CMSPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState<string>('');
  const [animateIn, setAnimateIn] = useState(false);
  const [chapters, setChapters] = useState<any[]>([]);
  const [chapterCards, setChapterCards] = useState<Record<string, any[]>>({});
  const [csrfToken, setCsrfToken] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('before');
  const [selectedChapter, setSelectedChapter] = useState('chapter-1');
  const [showAddChapterModal, setShowAddChapterModal] = useState(false);
  const [showChapterReorder, setShowChapterReorder] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [chapterSubChapters, setChapterSubChapters] = useState<Record<string, any[]>>({});
  const [loadingSubChapters, setLoadingSubChapters] = useState(false);
  const [editingChapter, setEditingChapter] = useState<any>(null);
  const [showStoryCardModal, setShowStoryCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [editingCardChapterId, setEditingCardChapterId] = useState<string>('');

  console.log('CMS Page component loaded - debugging active');

  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user?.isAdmin) {
      fetchCSRFToken();
      fetchChapters();
    }
  }, [user]);

  const checkAuth = async () => {
    try {
      console.log('Checking authentication status...');
      const response = await fetch('/api/auth/user');
      console.log('Auth user response:', response.status, response.statusText);
      
      if (response.ok) {
        const userData = await response.json();
        console.log('User data received:', userData);
        setUser(userData);
      } else {
        setLoginError('Not authenticated');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setLoginError('Authentication check failed');
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
        console.log('CSRF token fetched successfully');
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
        console.log('Chapters loaded successfully:', data.length, 'chapters');
        
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
            cardsData[chapter.id] = [];
          }
        }
        setChapterCards(cardsData);
        console.log('Chapter cards loaded successfully');
      }
    } catch (error) {
      console.error('Failed to fetch chapters:', error);
    }
  };

  const fetchChapterCards = async (chapterId: string) => {
    try {
      const response = await fetch(`/api/chapters/${chapterId}`);
      if (response.ok) {
        const chapterDetail = await response.json();
        setChapterCards(prev => ({
          ...prev,
          [chapterId]: chapterDetail.storyCards || []
        }));
        console.log(`Cards for chapter ${chapterId} refreshed successfully`);
      }
    } catch (error) {
      console.error(`Failed to fetch cards for chapter ${chapterId}:`, error);
    }
  };


  const handleChapterAdded = () => {
    // Refresh chapters and get updated list
    fetchChapters();
    setEditingChapter(null);
  };

  const handleEditChapter = async (chapter: any) => {
    try {
      const response = await fetch(`/api/chapters/${chapter.id}`);
      if (response.ok) {
        const fullChapterData = await response.json();
        setEditingChapter(fullChapterData);
        setShowAddChapterModal(true);
      } else {
        console.error('Failed to fetch chapter details for editing');
        alert('Failed to load chapter details for editing');
      }
    } catch (error) {
      console.error('Error fetching chapter for edit:', error);
      alert('Error loading chapter for editing');
    }
  };

  const handleDeleteChapter = async (chapterId: string, chapterTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${chapterTitle}"? This will also delete all cards in this chapter.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/cms/chapters/${chapterId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete chapter');
      }

      console.log('Chapter deleted successfully');
      
      // Refresh chapters to get updated list
      await fetchChapters();
    } catch (error) {
      console.error('Error deleting chapter:', error);
      alert('Failed to delete chapter. Please try again.');
    }
  };

  const handleChapterReorder = async (newOrder: Array<{ id: string; order: number }>) => {
    try {
      const response = await fetch('/api/cms/chapters/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ chapterOrders: newOrder }),
      });

      if (!response.ok) {
        throw new Error('Failed to reorder chapters');
      }

      const data = await response.json();
      console.log('Chapters reordered successfully:', data);
      
      // Refresh chapters to get updated order
      await fetchChapters();
    } catch (error) {
      console.error('Error reordering chapters:', error);
      throw error; // Re-throw to let the component handle the error
    }
  };

  const fetchSubChapters = async (chapterId: string) => {
    try {
      setLoadingSubChapters(true);
      const response = await fetch(`/api/sub-chapters?chapterId=${chapterId}`);
      if (response.ok) {
        const subChapters = await response.json();
        setChapterSubChapters(prev => ({
          ...prev,
          [chapterId]: subChapters
        }));
      }
    } catch (error) {
      console.error('Error fetching sub-chapters:', error);
    } finally {
      setLoadingSubChapters(false);
    }
  };

  const toggleSubChapters = async (chapterId: string) => {
    if (chapterSubChapters[chapterId]) {
      // Hide sub-chapters
      setChapterSubChapters(prev => {
        const updated = { ...prev };
        delete updated[chapterId];
        return updated;
      });
    } else {
      // Fetch and show sub-chapters
      await fetchSubChapters(chapterId);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center gap-2 justify-center mb-4">
            <div className="w-3 h-3 bg-fuchsia-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-3 bg-fuchsia-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-3 h-3 bg-fuchsia-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <div className="text-slate-300 text-lg font-medium">Loading CMS...</div>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className={`${surfaces.darkGlass} ${borders.glassBorder} ${borders.radius.xl} p-8 max-w-md w-full`}>
          <div className="text-center mb-8">
            <div className={`w-20 h-20 ${colors.gradients.primary} rounded-full flex items-center justify-center mx-auto mb-6`}>
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className={`${typography.h2} text-white mb-2`}>CMS Login Required</h1>
            <p className="text-slate-400">Please sign in with your admin account</p>
          </div>
          {loginError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
              <p className="text-red-400 text-sm">{loginError}</p>
            </div>
          )}
          <a
            href="/api/login"
            className={`${components.buttonPrimary} w-full justify-center`}
          >
            Sign in with Replit
          </a>
        </div>
      </div>
    );
  }

  // Show access denied for non-admin users
  if (!user.isAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className={`${surfaces.darkGlass} ${borders.glassBorder} ${borders.radius.xl} p-8 max-w-md w-full text-center`}>
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className={`${typography.h2} text-white mb-2`}>Access Restricted</h1>
          <p className="text-slate-400 mb-6">Content management access requires admin permissions</p>
          <p className="text-sm text-slate-500 mb-6">Logged in as: {user.email}</p>
          <button
            onClick={handleLogout}
            className={`${components.buttonSecondary} w-full justify-center`}
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // Get API chapter data for metadata (including cardCount)
  const getApiChapterData = (chapterKey: string) => {
    const chapterOrder = parseInt(chapterKey.replace('chapter-', ''));
    return chapters.find((ch: any) => ch.order === chapterOrder);
  };
  
  const currentApiChapter = getApiChapterData(selectedChapter);
  
  // Get cards from database state instead of JSON
  const currentChapterCards = currentApiChapter ? (chapterCards[currentApiChapter.id] || []) : [];
  
  // Filter chapters for navigation (use API chapters instead of JSON)
  const chapterKeys = chapters
    .filter((ch: any) => ch.order)
    .sort((a: any, b: any) => a.order - b.order)
    .map((ch: any) => `chapter-${ch.order}`);

  const getPhaseTitle = (phase: string) => {
    switch (phase) {
      case 'before': return 'Before Phase Management';
      case 'event': return 'Event Phase Management';
      case 'after': return 'After Phase Management';
      case 'media': return 'Media Library';
      default: return 'Content Management System';
    }
  };

  const getPhaseDescription = (phase: string) => {
    switch (phase) {
      case 'before': return `Manage storytelling chapters, educational content, and user preparation materials. ${chapterKeys.length} chapters with ${Object.values(chapters).flat().length} total cards configured.`;
      case 'event': return 'Configure real-time features, live polling, AR experiences, and interactive elements that enhance your live event experience.';
      case 'after': return 'Design post-event experiences including memories, sharing tools, community features, and continued engagement opportunities.';
      case 'media': return 'Upload, organize, and manage all media assets including images, videos, audio files, and documents used throughout your application.';
      default: return 'Professional content management for your three-phase event companion application.';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Professional Administrative Header */}
      <div className={`${surfaces.darkGlass} border-b ${borders.glassBorder} sticky top-0 z-40 backdrop-blur`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`${typography.h2} text-white`}>
                Content Management System
              </div>
            </div>

            <div className="text-center flex-1">
              <div className={`${typography.h4} text-white`}>
                {getPhaseTitle(selectedPhase)}
              </div>
              <div className="text-sm text-slate-400">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-right mr-4">
                <div className="text-sm font-medium text-slate-200">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-xs text-slate-400">
                  {user.email}
                </div>
              </div>

              <div className="flex space-x-2">
                <Link 
                  href="/admin/theme"
                  className={`${components.buttonPrimary} text-sm`}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                  </svg>
                  Theme Editor
                </Link>

                <button
                  onClick={handleLogout}
                  className={`${components.buttonSecondary} text-sm`}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Phase Navigation Tabs */}
        <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-6`}>
          <h2 className={`${typography.h3} text-white mb-6`}>
            Choose Experience Phase
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setSelectedPhase('before')}
              className={`${components.pillNav} ${
                selectedPhase === 'before'
                  ? 'bg-fuchsia-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Before Phase
            </button>
            <button
              onClick={() => setSelectedPhase('event')}
              className={`${components.pillNav} ${
                selectedPhase === 'event'
                  ? 'bg-fuchsia-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Event Phase
            </button>
            <button
              onClick={() => setSelectedPhase('after')}
              className={`${components.pillNav} ${
                selectedPhase === 'after'
                  ? 'bg-fuchsia-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              After Phase
            </button>
            <button
              onClick={() => setSelectedPhase('media')}
              className={`${components.pillNav} ${
                selectedPhase === 'media'
                  ? 'bg-fuchsia-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Media Library
            </button>
          </div>
        </div>

        {/* Quick Action Cards - CMS Tools */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button onClick={() => setShowSearch(!showSearch)} className="w-full">
            <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.lg} p-6 text-center h-full transition-all hover:bg-white/10 ${showSearch ? 'ring-2 ring-fuchsia-500' : ''} ${focus.ring}`}>
              <div className="text-3xl mb-2">🔍</div>
              <h3 className="text-white text-lg font-semibold mb-2">Advanced Search</h3>
              <p className="text-slate-400 text-sm">Search and filter all content</p>
            </div>
          </button>
          
          <Link href="/admin/cms/custom-buttons" className="w-full">
            <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.lg} p-6 text-center h-full transition-all hover:bg-white/10 ${focus.ring}`}>
              <div className="text-3xl mb-2">🎯</div>
              <h3 className="text-white text-lg font-semibold mb-2">Custom Buttons Manager</h3>
              <p className="text-slate-400 text-sm">Configure interactive buttons across all content</p>
            </div>
          </Link>
          
          <Link href="/admin/cms/scheduler" className="w-full">
            <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.lg} p-6 text-center h-full transition-all hover:bg-white/10 ${focus.ring}`}>
              <div className="text-3xl mb-2">⏰</div>
              <h3 className="text-white text-lg font-semibold mb-2">Content Scheduler</h3>
              <p className="text-slate-400 text-sm">Manage time-based content availability</p>
            </div>
          </Link>
          
          <Link href="/admin/cms/after-experience" className="w-full">
            <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.lg} p-6 text-center h-full transition-all hover:bg-white/10 ${focus.ring}`}>
              <div className="text-3xl mb-2">🎭</div>
              <h3 className="text-white text-lg font-semibold mb-2">After Experience</h3>
              <p className="text-slate-400 text-sm">Configure post-event content and features</p>
            </div>
          </Link>
        </div>

        {/* Advanced Search Section */}
        {showSearch && (
          <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-6`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 text-fuchsia-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span className={`${typography.h3} text-white`}>Advanced Content Search</span>
              </div>
              <button
                onClick={() => setShowSearch(false)}
                className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <AdvancedSearch 
              onResultClick={(result) => {
                console.log('Search result clicked:', result);
              }}
            />
          </div>
        )}

        {/* Sample Data Section */}
        <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-6`}>
          <div className="flex items-center space-x-3 mb-6">
            <svg className="w-6 h-6 text-fuchsia-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span className={`${typography.h3} text-white`}>Sample Event Data Generator</span>
          </div>
          <p className="text-slate-400 mb-6">
            Populate the app with comprehensive sample data showcasing all features across the three phases.
          </p>
          <div className={`${surfaces.subtleGlass} ${borders.radius.lg} p-4 text-center`}>
            <p className="text-slate-400 text-sm">Sample data controls will be available here</p>
          </div>
        </div>

        {/* Before Phase Content */}
        {selectedPhase === 'before' && (
          <>
            {/* Chapter Navigation */}
            <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-6`}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <svg className="w-6 h-6 mr-3 text-fuchsia-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span className={`${typography.h3} text-white`}>Storytelling Chapters</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setShowChapterReorder(!showChapterReorder)}
                    className={`${components.buttonSecondary}`}
                  >
                    {showChapterReorder ? 'Hide Reorder' : 'Reorder Chapters'}
                  </button>
                  <button 
                    onClick={() => setShowAddChapterModal(true)}
                    className={`${components.buttonPrimary}`}
                  >
                    + Add Chapter
                  </button>
                </div>
              </div>
              <div>
                {showChapterReorder ? (
                  <ChapterReorderList 
                    chapters={chapters}
                    onReorderComplete={handleChapterReorder}
                    onReorderStart={() => console.log('Started reordering chapters')}
                    onDelete={handleDeleteChapter}
                    onEdit={handleEditChapter}
                    className="mb-6"
                    csrfToken={csrfToken}
                  />
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {chapterKeys.map((chapterId) => (
                      <button
                        key={chapterId}
                        onClick={() => setSelectedChapter(chapterId)}
                        className={`${components.pillNav} capitalize ${
                          selectedChapter === chapterId
                            ? 'bg-fuchsia-600 text-white'
                            : 'text-slate-300 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {chapterId.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Chapter Overview */}
            <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-6`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={`${typography.h2} text-white`}>
                  {`${selectedChapter.replace('-', ' ').toUpperCase()} Chapter`}
                </h2>
                <div className="flex items-center space-x-4">
                  <div className={`${components.badge} text-sm`}>
                    {currentApiChapter?.cardCount || currentChapterCards.length} Cards
                  </div>
                  {currentApiChapter?.subChapterCount !== undefined && (
                    <div className="text-purple-300 text-sm bg-purple-500/20 border border-purple-500/30 px-4 py-2 rounded-lg">
                      {currentApiChapter.subChapterCount} Sub-Chapters
                    </div>
                  )}
                  <button 
                    onClick={() => currentApiChapter && toggleSubChapters(currentApiChapter.id)}
                    className={`${components.buttonSecondary} ${loadingSubChapters ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={loadingSubChapters}
                  >
                    {loadingSubChapters ? 'Loading...' : 
                      (chapterSubChapters[currentApiChapter?.id || ''] ? 'Hide Sub-Chapters' : 'Show Sub-Chapters')}
                  </button>
                  <button 
                    onClick={() => {
                      setEditingCard(null);
                      setEditingCardChapterId(currentApiChapter?.id || '');
                      setShowStoryCardModal(true);
                    }}
                    className={`${components.buttonPrimary}`}
                  >
                    + Add Card
                  </button>
                </div>
              </div>
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentChapterCards.map((card: any, index: number) => {
                    const cardContent = card.content || {};
                    const visualLayout = cardContent.visualLayout;
                    const textContent = visualLayout?.text || cardContent.text || {};
                    const videoContent = visualLayout?.video || cardContent.video;
                    const imageContent = visualLayout?.image || cardContent.image;
                    
                    return (
                      <div 
                        key={card.id || index} 
                        className={`group ${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.lg} p-6 cursor-pointer hover:bg-white/10 transition-all duration-300 ${focus.ring}`}
                        onClick={() => {
                          setEditingCard({
                            cardId: card.id,
                            content: card.content,
                            visualLayout: card.content?.visualLayout,
                            order: card.order,
                            hasAR: card.hasAR,
                          });
                          setEditingCardChapterId(currentApiChapter?.id || '');
                          setShowStoryCardModal(true);
                        }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="text-sm text-slate-400 font-medium">Card {index + 1}</div>
                          <svg className="w-4 h-4 text-slate-400 group-hover:text-fuchsia-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </div>
                        
                        {textContent.title && (
                          <div className="font-bold text-lg mb-2 text-white group-hover:text-fuchsia-300 transition-colors">
                            {textContent.title}
                          </div>
                        )}
                        
                        {textContent.subtitle && (
                          <div className="font-medium mb-3 text-slate-300">
                            {textContent.subtitle}
                          </div>
                        )}
                        
                        {textContent.description && (
                          <div className="text-sm text-slate-400 mb-4 line-clamp-3">
                            {textContent.description}
                          </div>
                        )}
                        
                        <div className="flex flex-wrap gap-2">
                          {videoContent?.url && (
                            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              📺 Video
                            </div>
                          )}
                          {imageContent?.url && (
                            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                              🖼️ Image
                            </div>
                          )}
                          {card.customButtons && card.customButtons.length > 0 && (
                            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              🎯 {card.customButtons.length} Button{card.customButtons.length > 1 ? 's' : ''}
                            </div>
                          )}
                          {card.hasAR && (
                            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30">
                              🌐 AR
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Sub-Chapters Section */}
                {currentApiChapter && chapterSubChapters[currentApiChapter.id] && (
                  <div className="mt-8 pt-6 border-t border-slate-700/50">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`${typography.h4} text-white`}>
                        Sub-Chapters ({chapterSubChapters[currentApiChapter.id].length})
                      </h3>
                      <button 
                        className={`${components.buttonPrimary} text-sm`}
                      >
                        + Add Sub-Chapter
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {chapterSubChapters[currentApiChapter.id].map((subChapter: any, index: number) => (
                        <div 
                          key={subChapter.id} 
                          className={`group ${surfaces.subtleGlass} border border-purple-500/30 ${borders.radius.lg} p-4 cursor-pointer hover:bg-purple-500/10 transition-all duration-300 ${focus.ring}`}
                          onClick={() => window.location.href = `/before/story/${currentApiChapter.id}/${subChapter.id}`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-xs text-purple-400 font-medium uppercase tracking-wide">
                              Sub-Chapter {subChapter.order || index + 1}
                            </div>
                            <div className="flex items-center space-x-2">
                              {subChapter.customButtons && subChapter.customButtons.length > 0 && (
                                <div className="text-xs text-purple-300 bg-purple-500/20 px-2 py-1 rounded border border-purple-500/30">
                                  {subChapter.customButtons.length} buttons
                                </div>
                              )}
                              <svg className="w-4 h-4 text-purple-400 group-hover:text-purple-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M7 7l10 10M17 7l-10 10" />
                              </svg>
                            </div>
                          </div>
                          
                          <div className="font-bold text-base mb-2 text-white group-hover:text-purple-300 transition-colors">
                            {subChapter.title}
                          </div>
                          
                          {subChapter.summary && (
                            <div className="text-sm text-slate-400 mb-3 line-clamp-2">
                              {subChapter.summary}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between text-xs text-purple-400">
                            <span>
                              Created: {new Date(subChapter.createdAt).toLocaleDateString()}
                            </span>
                            <span className="font-medium">
                              View Details →
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Event Phase Placeholder */}
        {selectedPhase === 'event' && (
          <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-12 text-center`}>
            <div className="text-6xl mb-4">🚀</div>
            <h3 className={`${typography.h2} text-white mb-4`}>Event Phase Management</h3>
            <p className="text-slate-400 mb-6">Live event features and real-time interactions will be configured here.</p>
            <p className="text-sm text-slate-500">Coming soon...</p>
          </div>
        )}

        {/* After Phase Placeholder */}
        {selectedPhase === 'after' && (
          <div className={`${surfaces.cardGlass} ${borders.glassBorder} ${borders.radius.xl} p-12 text-center`}>
            <div className="text-6xl mb-4">🎉</div>
            <h3 className={`${typography.h2} text-white mb-4`}>After Phase Management</h3>
            <p className="text-slate-400 mb-6">Post-event experiences and community features will be configured here.</p>
            <p className="text-sm text-slate-500">Coming soon...</p>
          </div>
        )}

        {/* Media Library */}
        {selectedPhase === 'media' && csrfToken && (
          <MediaLibrary csrfToken={csrfToken} />
        )}
      </div>

      {/* Modals */}
      <AddChapterModal
        isOpen={showAddChapterModal}
        onClose={() => {
          setShowAddChapterModal(false);
          setEditingChapter(null);
        }}
        onChapterAdded={handleChapterAdded}
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
          if (editingCardChapterId) {
            fetchChapterCards(editingCardChapterId);
          }
          setShowStoryCardModal(false);
          setEditingCard(null);
          setEditingCardChapterId('');
        }}
        csrfToken={csrfToken}
        editMode={!!editingCard}
        cardId={editingCard?.cardId}
        chapterId={editingCardChapterId}
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