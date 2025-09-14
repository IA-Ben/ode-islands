'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import odeIslandsData from '@/app/data/ode-islands.json';
import ImmersivePageLayout, { ImmersiveTheme } from './ImmersivePageLayout';
import ScoreProgressPanel from './ScoreProgressPanel';
import Leaderboard from './Leaderboard';
import ScoreBadge from './ScoreBadge';
import AnimateText from './AnimateText';

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

interface TabTheme {
  background: string;
  overlay: string;
  title: string;
  subtitle: string;
  description: string;
}

export default function ProgressDashboard({ className = '' }: ProgressDashboardProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<UserProgress[]>([]);
  const [chapterProgress, setChapterProgress] = useState<ChapterProgress[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState<'progress' | 'fan-score' | 'leaderboard'>('progress');
  const [animateIn, setAnimateIn] = useState(false);
  
  // Tab-specific themes
  const tabThemes: Record<string, TabTheme> = {
    progress: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      overlay: 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.1))',
      title: '#ffffff',
      subtitle: '#e2e8f0',
      description: '#cbd5e0'
    },
    'fan-score': {
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      overlay: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.1))',
      title: '#ffffff',
      subtitle: '#fde8e8',
      description: '#fcd1d1'
    },
    leaderboard: {
      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      overlay: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.1))',
      title: '#ffffff',
      subtitle: '#e0f7ff',
      description: '#bfefff'
    }
  };
  
  const currentTheme: ImmersiveTheme = {
    ...tabThemes[activeTab],
    shadow: true
  };

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
    // Trigger animation after mount
    const timer = setTimeout(() => setAnimateIn(true), 200);
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    // Re-trigger animation when tab changes
    setAnimateIn(false);
    const timer = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(timer);
  }, [activeTab]);


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
      <ImmersivePageLayout
        title="Journey Awaits"
        subtitle="Authentication Required"
        description="Please sign in to view your progress and continue your epic journey through The Ode Islands."
        theme={{
          background: 'linear-gradient(135deg, #434343 0%, #000000 100%)',
          overlay: 'linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.3))',
          title: '#ffffff',
          subtitle: '#e2e8f0',
          description: '#cbd5e0',
          shadow: true
        }}
        animateIn={true}
        className={className}
      >
        <div className="max-w-md mx-auto">
          <div 
            className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 text-center"
            style={{
              opacity: 0,
              animation: 'animButtonIn 0.8s 1.5s ease forwards'
            }}
          >
            <div className="mb-6">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Ready to Begin?</h3>
              <p className="text-white/80 mb-8 leading-relaxed">Your personalized progress dashboard awaits. Sign in to unlock your journey metrics, achievements, and continue where you left off.</p>
            </div>
            
            <button
              onClick={handleLoginRedirect}
              className="group relative overflow-hidden bg-white/20 hover:bg-white/30 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl backdrop-blur-sm border border-white/30 w-full"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center justify-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span>Sign In to Continue</span>
              </div>
            </button>
          </div>
        </div>
      </ImmersivePageLayout>
    );
  }

  if (isLoading) {
    return (
      <ImmersivePageLayout
        title="Loading Journey"
        subtitle="Preparing Your Dashboard"
        description="Gathering your progress data and achievements from across The Ode Islands..."
        theme={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          overlay: 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.2))',
          title: '#ffffff',
          subtitle: '#e2e8f0',
          description: '#cbd5e0',
          shadow: true
        }}
        animateIn={true}
        className={className}
      >
        <div className="flex flex-col items-center justify-center space-y-8">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-white/60 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <div className="text-center">
            <div className="text-white/80 text-lg font-medium mb-2">Analyzing your journey...</div>
            <div className="flex items-center justify-center space-x-2 text-white/60 text-sm">
              <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      </ImmersivePageLayout>
    );
  }

  if (error) {
    return (
      <ImmersivePageLayout
        title="Journey Interrupted"
        subtitle="Connection Issue"
        description="We encountered an issue while loading your progress data. Don't worry, your journey is safe."
        theme={{
          background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
          overlay: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.2))',
          title: '#ffffff',
          subtitle: '#fdeaea',
          description: '#fadbd8',
          shadow: true
        }}
        animateIn={true}
        className={className}
      >
        <div className="max-w-md mx-auto">
          <div 
            className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 text-center"
            style={{
              opacity: 0,
              animation: 'animButtonIn 0.8s 1.5s ease forwards'
            }}
          >
            <div className="mb-6">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Oops! Something went wrong</h3>
              <p className="text-white/80 mb-4 leading-relaxed">{error}</p>
              <p className="text-white/60 text-sm mb-8">Your progress is safely stored. Let's try loading it again.</p>
            </div>
            
            <button
              onClick={fetchUserProgress}
              className="group relative overflow-hidden bg-white/20 hover:bg-white/30 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl backdrop-blur-sm border border-white/30 w-full"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center justify-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Try Again</span>
              </div>
            </button>
          </div>
        </div>
      </ImmersivePageLayout>
    );
  }

  const overallProgress = chapterProgress.length > 0 
    ? Math.round(chapterProgress.reduce((sum, chapter) => sum + chapter.completionPercentage, 0) / chapterProgress.length)
    : 0;

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'progress': return 'Journey Progress';
      case 'fan-score': return 'Achievement Hub';
      case 'leaderboard': return 'Community Rankings';
      default: return 'Dashboard';
    }
  };

  const getTabSubtitle = (tab: string) => {
    switch (tab) {
      case 'progress': return 'Track Your Adventure';
      case 'fan-score': return 'Celebrate Your Success';
      case 'leaderboard': return 'See How You Rank';
      default: return 'Your Dashboard';
    }
  };

  const getTabDescription = (tab: string) => {
    switch (tab) {
      case 'progress': return `Explore your journey through The Ode Islands. ${overallProgress}% complete with ${chapterProgress.reduce((sum, c) => sum + c.completedCards, 0)} cards mastered.`;
      case 'fan-score': return 'Dive deep into your achievements, scores, and recent activities. Every interaction counts towards your legacy.';
      case 'leaderboard': return 'See how your achievements stack up against fellow adventurers. Climb the ranks and earn your place among the legends.';
      default: return 'Your personalized dashboard experience.';
    }
  };

  return (
    <ImmersivePageLayout
      title={getTabTitle(activeTab)}
      subtitle={getTabSubtitle(activeTab)}
      description={getTabDescription(activeTab)}
      theme={currentTheme}
      animateIn={animateIn}
      className={className}
      showHeader={true}
      headerContent={
        <div className="flex items-center justify-between w-full">
          <div className="text-left">
            <div className="text-white/80 text-sm font-medium mb-1">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
            <div className="text-white/60 text-xs">
              Personal Progress Dashboard
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <ScoreBadge 
              showLevel={true}
              showPosition={true}
              compact={true}
            />
          </div>
        </div>
      }
    >

      <div className="space-y-8">
        {/* Immersive Tab Navigation */}
        <div 
          className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/20 p-2"
          style={{
            opacity: 0,
            animation: animateIn ? 'animButtonIn 0.8s 1.2s ease forwards' : 'none'
          }}
        >
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('progress')}
              className={`group flex-1 px-6 py-4 text-base font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] ${
                activeTab === 'progress'
                  ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/30'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-center space-x-3">
                <span className="text-2xl">🎯</span>
                <span>Progress</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('fan-score')}
              className={`group flex-1 px-6 py-4 text-base font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] ${
                activeTab === 'fan-score'
                  ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/30'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-center space-x-3">
                <span className="text-2xl">🏆</span>
                <span>Achievements</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`group flex-1 px-6 py-4 text-base font-semibold rounded-xl transition-all duration-300 transform hover:scale-[1.02] ${
                activeTab === 'leaderboard'
                  ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/30'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-center space-x-3">
                <span className="text-2xl">🌅</span>
                <span>Rankings</span>
              </div>
            </button>
          </div>
        </div>

        {/* Progress Tab Content */}
        {activeTab === 'progress' && (
          <div className="space-y-8">
            {/* Overall Progress Hero */}
            <div 
              className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8"
              style={{
                opacity: 0,
                animation: animateIn ? 'animButtonIn 0.8s 1.5s ease forwards' : 'none'
              }}
            >
              <div className="text-center mb-8">
                <h3 className="text-3xl font-bold text-white mb-4">
                  <AnimateText active={animateIn} delay={1800}>
                    🌍 Overall Journey Progress
                  </AnimateText>
                </h3>
                <div className="flex items-center justify-center space-x-8 mb-6">
                  <div className="text-center">
                    <div className="text-6xl font-bold text-white mb-2">{overallProgress}%</div>
                    <div className="text-white/70">Complete</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-white mb-2">{chapterProgress.filter(c => c.completionPercentage === 100).length}</div>
                    <div className="text-white/70">Chapters Done</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-white mb-2">{chapterProgress.reduce((sum, c) => sum + c.completedCards, 0)}</div>
                    <div className="text-white/70">Cards Mastered</div>
                  </div>
                </div>
              </div>
              
              {/* Enhanced Progress Bar */}
              <div className="relative">
                <div className="w-full bg-white/10 rounded-full h-4 mb-4 overflow-hidden">
                  <div
                    className="h-4 rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500"
                    style={{ 
                      width: animateIn ? `${overallProgress}%` : '0%',
                      transitionDelay: '2s'
                    }}
                  />
                </div>
                <div className="flex justify-between text-sm text-white/60">
                  <span>🎆 {chapterProgress.filter(c => c.completionPercentage === 100).length} chapters completed</span>
                  <span>✨ {chapterProgress.reduce((sum, c) => sum + c.completedCards, 0)} cards mastered</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fan Score Tab Content */}
        {activeTab === 'fan-score' && (
          <div 
            className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8"
            style={{
              opacity: 0,
              animation: animateIn ? 'animButtonIn 0.8s 1.5s ease forwards' : 'none'
            }}
          >
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold text-white mb-4">
                <AnimateText active={animateIn} delay={1800}>
                  🏆 Your Achievement Legacy
                </AnimateText>
              </h3>
            </div>
            <ScoreProgressPanel 
              scopeType="global"
              scopeId="global"
              showAllScopes={true}
              showRecentActivities={true}
              showAchievements={true}
              showStatistics={true}
              className="transform transition-all duration-300 hover:scale-[1.01]"
            />
          </div>
        )}

        {/* Leaderboard Tab Content */}
        {activeTab === 'leaderboard' && (
          <div 
            className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8"
            style={{
              opacity: 0,
              animation: animateIn ? 'animButtonIn 0.8s 1.5s ease forwards' : 'none'
            }}
          >
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold text-white mb-4">
                <AnimateText active={animateIn} delay={1800}>
                  🌅 Hall of Legends
                </AnimateText>
              </h3>
            </div>
            <Leaderboard 
              scopeType="global"
              scopeId="global"
              includeUserPosition={true}
              limit={50}
              className="transform transition-all duration-300 hover:scale-[1.01]"
            />
          </div>
        )}

        {/* Chapter Progress Grid - only show on progress tab */}
        {activeTab === 'progress' && (
          <div 
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
            style={{
              opacity: 0,
              animation: animateIn ? 'animButtonIn 0.8s 1.8s ease forwards' : 'none'
            }}
          >
            {chapterProgress.map((chapter, index) => {
              const chapterInfo = availableChapters.find(c => c.id === chapter.chapterId);
              const status = getProgressStatus(chapter.completionPercentage);
              
              return (
                <div
                  key={chapter.chapterId}
                  className="group bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:bg-white/15 hover:border-white/30 hover:shadow-xl"
                  onClick={() => handleChapterClick(chapter.chapterId, chapter.completionPercentage === 100)}
                  style={{
                    opacity: 0,
                    animation: animateIn ? `animButtonIn 0.6s ${2.1 + index * 0.1}s ease forwards` : 'none'
                  }}
                >
                  {/* Chapter Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white group-hover:text-blue-200 transition-colors mb-2">
                        {chapterInfo?.title || chapter.chapterId}
                      </h3>
                      <p className="text-white/70 text-sm mb-3">
                        {chapter.completedCards} of {chapter.totalCards} cards completed
                      </p>
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium" style={{ 
                        backgroundColor: `${status.color}30`, 
                        color: status.color,
                        border: `1px solid ${status.color}40`
                      }}>
                        {status.text}
                      </div>
                    </div>
                    
                    <div className="text-right ml-4">
                      <div className="text-3xl font-bold text-white mb-1">
                        {chapter.completionPercentage}%
                      </div>
                      <div className="text-white/60 text-xs">
                        {chapter.completionPercentage === 100 ? '✨ Complete' : '🚀 In Progress'}
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Progress Bar */}
                  <div className="mb-6">
                    <div className="w-full bg-white/10 rounded-full h-3 mb-2 overflow-hidden">
                      <div
                        className="h-3 rounded-full transition-all duration-700 ease-out"
                        style={{ 
                          width: animateIn ? `${chapter.completionPercentage}%` : '0%',
                          backgroundColor: status.color,
                          transitionDelay: `${2.3 + index * 0.1}s`
                        }}
                      />
                    </div>
                    <div className="text-xs text-white/60">
                      Progress: {chapter.completedCards}/{chapter.totalCards} cards
                    </div>
                  </div>

                  {/* Chapter Stats */}
                  <div className="space-y-3 text-sm mb-6">
                    {chapter.totalTimeSpent > 0 && (
                      <div className="flex items-center justify-between text-white/70">
                        <span className="flex items-center">
                          <span className="mr-2">⏱️</span>
                          Time spent:
                        </span>
                        <span className="font-medium">{formatTime(chapter.totalTimeSpent)}</span>
                      </div>
                    )}
                    
                    {chapter.lastAccessed && (
                      <div className="flex items-center justify-between text-white/70">
                        <span className="flex items-center">
                          <span className="mr-2">📅</span>
                          Last visited:
                        </span>
                        <span className="font-medium">{formatDate(chapter.lastAccessed)}</span>
                      </div>
                    )}
                    
                    {chapter.completedAt && chapter.completionPercentage === 100 && (
                      <div className="flex items-center justify-between text-white/70">
                        <span className="flex items-center">
                          <span className="mr-2">🎉</span>
                          Completed:
                        </span>
                        <span className="font-medium">{formatDate(chapter.completedAt)}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Indicator */}
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between text-white/80 group-hover:text-white transition-colors">
                      <span className="font-medium">
                        {chapter.completionPercentage === 100 ? '🔄 Review Chapter' : '🎯 Continue Journey'}
                      </span>
                      <div className="flex items-center space-x-1 transform group-hover:translate-x-1 transition-transform">
                        <span className="text-sm">Explore</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State - only show on progress tab */}
        {activeTab === 'progress' && chapterProgress.length === 0 && (
          <div 
            className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-12 text-center"
            style={{
              opacity: 0,
              animation: animateIn ? 'animButtonIn 0.8s 1.8s ease forwards' : 'none'
            }}
          >
            <div className="mb-8">
              <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">🌟 Begin Your Epic Journey</h3>
              <p className="text-white/80 text-lg leading-relaxed mb-8 max-w-md mx-auto">
                The Ode Islands await your discovery. Start your adventure and watch your progress unfold across these mystical lands.
              </p>
            </div>
            
            <button
              onClick={() => router.push('/before/chapter-1')}
              className="group relative overflow-hidden bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center space-x-3">
                <span className="text-xl">🚀</span>
                <span>Start Chapter 1</span>
                <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </button>
          </div>
        )}
      </div>
    </ImmersivePageLayout>
  );
}