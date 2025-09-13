'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import odeIslandsData from '@/app/data/ode-islands.json';

// TypeScript interfaces for progress tracking
interface UserProgress {
  id: string;
  userId: string;
  chapterId: string;
  cardIndex: number;
  completedAt: string;
  timeSpent: number | null;
  lastAccessed: string;
}

interface ChapterProgress {
  chapterId: string;
  totalCards: number;
  completedCards: number;
  completionPercentage: number;
  lastAccessed: string | null;
  completedAt: string | null;
  totalTimeSpent: number;
}

interface ProgressDashboardProps {
  className?: string;
}

export default function ProgressDashboard({ className = '' }: ProgressDashboardProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<UserProgress[]>([]);
  const [chapterProgress, setChapterProgress] = useState<ChapterProgress[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Chapter structure - dynamically loaded from actual data
  const availableChapters = Object.keys(odeIslandsData).map(chapterId => {
    const chapterCards = (odeIslandsData as any)[chapterId] || [];
    const chapterTitles: { [key: string]: string } = {
      'chapter-1': 'The Ode Islands',
      'chapter-2': 'The Ode Island',
      'chapter-3': 'Welcome to The Ode Islands',
      'chapter-playcanvas': 'PlayCanvas Experiences'
    };
    
    return {
      id: chapterId,
      title: chapterTitles[chapterId] || chapterId,
      totalCards: chapterCards.length
    };
  });

  useEffect(() => {
    fetchUserProgress();
  }, []);


  const fetchUserProgress = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/progress');
      
      if (!response.ok) {
        if (response.status === 401) {
          setIsAuthenticated(false);
          setIsLoading(false);
          return;
        }
        throw new Error(`Failed to fetch progress: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setIsAuthenticated(true);
        setProgressData(data.progress || []);
        calculateChapterProgress(data.progress || []);
      } else {
        setError(data.message || 'Failed to load progress data');
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error('Error fetching progress:', err);
      setError('Unable to load progress. Please try again.');
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateChapterProgress = (progress: UserProgress[]) => {
    const chapterMap = new Map<string, {
      completedCards: Set<number>;
      lastAccessed: string | null;
      completedAt: string | null;
      totalTimeSpent: number;
    }>();

    // Group progress by chapter
    progress.forEach((item) => {
      if (!chapterMap.has(item.chapterId)) {
        chapterMap.set(item.chapterId, {
          completedCards: new Set(),
          lastAccessed: null,
          completedAt: null,
          totalTimeSpent: 0,
        });
      }

      const chapterData = chapterMap.get(item.chapterId)!;
      chapterData.completedCards.add(item.cardIndex);
      chapterData.totalTimeSpent += item.timeSpent || 0;

      // Update timestamps
      if (!chapterData.lastAccessed || new Date(item.lastAccessed) > new Date(chapterData.lastAccessed)) {
        chapterData.lastAccessed = item.lastAccessed;
      }
      if (!chapterData.completedAt || new Date(item.completedAt) > new Date(chapterData.completedAt)) {
        chapterData.completedAt = item.completedAt;
      }
    });

    // Calculate progress for each available chapter
    const calculatedProgress: ChapterProgress[] = availableChapters.map((chapter) => {
      const chapterData = chapterMap.get(chapter.id);
      const completedCards = chapterData ? chapterData.completedCards.size : 0;
      const completionPercentage = Math.round((completedCards / chapter.totalCards) * 100);

      return {
        chapterId: chapter.id,
        totalCards: chapter.totalCards,
        completedCards,
        completionPercentage,
        lastAccessed: chapterData?.lastAccessed || null,
        completedAt: chapterData?.completedAt || null,
        totalTimeSpent: chapterData?.totalTimeSpent || 0,
      };
    });

    setChapterProgress(calculatedProgress);
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getProgressStatus = (percentage: number): { text: string; color: string } => {
    if (percentage === 100) return { text: 'Completed', color: '#10B981' }; // green-500
    if (percentage >= 75) return { text: 'Almost Done', color: '#F59E0B' }; // amber-500
    if (percentage >= 50) return { text: 'In Progress', color: '#3B82F6' }; // blue-500
    if (percentage > 0) return { text: 'Started', color: '#8B5CF6' }; // violet-500
    return { text: 'Not Started', color: '#6B7280' }; // gray-500
  };

  const handleChapterClick = (chapterId: string, isComplete: boolean) => {
    // Navigate to chapter - the before/[id] route handles card positioning internally
    router.push(`/before/${chapterId}`);
  };

  const handleLoginRedirect = () => {
    router.push('/auth/login');
  };

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen bg-black flex items-center justify-center p-6 ${className}`}>
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Progress Dashboard</h1>
            <p className="text-gray-400">Track your journey through The Ode Islands</p>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-8 border border-gray-800">
            <div className="mb-6">
              <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <h2 className="text-xl font-semibold text-white mb-2">Authentication Required</h2>
              <p className="text-gray-400 mb-6">Please log in to view your progress and continue your journey.</p>
            </div>
            
            <button
              onClick={handleLoginRedirect}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`min-h-screen bg-black flex items-center justify-center ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your progress...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen bg-black flex items-center justify-center p-6 ${className}`}>
        <div className="max-w-md w-full text-center">
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
            <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h2 className="text-xl font-semibold text-white mb-2">Error Loading Progress</h2>
            <p className="text-red-300 mb-4">{error}</p>
            <button
              onClick={fetchUserProgress}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const overallProgress = chapterProgress.length > 0 
    ? Math.round(chapterProgress.reduce((sum, chapter) => sum + chapter.completionPercentage, 0) / chapterProgress.length)
    : 0;

  return (
    <div className={`min-h-screen bg-black p-6 ${className}`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Your Journey Progress</h1>
          <p className="text-gray-400 text-lg">Track your adventure through The Ode Islands</p>
        </div>

        {/* Overall Progress */}
        <div className="bg-gray-900 rounded-lg p-6 mb-8 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-white">Overall Progress</h2>
            <span className="text-3xl font-bold" style={{ color: theme.colors.primary }}>
              {overallProgress}%
            </span>
          </div>
          
          <div className="w-full bg-gray-800 rounded-full h-3 mb-2">
            <div
              className="h-3 rounded-full transition-all duration-500 ease-out"
              style={{ 
                width: `${overallProgress}%`,
                backgroundColor: theme.colors.primary 
              }}
            />
          </div>
          
          <div className="flex justify-between text-sm text-gray-400">
            <span>{chapterProgress.filter(c => c.completionPercentage === 100).length} chapters completed</span>
            <span>{chapterProgress.reduce((sum, c) => sum + c.completedCards, 0)} cards completed</span>
          </div>
        </div>

        {/* Chapter Progress Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {chapterProgress.map((chapter) => {
            const chapterInfo = availableChapters.find(c => c.id === chapter.chapterId);
            const status = getProgressStatus(chapter.completionPercentage);
            
            return (
              <div
                key={chapter.chapterId}
                className="bg-gray-900 rounded-lg p-6 border border-gray-800 hover:border-gray-700 transition-colors cursor-pointer group"
                onClick={() => handleChapterClick(chapter.chapterId, chapter.completionPercentage === 100)}
              >
                {/* Chapter Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {chapterInfo?.title || chapter.chapterId}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {chapter.completedCards} of {chapter.totalCards} completed
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xl font-bold text-white">
                      {chapter.completionPercentage}%
                    </div>
                    <div className="text-xs px-2 py-1 rounded-full" style={{ 
                      backgroundColor: `${status.color}20`, 
                      color: status.color 
                    }}>
                      {status.text}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-800 rounded-full h-2 mb-4">
                  <div
                    className="h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ 
                      width: `${chapter.completionPercentage}%`,
                      backgroundColor: status.color 
                    }}
                  />
                </div>

                {/* Chapter Stats */}
                <div className="space-y-2 text-sm">
                  {chapter.totalTimeSpent > 0 && (
                    <div className="flex justify-between text-gray-400">
                      <span>Time spent:</span>
                      <span>{formatTime(chapter.totalTimeSpent)}</span>
                    </div>
                  )}
                  
                  {chapter.lastAccessed && (
                    <div className="flex justify-between text-gray-400">
                      <span>Last visited:</span>
                      <span>{formatDate(chapter.lastAccessed)}</span>
                    </div>
                  )}
                  
                  {chapter.completedAt && chapter.completionPercentage === 100 && (
                    <div className="flex justify-between text-gray-400">
                      <span>Completed:</span>
                      <span>{formatDate(chapter.completedAt)}</span>
                    </div>
                  )}
                </div>

                {/* Action Indicator */}
                <div className="mt-4 pt-4 border-t border-gray-800">
                  <div className="flex items-center text-sm text-gray-500 group-hover:text-blue-400 transition-colors">
                    <span>
                      {chapter.completionPercentage === 100 ? 'Review chapter' : 'Continue journey'}
                    </span>
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {chapterProgress.length === 0 && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h3 className="text-xl font-semibold text-white mb-2">Begin Your Journey</h3>
            <p className="text-gray-400 mb-6">Start exploring The Ode Islands to track your progress</p>
            <button
              onClick={() => router.push('/before/chapter-1')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              Start Chapter 1
            </button>
          </div>
        )}
      </div>
    </div>
  );
}