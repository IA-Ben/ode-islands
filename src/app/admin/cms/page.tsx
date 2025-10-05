'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { SampleDataControl } from '@/components/SampleDataControl';
import type { CardData } from '@/@typings';
import odeIslandsData from '../../data/ode-islands.json';
import AddChapterModal from '@/components/cms/AddChapterModal';
import { ChapterReorderList } from '@/components/cms/ChapterReorderList';
import AdvancedSearch from '@/components/cms/AdvancedSearch';
import { MediaLibrary } from '@/components/cms/MediaLibrary';

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
  const [csrfToken, setCsrfToken] = useState('');
  const [selectedPhase, setSelectedPhase] = useState('before');
  const [selectedChapter, setSelectedChapter] = useState('chapter-1');
  const [showAddChapterModal, setShowAddChapterModal] = useState(false);
  const [showChapterReorder, setShowChapterReorder] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [chapterSubChapters, setChapterSubChapters] = useState<Record<string, any[]>>({});
  const [loadingSubChapters, setLoadingSubChapters] = useState(false);
  const [editingChapter, setEditingChapter] = useState<any>(null);

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
      const response = await fetch('/api/auth/status');
      console.log('Auth status response:', response.status, response.statusText);
      
      if (response.ok) {
        const statusData = await response.json();
        console.log('Auth status received:', statusData);
        
        if (statusData.authenticated) {
          // User is authenticated, now get their user data
          const userResponse = await fetch('/api/auth/user');
          if (userResponse.ok) {
            const userData = await userResponse.json();
            console.log('User data received:', userData);
            setUser(userData);
          }
        }
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
      }
    } catch (error) {
      console.error('Failed to fetch chapters:', error);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600 text-lg font-medium">Loading CMS...</div>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">CMS Login Required</h1>
            <p className="text-gray-600">Please sign in with your admin account</p>
          </div>
          {loginError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 text-sm">{loginError}</p>
            </div>
          )}
          <a
            href="/api/login"
            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h1>
          <p className="text-gray-600 mb-6">Content management access requires admin permissions</p>
          <p className="text-sm text-gray-500 mb-6">Logged in as: {user.email}</p>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // Import JSON data for card content
  const jsonChapters = odeIslandsData as Record<string, any>;
  
  // Filter chapters for navigation
  const chapterKeys = Object.keys(jsonChapters).filter(id => /^chapter-\d+$/.test(id)).sort();
  const currentChapterCards = jsonChapters[selectedChapter] || [];
  
  // Get API chapter data for metadata (including cardCount)
  const getApiChapterData = (chapterKey: string) => {
    const chapterOrder = parseInt(chapterKey.replace('chapter-', ''));
    return chapters.find((ch: any) => ch.order === chapterOrder);
  };
  
  const currentApiChapter = getApiChapterData(selectedChapter);

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
    <div className="min-h-screen bg-gray-50">
      {/* Professional Administrative Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-2xl font-bold text-gray-900">
                Content Management System
              </div>
            </div>

            <div className="text-center flex-1">
              <div className="text-lg font-semibold text-gray-900">
                {getPhaseTitle(selectedPhase)}
              </div>
              <div className="text-sm text-gray-600">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-right mr-4">
                <div className="text-sm font-medium text-gray-700">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-xs text-gray-500">
                  {user.email}
                </div>
              </div>

              <div className="flex space-x-2">
                <Link 
                  href="/admin/theme"
                  className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all duration-200"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                  </svg>
                  Theme Editor
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-all duration-200"
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
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Choose Experience Phase
          </h2>
          <div className="flex space-x-3 bg-gray-100 rounded-lg p-2">
            <button
              onClick={() => setSelectedPhase('before')}
              className={`group flex-1 px-6 py-4 text-sm font-semibold rounded-lg transition-all duration-200 ${
                selectedPhase === 'before'
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-300'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <div className="text-left">
                  <div className="font-bold">Before Phase</div>
                  <div className="text-xs opacity-80">Storytelling Content</div>
                </div>
              </div>
            </button>
            <button
              onClick={() => setSelectedPhase('event')}
              className={`group flex-1 px-6 py-4 text-sm font-semibold rounded-lg transition-all duration-200 ${
                selectedPhase === 'event'
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-300'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <div className="text-left">
                  <div className="font-bold">Event Phase</div>
                  <div className="text-xs opacity-80">Live Features</div>
                </div>
              </div>
            </button>
            <button
              onClick={() => setSelectedPhase('after')}
              className={`group flex-1 px-6 py-4 text-sm font-semibold rounded-lg transition-all duration-200 ${
                selectedPhase === 'after'
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-300'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <div className="text-left">
                  <div className="font-bold">After Phase</div>
                  <div className="text-xs opacity-80">Post-Event</div>
                </div>
              </div>
            </button>
            <button
              onClick={() => setSelectedPhase('media')}
              className={`group flex-1 px-6 py-4 text-sm font-semibold rounded-lg transition-all duration-200 ${
                selectedPhase === 'media'
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-300'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div className="text-left">
                  <div className="font-bold">Media Library</div>
                  <div className="text-xs opacity-80">Assets & Files</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Quick Action Cards - CMS Tools */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button onClick={() => setShowSearch(!showSearch)}>
            <Card className={`hover:shadow-md transition-shadow cursor-pointer h-full ${showSearch ? 'ring-2 ring-blue-500' : ''}`}>
              <CardContent className="p-6 text-center">
                <div className="text-3xl mb-2">🔍</div>
                <h3 className="text-gray-900 text-lg font-semibold mb-2">Advanced Search</h3>
                <p className="text-gray-600 text-sm">Search and filter all content</p>
              </CardContent>
            </Card>
          </button>
          
          <Link href="/admin/cms/custom-buttons">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6 text-center">
                <div className="text-3xl mb-2">🎯</div>
                <h3 className="text-gray-900 text-lg font-semibold mb-2">Custom Buttons Manager</h3>
                <p className="text-gray-600 text-sm">Configure interactive buttons across all content</p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/admin/cms/scheduler">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6 text-center">
                <div className="text-3xl mb-2">⏰</div>
                <h3 className="text-gray-900 text-lg font-semibold mb-2">Content Scheduler</h3>
                <p className="text-gray-600 text-sm">Manage time-based content availability</p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/admin/cms/after-experience">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6 text-center">
                <div className="text-3xl mb-2">🎭</div>
                <h3 className="text-gray-900 text-lg font-semibold mb-2">After Experience</h3>
                <p className="text-gray-600 text-sm">Configure post-event content and features</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Advanced Search Section */}
        {showSearch && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Advanced Content Search</span>
                </div>
                <button
                  onClick={() => setShowSearch(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AdvancedSearch 
                onResultClick={(result) => {
                  console.log('Search result clicked:', result);
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* Sample Data Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span>Sample Event Data Generator</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-6">
              Populate the app with comprehensive sample data showcasing all features across the three phases.
            </p>
            <div className="bg-gray-100 rounded-lg p-4 text-center">
              <p className="text-gray-600 text-sm">Sample data controls will be available here</p>
            </div>
          </CardContent>
        </Card>

        {/* Before Phase Content */}
        {selectedPhase === 'before' && (
          <>
            {/* Chapter Navigation */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Storytelling Chapters
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button 
                      onClick={() => setShowChapterReorder(!showChapterReorder)}
                      variant="secondary"
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700"
                    >
                      {showChapterReorder ? 'Hide Reorder' : 'Reorder Chapters'}
                    </Button>
                    <Button 
                      onClick={() => setShowAddChapterModal(true)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      + Add Chapter
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
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
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 capitalize ${
                          selectedChapter === chapterId
                            ? 'bg-blue-100 text-blue-900 border border-blue-300'
                            : 'bg-gray-100 text-gray-700 hover:text-gray-900 hover:bg-gray-200 border border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {chapterId.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chapter Overview */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-bold">
                    {`${selectedChapter.replace('-', ' ').toUpperCase()} Chapter`}
                  </CardTitle>
                  <div className="flex items-center space-x-4">
                    <div className="text-gray-700 text-sm bg-gray-100 px-4 py-2 rounded-lg">
                      {currentApiChapter?.cardCount || currentChapterCards.length} Cards
                    </div>
                    {currentApiChapter?.subChapterCount !== undefined && (
                      <div className="text-gray-700 text-sm bg-purple-100 px-4 py-2 rounded-lg">
                        {currentApiChapter.subChapterCount} Sub-Chapters
                      </div>
                    )}
                    <Button 
                      onClick={() => currentApiChapter && toggleSubChapters(currentApiChapter.id)}
                      variant="secondary"
                      className="bg-purple-100 hover:bg-purple-200 text-purple-700"
                      disabled={loadingSubChapters}
                    >
                      {loadingSubChapters ? 'Loading...' : 
                        (chapterSubChapters[currentApiChapter?.id || ''] ? 'Hide Sub-Chapters' : 'Show Sub-Chapters')}
                    </Button>
                    <Button 
                      onClick={() => window.location.href = `/admin/cms/edit/${selectedChapter}/new`}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      + Add Card
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentChapterCards.map((card: any, index: number) => (
                    <div 
                      key={index} 
                      className="group bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all duration-300"
                      onClick={() => window.location.href = `/admin/cms/edit/${selectedChapter}/${index}`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-sm text-gray-500 font-medium">Card {index + 1}</div>
                        <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </div>
                      
                      {card.text?.title && (
                        <div className="font-bold text-lg mb-2 text-gray-900 group-hover:text-blue-900 transition-colors">
                          {card.text.title}
                        </div>
                      )}
                      
                      {card.text?.subtitle && (
                        <div className="font-medium mb-3 text-gray-700">
                          {card.text.subtitle}
                        </div>
                      )}
                      
                      {card.text?.description && (
                        <div className="text-sm text-gray-600 mb-4 line-clamp-3">
                          {card.text.description}
                        </div>
                      )}
                      
                      <div className="flex flex-wrap gap-2">
                        {card.video?.url && (
                          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            📺 Video
                          </div>
                        )}
                        {card.image?.url && (
                          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            🖼️ Image
                          </div>
                        )}
                        {card.customButtons && card.customButtons.length > 0 && (
                          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            🎯 {card.customButtons.length} Button{card.customButtons.length > 1 ? 's' : ''}
                          </div>
                        )}
                        {card.ar?.locations && card.ar.locations.length > 0 && (
                          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            🌐 AR
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Sub-Chapters Section */}
                {currentApiChapter && chapterSubChapters[currentApiChapter.id] && (
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        Sub-Chapters ({chapterSubChapters[currentApiChapter.id].length})
                      </h3>
                      <Button 
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        + Add Sub-Chapter
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {chapterSubChapters[currentApiChapter.id].map((subChapter: any, index: number) => (
                        <div 
                          key={subChapter.id} 
                          className="group bg-purple-50 border border-purple-200 rounded-lg p-4 cursor-pointer hover:border-purple-300 hover:shadow-md transition-all duration-300"
                          onClick={() => window.location.href = `/before/story/${currentApiChapter.id}/${subChapter.id}`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-xs text-purple-600 font-medium uppercase tracking-wide">
                              Sub-Chapter {subChapter.order || index + 1}
                            </div>
                            <div className="flex items-center space-x-2">
                              {subChapter.customButtons && subChapter.customButtons.length > 0 && (
                                <div className="text-xs text-purple-500 bg-purple-100 px-2 py-1 rounded">
                                  {subChapter.customButtons.length} buttons
                                </div>
                              )}
                              <svg className="w-4 h-4 text-purple-400 group-hover:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M7 7l10 10M17 7l-10 10" />
                              </svg>
                            </div>
                          </div>
                          
                          <div className="font-bold text-base mb-2 text-purple-900 group-hover:text-purple-700 transition-colors">
                            {subChapter.title}
                          </div>
                          
                          {subChapter.summary && (
                            <div className="text-sm text-purple-700 mb-3 line-clamp-2">
                              {subChapter.summary}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between text-xs text-purple-600">
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
              </CardContent>
            </Card>
          </>
        )}

        {/* Event Phase Placeholder */}
        {selectedPhase === 'event' && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">🚀</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Event Phase Management</h3>
              <p className="text-gray-600 mb-6">Live event features and real-time interactions will be configured here.</p>
              <p className="text-sm text-gray-500">Coming soon...</p>
            </CardContent>
          </Card>
        )}

        {/* After Phase Placeholder */}
        {selectedPhase === 'after' && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">After Phase Management</h3>
              <p className="text-gray-600 mb-6">Post-event experiences and community features will be configured here.</p>
              <p className="text-sm text-gray-500">Coming soon...</p>
            </CardContent>
          </Card>
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
    </div>
  );
}