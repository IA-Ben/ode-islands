'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/hooks/useAuth';
import odeIslandsData from '@/app/data/ode-islands.json';
import ImmersivePageLayout, { ImmersiveTheme } from './ImmersivePageLayout';
import AnimateText from './AnimateText';
import CertificateManager from './CertificateManager';
import MemoryWallet from './MemoryWallet';
import ScoreBadge from './ScoreBadge';
import UserEngagementAnalytics from './analytics/UserEngagementAnalytics';
import OverviewDashboard from './analytics/OverviewDashboard';

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
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<UserProgress[]>([]);
  const [chapterProgress, setChapterProgress] = useState<ChapterProgress[]>([]);
  const [activeTab, setActiveTab] = useState<'certificates' | 'memories' | 'collection' | 'insights'>('collection');
  const [animateIn, setAnimateIn] = useState(false);

  // Redirect to Stack Auth sign-in if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      // Redirect to Stack Auth with return URL
      window.location.href = '/handler/sign-in?returnUrl=' + encodeURIComponent('/progress');
      return;
    }
  }, [isAuthenticated, authLoading]);
  
  // Professional treasury themes for each tab
  const tabThemes: Record<string, TabTheme> = {
    certificates: {
      background: 'linear-gradient(135deg, #7c2d12 0%, #9a3412 100%)',
      overlay: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.1))',
      title: '#ffffff',
      subtitle: '#fef7f0',
      description: '#fed7aa'
    },
    memories: {
      background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
      overlay: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.1))',
      title: '#ffffff',
      subtitle: '#eff6ff',
      description: '#dbeafe'
    },
    collection: {
      background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
      overlay: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.1))',
      title: '#ffffff',
      subtitle: '#ecfdf5',
      description: '#d1fae5'
    },
    insights: {
      background: 'linear-gradient(135deg, #7c2d12 0%, #a16207 100%)',
      overlay: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.1))',
      title: '#ffffff',
      subtitle: '#fefbf3',
      description: '#fde68a'
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
          // Redirect to login for authentication
          window.location.href = "/auth/login";
          return;
        }
        throw new Error(`Failed to fetch progress: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setProgressData(data.progress || []);
        calculateChapterProgress(data.progress || []);
      } else {
        setError(data.message || 'Failed to load progress data');
      }
    } catch (err) {
      console.error('Error fetching progress:', err);
      setError('Unable to load progress. Please try again.');
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
      const completionPercentage = chapter.totalCards > 0 ? Math.round((completedCards / chapter.totalCards) * 100) : 0;

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
    // Redirect to Stack Auth sign-in
    window.location.href = '/handler/sign-in?returnUrl=' + encodeURIComponent('/progress');
  };

  const handleBackToJourney = () => {
    // Navigate back to the last accessed chapter or default to first chapter
    const lastAccessedChapter = chapterProgress.find(ch => ch.lastAccessed)?.chapterId || 'chapter-1';
    router.push(`/before/${lastAccessedChapter}`);
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
      case 'certificates': return 'Certificates';
      case 'memories': return 'Memories';
      case 'collection': return 'Collection';
      case 'insights': return 'Insights';
      default: return 'Personal Treasury';
    }
  };

  const getTabSubtitle = (tab: string) => {
    switch (tab) {
      case 'certificates': return 'Achievement Certificates';
      case 'memories': return 'Memory Collection';
      case 'collection': return 'Journey Recap';
      case 'insights': return 'Personal Analytics';
      default: return 'Your Personal Treasury';
    }
  };

  const getTabDescription = (tab: string) => {
    switch (tab) {
      case 'certificates': return 'View and manage your earned certificates and achievements from your journey through The Ode Islands.';
      case 'memories': return 'Browse your collected memories, moments, and experiences captured during your adventure.';
      case 'collection': return `Your personal collection of memories from cards, chapters, and events - a treasury of experiences to treasure forever. ${overallProgress}% journey complete.`;
      case 'insights': return 'Analyze your engagement patterns, learning progress, and personal growth metrics throughout your journey.';
      default: return 'Your personalized treasury of achievements, memories, and insights.';
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
          <div className="flex items-center">
            {/* Clean Back to Journey Button */}
            <button
              onClick={handleBackToJourney}
              className="group flex items-center space-x-3 bg-white/10 hover:bg-white/15 backdrop-blur-sm rounded-lg px-6 py-3 transition-all duration-200 border border-white/20 hover:border-white/30"
              title="Return to your journey"
            >
              <svg className="w-4 h-4 text-white/80 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-white/90 text-sm font-medium group-hover:text-white">Back to Journey</span>
            </button>
          </div>

          <div className="text-center flex-1">
            <div className="text-white/90 text-base font-semibold">
              Personal Treasury
            </div>
            <div className="text-white/60 text-sm">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'short', 
                day: 'numeric' 
              })}
            </div>
          </div>

          <div className="flex items-center">
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
        {/* Clean Professional Tab Navigation */}
        <div 
          className="bg-white/8 backdrop-blur-sm rounded-lg border border-white/20 p-1"
          style={{
            opacity: 0,
            animation: animateIn ? 'animButtonIn 0.8s 1.2s ease forwards' : 'none'
          }}
        >
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('certificates')}
              className={`group flex-1 px-6 py-3 text-sm font-semibold rounded-md transition-all duration-200 ${
                activeTab === 'certificates'
                  ? 'bg-white/20 text-white shadow-sm backdrop-blur-sm border border-white/30'
                  : 'text-white/70 hover:text-white/90 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <span>Certificates</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('memories')}
              className={`group flex-1 px-6 py-3 text-sm font-semibold rounded-md transition-all duration-200 ${
                activeTab === 'memories'
                  ? 'bg-white/20 text-white shadow-sm backdrop-blur-sm border border-white/30'
                  : 'text-white/70 hover:text-white/90 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Memories</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('collection')}
              className={`group flex-1 px-6 py-3 text-sm font-semibold rounded-md transition-all duration-200 ${
                activeTab === 'collection'
                  ? 'bg-white/20 text-white shadow-sm backdrop-blur-sm border border-white/30'
                  : 'text-white/70 hover:text-white/90 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Collection</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`group flex-1 px-6 py-3 text-sm font-semibold rounded-md transition-all duration-200 ${
                activeTab === 'insights'
                  ? 'bg-white/20 text-white shadow-sm backdrop-blur-sm border border-white/30'
                  : 'text-white/70 hover:text-white/90 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Insights</span>
              </div>
            </button>
          </div>
        </div>

        {/* Collection Tab Content - Journey Recap */}
        {activeTab === 'collection' && (
          <div 
            className="space-y-6"
            style={{
              opacity: 0,
              animation: animateIn ? 'animButtonIn 0.8s 1.5s ease forwards' : 'none'
            }}
          >
            {/* Journey Recap Unavailable State */}
            <div className="bg-white/8 backdrop-blur-sm rounded-lg border border-white/20 p-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">Journey Recap Unavailable</h3>
                <p className="text-white/60 mb-6 max-w-md mx-auto">
                  We couldn't load your journey recap at the moment.
                </p>
                <button 
                  onClick={fetchUserProgress}
                  className="bg-white/20 hover:bg-white/30 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 border border-white/30 hover:border-white/50"
                >
                  Try Again
                </button>
              </div>
            </div>

            {/* After Phase Complete Badge */}
            <div className="flex justify-center">
              <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3 border border-white/20">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-white font-medium">After Phase Complete</span>
              </div>
            </div>

            {/* Score Display */}
            <div className="flex justify-center">
              <div className="flex items-center space-x-4 bg-white/5 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">⭐</span>
                  <span className="text-white font-medium">1</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl">🌟</span>
                  <span className="text-white font-medium">0</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Certificates Tab Content */}
        {activeTab === 'certificates' && (
          <div 
            className="space-y-6"
            style={{
              opacity: 0,
              animation: animateIn ? 'animButtonIn 0.8s 1.5s ease forwards' : 'none'
            }}
          >
            <CertificateManager 
              showEligibility={true}
              autoIssue={false}
              className="transform transition-all duration-200"
            />
          </div>
        )}

        {/* Memories Tab Content */}
        {activeTab === 'memories' && (
          <div 
            className="space-y-6"
            style={{
              opacity: 0,
              animation: animateIn ? 'animButtonIn 0.8s 1.5s ease forwards' : 'none'
            }}
          >
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-6">
                <AnimateText active={animateIn} delay={1800}>
                  Memory Collection
                </AnimateText>
              </h3>
              <p className="text-white/70 max-w-2xl mx-auto">
                Browse your collected memories, moments, and experiences captured during your adventure through The Ode Islands.
              </p>
            </div>
            
            <MemoryWallet 
              className="transform transition-all duration-200"
            />
          </div>
        )}

        {/* Insights Tab Content */}
        {activeTab === 'insights' && (
          <div 
            className="space-y-6"
            style={{
              opacity: 0,
              animation: animateIn ? 'animButtonIn 0.8s 1.5s ease forwards' : 'none'
            }}
          >
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-6">
                <AnimateText active={animateIn} delay={1800}>
                  Personal Analytics
                </AnimateText>
              </h3>
              <p className="text-white/70 max-w-2xl mx-auto">
                Analyze your engagement patterns, learning progress, and personal growth metrics throughout your journey.
              </p>
            </div>

            {/* Overview Analytics Dashboard */}
            <div className="bg-white/8 backdrop-blur-sm rounded-lg border border-white/20 p-6">
              <OverviewDashboard 
                dateRange={{
                  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                  endDate: new Date().toISOString()
                }}
                eventId="global"
                realTimeEnabled={false}
              />
            </div>

            {/* User Engagement Analytics */}
            <div className="bg-white/8 backdrop-blur-sm rounded-lg border border-white/20 p-6">
              <UserEngagementAnalytics 
                dateRange={{
                  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                  endDate: new Date().toISOString()
                }}
                eventId="global"
                realTimeEnabled={false}
              />
            </div>
          </div>
        )}

        {/* Journey Unavailable State - show when no progress data */}
        {chapterProgress.length === 0 && (
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