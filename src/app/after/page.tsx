"use client";

import { useState, useEffect } from "react";
import PhaseNavigation from "@/components/PhaseNavigation";
import EventMemoriesGallery from "@/components/EventMemoriesGallery";
import CertificateManager from "@/components/CertificateManager";
import MemoryWallet from "@/components/MemoryWallet";
import ScoreProgressPanel from "@/components/ScoreProgressPanel";
import Leaderboard from "@/components/Leaderboard";
import ScoreBadge from "@/components/ScoreBadge";
import ImmersivePageLayout, { ImmersiveTheme } from '@/components/ImmersivePageLayout';
import AnimateText from '@/components/AnimateText';
import { useTheme } from '@/contexts/ThemeContext';

interface TabTheme {
  background: string;
  overlay: string;
  title: string;
  subtitle: string;
  description: string;
  shadow?: boolean;
}

export default function AfterPage() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'overview' | 'memories' | 'memory-wallet' | 'insights' | 'certificates' | 'fan-score'>('overview');
  const [animateIn, setAnimateIn] = useState(false);
  
  // Tab-specific immersive themes
  const tabThemes: Record<string, TabTheme> = {
    overview: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      overlay: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.1))',
      title: '#ffffff',
      subtitle: '#e2e8f0',
      description: '#cbd5e0',
      shadow: true
    },
    memories: {
      background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      overlay: 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.2))',
      title: '#ffffff',
      subtitle: '#fef7f0',
      description: '#fed7aa',
      shadow: true
    },
    'memory-wallet': {
      background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      overlay: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.1))',
      title: '#ffffff',
      subtitle: '#f0fdfa',
      description: '#ccfbf1',
      shadow: true
    },
    certificates: {
      background: 'linear-gradient(135deg, #d299c2 0%, #fef9d3 100%)',
      overlay: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.1))',
      title: '#ffffff',
      subtitle: '#fdf4ff',
      description: '#f3e8ff',
      shadow: true
    },
    'fan-score': {
      background: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
      overlay: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.1))',
      title: '#ffffff',
      subtitle: '#dbeafe',
      description: '#bfdbfe',
      shadow: true
    },
    insights: {
      background: 'linear-gradient(135deg, #fdbb2d 0%, #22c1c3 100%)',
      overlay: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.1))',
      title: '#ffffff',
      subtitle: '#fef3c7',
      description: '#fde68a',
      shadow: true
    }
  };
  
  const currentTheme: ImmersiveTheme = tabThemes[activeTab] || tabThemes.overview;
  
  useEffect(() => {
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

  const renderContent = () => {
    switch (activeTab) {
      case 'memories':
        return (
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
                  📸 Event Memories Gallery
                </AnimateText>
              </h3>
              <p className="text-white/80 text-lg">Your captured moments from the journey</p>
            </div>
            <EventMemoriesGallery 
              showUploadButton={true}
              showPrivateMemories={false}
              className="w-full transform transition-all duration-300 hover:scale-[1.01]"
            />
          </div>
        );
      
      case 'memory-wallet':
        return (
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
                  🎒 Your Memory Collection
                </AnimateText>
              </h3>
              <p className="text-white/80 text-lg">Personal memories from cards, chapters, and events</p>
            </div>
            <MemoryWallet 
              showHeader={false}
              className="w-full transform transition-all duration-300 hover:scale-[1.01]"
            />
          </div>
        );
      
      case 'certificates':
        return (
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
                  🏆 Achievement Certificates
                </AnimateText>
              </h3>
              <p className="text-white/80 text-lg">Download and share your accomplishment certificates</p>
            </div>
            <CertificateManager 
              className="w-full transform transition-all duration-300 hover:scale-[1.01]"
              showEligibility={true}
              autoIssue={true}
            />
          </div>
        );
      
      case 'fan-score':
        return (
          <div className="space-y-8">
            {/* Achievement Overview Hero */}
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
                <p className="text-white/80 text-lg mb-8">Celebrate your accomplishments and see how you rank in the community</p>
                
                <div className="flex justify-center mb-6">
                  <ScoreBadge 
                    showLevel={true}
                    showPosition={true}
                    compact={false}
                    className="transform transition-all duration-300 hover:scale-105"
                  />
                </div>
              </div>
            </div>
            
            {/* Achievement Panels */}
            <div 
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
              style={{
                opacity: 0,
                animation: animateIn ? 'animButtonIn 0.8s 1.8s ease forwards' : 'none'
              }}
            >
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <h4 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <span className="mr-3 text-3xl">📈</span>
                  Your Score Progress
                </h4>
                <ScoreProgressPanel 
                  scopeType="global"
                  scopeId="global"
                  showAllScopes={false}
                  showRecentActivities={true}
                  showAchievements={true}
                  showStatistics={true}
                  className="w-full"
                />
              </div>
              
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-6">
                <h4 className="text-2xl font-bold text-white mb-6 flex items-center">
                  <span className="mr-3 text-3xl">🥇</span>
                  Community Rankings
                </h4>
                <Leaderboard 
                  scopeType="global"
                  scopeId="global"
                  includeUserPosition={true}
                  limit={20}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        );
      
      case 'insights':
        return (
          <div 
            className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8"
            style={{
              opacity: 0,
              animation: animateIn ? 'animButtonIn 0.8s 1.5s ease forwards' : 'none'
            }}
          >
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-white mb-4">
                <AnimateText active={animateIn} delay={1800}>
                  🔍 Journey Insights
                </AnimateText>
              </h3>
              <p className="text-white/80 text-lg mb-8">Discover the deeper meaning of your adventure</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div 
                className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-8 text-center transform transition-all duration-300 hover:scale-105"
                style={{
                  opacity: 0,
                  animation: animateIn ? 'animButtonIn 0.6s 2.1s ease forwards' : 'none'
                }}
              >
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl">🧭</span>
                </div>
                <h4 className="text-2xl font-bold text-white mb-4">Personal Reflection</h4>
                <p className="text-white/70 leading-relaxed">
                  Explore your journey through personalized insights and progress analytics. Understand your growth patterns and learning milestones.
                </p>
              </div>
              
              <div 
                className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-8 text-center transform transition-all duration-300 hover:scale-105"
                style={{
                  opacity: 0,
                  animation: animateIn ? 'animButtonIn 0.6s 2.2s ease forwards' : 'none'
                }}
              >
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl">🌟</span>
                </div>
                <h4 className="text-2xl font-bold text-white mb-4">Community Impact</h4>
                <p className="text-white/70 leading-relaxed">
                  See how your participation contributed to the collective experience. Your journey inspired others and shaped the community.
                </p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 max-w-md mx-auto">
                <div className="text-white/60 mb-2">🚧</div>
                <p className="text-white/60 text-sm">Detailed analytics dashboard coming soon</p>
              </div>
            </div>
          </div>
        );
      default: // overview
        return (
          <div className="space-y-12">
            {/* Welcome Hero Section */}
            <div 
              className="text-center"
              style={{
                opacity: 0,
                animation: animateIn ? 'animButtonIn 0.8s 1.2s ease forwards' : 'none'
              }}
            >
              {/* Phase Badge */}
              <div 
                className="inline-flex items-center px-6 py-3 rounded-full text-lg font-bold mb-8 bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg"
                style={{
                  opacity: 0,
                  animation: animateIn ? 'animButtonIn 0.6s 1.5s ease forwards' : 'none'
                }}
              >
                <span className="mr-2 text-2xl">🎯</span>
                <span className="text-white">After Phase Complete</span>
              </div>
              
              {/* Achievement Summary Hero */}
              <div 
                className="mb-12"
                style={{
                  opacity: 0,
                  animation: animateIn ? 'animButtonIn 0.8s 1.8s ease forwards' : 'none'
                }}
              >
                <div className="flex items-center justify-center mb-8">
                  <ScoreBadge 
                    compact={false}
                    showLevel={true}
                    showPosition={true}
                    onClick={() => setActiveTab('fan-score')}
                    className="transform hover:scale-110 transition-all duration-300 cursor-pointer shadow-2xl"
                  />
                </div>
                <button
                  onClick={() => setActiveTab('fan-score')}
                  className="group inline-flex items-center space-x-2 text-white/80 hover:text-white transition-all duration-300 text-lg font-medium bg-white/10 backdrop-blur-sm px-6 py-3 rounded-xl border border-white/20 hover:bg-white/20 hover:border-white/40"
                >
                  <span>🏆 View Complete Achievement Legacy</span>
                  <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Immersive Feature Grid */}
            <div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              style={{
                opacity: 0,
                animation: animateIn ? 'animButtonIn 0.8s 2.1s ease forwards' : 'none'
              }}
            >
              <button
                onClick={() => setActiveTab('certificates')}
                className="group bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 text-left transform transition-all duration-300 hover:scale-105 hover:bg-white/15 hover:border-white/30 hover:shadow-2xl"
                style={{
                  opacity: 0,
                  animation: animateIn ? 'animButtonIn 0.6s 2.3s ease forwards' : 'none'
                }}
              >
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-white/30 transition-colors">
                  <span className="text-3xl">📜</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-blue-200 transition-colors">
                  Achievement Certificates
                </h3>
                <p className="text-white/70 leading-relaxed">
                  Download and share official certificates recognizing your journey milestones and accomplishments.
                </p>
              </button>
              
              <button
                onClick={() => setActiveTab('memories')}
                className="group bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 text-left transform transition-all duration-300 hover:scale-105 hover:bg-white/15 hover:border-white/30 hover:shadow-2xl"
                style={{
                  opacity: 0,
                  animation: animateIn ? 'animButtonIn 0.6s 2.4s ease forwards' : 'none'
                }}
              >
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-white/30 transition-colors">
                  <span className="text-3xl">📸</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-blue-200 transition-colors">
                  Event Memories
                </h3>
                <p className="text-white/70 leading-relaxed">
                  Browse, share, and relive your favorite captured moments and experiences from the journey.
                </p>
              </button>
              
              <button
                onClick={() => setActiveTab('memory-wallet')}
                className="group bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 text-left transform transition-all duration-300 hover:scale-105 hover:bg-white/15 hover:border-white/30 hover:shadow-2xl"
                style={{
                  opacity: 0,
                  animation: animateIn ? 'animButtonIn 0.6s 2.5s ease forwards' : 'none'
                }}
              >
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-white/30 transition-colors">
                  <span className="text-3xl">🎒</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-blue-200 transition-colors">
                  Memory Collection
                </h3>
                <p className="text-white/70 leading-relaxed">
                  Your personal treasury of memories collected from cards, chapters, and special events.
                </p>
              </button>
              
              <button
                onClick={() => setActiveTab('insights')}
                className="group bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 text-left transform transition-all duration-300 hover:scale-105 hover:bg-white/15 hover:border-white/30 hover:shadow-2xl"
                style={{
                  opacity: 0,
                  animation: animateIn ? 'animButtonIn 0.6s 2.6s ease forwards' : 'none'
                }}
              >
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-white/30 transition-colors">
                  <span className="text-3xl">🔍</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-blue-200 transition-colors">
                  Journey Analytics
                </h3>
                <p className="text-white/70 leading-relaxed">
                  Discover deep insights about your progress, growth patterns, and community impact.
                </p>
              </button>
              
              <div 
                className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 text-center transform transition-all duration-300 hover:scale-105 hover:bg-white/15"
                style={{
                  opacity: 0,
                  animation: animateIn ? 'animButtonIn 0.6s 2.7s ease forwards' : 'none'
                }}
              >
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <span className="text-3xl">🚀</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  Continued Adventures
                </h3>
                <p className="text-white/70 leading-relaxed">
                  Extended content and new ways to continue exploring and learning.
                </p>
              </div>
              
              <div 
                className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 text-center transform transition-all duration-300 hover:scale-105 hover:bg-white/15"
                style={{
                  opacity: 0,
                  animation: animateIn ? 'animButtonIn 0.6s 2.8s ease forwards' : 'none'
                }}
              >
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <span className="text-3xl">🌐</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  Community Hub
                </h3>
                <p className="text-white/70 leading-relaxed">
                  Connect with fellow adventurers and build lasting relationships within the community.
                </p>
              </div>
            </div>
          </div>
        );
    }
  };

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'overview': return 'Journey Continues';
      case 'memories': return 'Event Memories';
      case 'memory-wallet': return 'Memory Collection';
      case 'certificates': return 'Your Certificates';
      case 'fan-score': return 'Achievement Legacy';
      case 'insights': return 'Journey Insights';
      default: return 'After Phase';
    }
  };

  const getTabSubtitle = (tab: string) => {
    switch (tab) {
      case 'overview': return 'Reflect, Share & Connect';
      case 'memories': return 'Captured Moments';
      case 'memory-wallet': return 'Personal Treasury';
      case 'certificates': return 'Achievement Recognition';
      case 'fan-score': return 'Celebrate Success';
      case 'insights': return 'Discover Your Impact';
      default: return 'Your Adventure Continues';
    }
  };

  const getTabDescription = (tab: string) => {
    switch (tab) {
      case 'overview': return 'Your Ode Islands experience doesn\'t end here. Explore your memories, share your journey, and stay connected with the community you\'ve built.';
      case 'memories': return 'Browse, share, and relive your favorite captured moments from your incredible journey through The Ode Islands.';
      case 'memory-wallet': return 'Your personal collection of memories from cards, chapters, and events - a treasury of experiences to treasure forever.';
      case 'certificates': return 'Download and share official certificates recognizing your achievements and milestones throughout your journey.';
      case 'fan-score': return 'Celebrate your accomplishments, view detailed progress analytics, and see how you rank among fellow adventurers.';
      case 'insights': return 'Discover deep insights about your learning journey, growth patterns, and the impact you\'ve made on the community.';
      default: return 'Continue exploring the rich experiences available in your post-journey dashboard.';
    }
  };

  return (
    <>
      <PhaseNavigation currentPhase="after" />
      
      <ImmersivePageLayout
        title={getTabTitle(activeTab)}
        subtitle={getTabSubtitle(activeTab)}
        description={getTabDescription(activeTab)}
        theme={currentTheme}
        animateIn={animateIn}
        showHeader={true}
        headerContent={
          <div className="flex items-center justify-between w-full">
            <div className="text-left">
              <div className="text-white/80 text-sm font-medium mb-1">
                🌟 Post-Journey Experience
              </div>
              <div className="text-white/60 text-xs">
                Your adventure legacy awaits
              </div>
            </div>
            {activeTab !== 'overview' && (
              <button
                onClick={() => setActiveTab('overview')}
                className="group flex items-center space-x-2 text-white/80 hover:text-white transition-all duration-300 text-sm font-medium bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20 hover:bg-white/20"
              >
                <svg className="w-4 h-4 transform group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Overview</span>
              </button>
            )}
          </div>
        }
      >
        {/* Tab Navigation */}
        {activeTab !== 'overview' && (
          <div 
            className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/20 p-2 mb-8"
            style={{
              opacity: 0,
              animation: animateIn ? 'animButtonIn 0.8s 1.2s ease forwards' : 'none'
            }}
          >
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTab('certificates')}
                className={`px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
                  activeTab === 'certificates'
                    ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/30'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                📜 Certificates
              </button>
              
              <button
                onClick={() => setActiveTab('memories')}
                className={`px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
                  activeTab === 'memories'
                    ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/30'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                📸 Memories
              </button>
              
              <button
                onClick={() => setActiveTab('memory-wallet')}
                className={`px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
                  activeTab === 'memory-wallet'
                    ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/30'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                🎒 Collection
              </button>
              
              <button
                onClick={() => setActiveTab('insights')}
                className={`px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
                  activeTab === 'insights'
                    ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/30'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                🔍 Insights
              </button>
              
              <button
                onClick={() => setActiveTab('fan-score')}
                className={`px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
                  activeTab === 'fan-score'
                    ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/30'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                🏆 Achievements
              </button>
            </div>
          </div>
        )}
        
        {/* Tab Content */}
        {renderContent()}
      </ImmersivePageLayout>
    </>
  );
}