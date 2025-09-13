"use client";

import { useState } from "react";
import PhaseNavigation from "@/components/PhaseNavigation";
import EventMemoriesGallery from "@/components/EventMemoriesGallery";
import CertificateManager from "@/components/CertificateManager";
import MemoryWallet from "@/components/MemoryWallet";
import ScoreProgressPanel from "@/components/ScoreProgressPanel";
import Leaderboard from "@/components/Leaderboard";
import ScoreBadge from "@/components/ScoreBadge";
import { useTheme } from '@/contexts/ThemeContext';

export default function AfterPage() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'overview' | 'memories' | 'memory-wallet' | 'insights' | 'certificates' | 'fan-score'>('overview');

  const renderContent = () => {
    switch (activeTab) {
      case 'memories':
        return (
          <div className="container mx-auto px-6 py-8">
            <EventMemoriesGallery 
              showUploadButton={true}
              showPrivateMemories={false}
              className="w-full"
            />
          </div>
        );
      
      case 'memory-wallet':
        return (
          <div className="container mx-auto px-6 py-8">
            <MemoryWallet 
              showHeader={true}
              className="w-full"
            />
          </div>
        );
      
      case 'certificates':
        return (
          <div className="container mx-auto px-6 py-8">
            <CertificateManager 
              className="w-full"
              showEligibility={true}
              autoIssue={true}
            />
          </div>
        );
      
      case 'fan-score':
        return (
          <div className="container mx-auto px-6 py-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-8">
                <h2 
                  className="text-3xl font-bold mb-4"
                  style={{ color: theme.colors.secondary }}
                >
                  🏆 Your Achievement Journey
                </h2>
                <p className="text-white/60 text-lg">
                  Celebrate your accomplishments and see how you rank in the community
                </p>
              </div>
              
              {/* Achievement Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
                  <h3 
                    className="text-xl font-semibold mb-4 flex items-center"
                    style={{ color: theme.colors.secondary }}
                  >
                    <span className="mr-2">📈</span>
                    Your Score Progress
                  </h3>
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
                
                <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
                  <h3 
                    className="text-xl font-semibold mb-4 flex items-center"
                    style={{ color: theme.colors.secondary }}
                  >
                    <span className="mr-2">🥇</span>
                    Community Rankings
                  </h3>
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
          </div>
        );
      
      case 'insights':
        return (
          <div className="container mx-auto px-6 py-8">
            <div className="max-w-4xl mx-auto">
              <h2 
                className="text-3xl font-bold mb-6"
                style={{ color: theme.colors.secondary }}
              >
                Journey Insights
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm">
                  <h3 
                    className="text-lg font-medium mb-3"
                    style={{ color: theme.colors.secondary }}
                  >
                    Personal Reflection
                  </h3>
                  <p className="text-white/60 text-sm">
                    Explore your journey through personalized insights and progress analytics
                  </p>
                </div>
                
                <div className="p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm">
                  <h3 
                    className="text-lg font-medium mb-3"
                    style={{ color: theme.colors.secondary }}
                  >
                    Community Impact
                  </h3>
                  <p className="text-white/60 text-sm">
                    See how your participation contributed to the collective experience
                  </p>
                </div>
              </div>
              <div className="mt-8 text-center text-white/40">
                Detailed insights coming soon
              </div>
            </div>
          </div>
        );
        
      default: // overview
        return (
          <div className="h-full pt-20 flex flex-col items-center justify-center text-center px-8">
            {/* Background gradient */}
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                background: `radial-gradient(ellipse at center, ${theme.colors.secondary}40 0%, transparent 50%)`
              }}
            />
            
            <div className="relative z-10 max-w-2xl">
              {/* Phase indicator */}
              <div 
                className="inline-block px-4 py-2 rounded-full text-sm font-medium mb-8 border"
                style={{ 
                  color: theme.colors.secondary,
                  borderColor: theme.colors.secondary + '40',
                  backgroundColor: theme.colors.secondary + '10'
                }}
              >
                After Phase
              </div>
              
              {/* Main content */}
              <h1 
                className="text-4xl md:text-6xl font-bold mb-6"
                style={{ color: theme.colors.secondary }}
              >
                Your Journey Continues
              </h1>
              
              <h2 className="text-xl md:text-2xl text-white/80 mb-8 font-medium">
                Reflect, Share & Connect
              </h2>
              
              <p className="text-lg text-white/60 mb-8 leading-relaxed">
                Your Ode Islands experience doesn&apos;t end here. Explore your memories, 
                share your journey, and stay connected with the community you&apos;ve built.
              </p>
              
              {/* Achievement Summary */}
              <div className="mb-12">
                <div className="flex items-center justify-center mb-6">
                  <ScoreBadge 
                    compact={false}
                    showLevel={true}
                    showPosition={true}
                    onClick={() => setActiveTab('fan-score')}
                    className="transform hover:scale-105 transition-all duration-200 cursor-pointer"
                  />
                </div>
                <div className="text-center">
                  <button
                    onClick={() => setActiveTab('fan-score')}
                    className="text-sm text-white/60 hover:text-white/90 transition-colors"
                  >
                    View detailed achievements and rankings →
                  </button>
                </div>
              </div>
              
              {/* Feature preview cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <button
                  onClick={() => setActiveTab('certificates')}
                  className="p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors text-left"
                >
                  <h3 
                    className="text-lg font-medium mb-3"
                    style={{ color: theme.colors.secondary }}
                  >
                    Your Certificates
                  </h3>
                  <p className="text-white/60 text-sm">
                    View and download certificates recognizing your achievements
                  </p>
                </button>
                
                <button
                  onClick={() => setActiveTab('memories')}
                  className="p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors text-left"
                >
                  <h3 
                    className="text-lg font-medium mb-3"
                    style={{ color: theme.colors.secondary }}
                  >
                    Event Memories
                  </h3>
                  <p className="text-white/60 text-sm">
                    Browse, share, and relive your favorite moments from the journey
                  </p>
                </button>
                
                <button
                  onClick={() => setActiveTab('memory-wallet')}
                  className="p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors text-left"
                >
                  <h3 
                    className="text-lg font-medium mb-3"
                    style={{ color: theme.colors.secondary }}
                  >
                    Memory Wallet
                  </h3>
                  <p className="text-white/60 text-sm">
                    Your personal collection of memories from cards, chapters, and events
                  </p>
                </button>
                
                <button
                  onClick={() => setActiveTab('insights')}
                  className="p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors text-left"
                >
                  <h3 
                    className="text-lg font-medium mb-3"
                    style={{ color: theme.colors.secondary }}
                  >
                    Journey Insights
                  </h3>
                  <p className="text-white/60 text-sm">
                    Discover insights about your progress and impact
                  </p>
                </button>
                
                <button
                  onClick={() => setActiveTab('fan-score')}
                  className="p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors text-left"
                >
                  <h3 
                    className="text-lg font-medium mb-3 flex items-center"
                    style={{ color: theme.colors.secondary }}
                  >
                    <span className="mr-2">🏆</span>
                    Your Achievements
                  </h3>
                  <p className="text-white/60 text-sm">
                    View your Fan Score progress, achievements, and community rankings
                  </p>
                </button>
                
                <div className="p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm">
                  <h3 
                    className="text-lg font-medium mb-3"
                    style={{ color: theme.colors.secondary }}
                  >
                    Continued Journey
                  </h3>
                  <p className="text-white/60 text-sm">
                    Extended content and ways to continue the experience
                  </p>
                </div>
                
                <div className="p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm">
                  <h3 
                    className="text-lg font-medium mb-3"
                    style={{ color: theme.colors.secondary }}
                  >
                    Community Connection
                  </h3>
                  <p className="text-white/60 text-sm">
                    Connect with other participants and build lasting connections
                  </p>
                </div>
                
                <div className="p-6 rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm">
                  <h3 
                    className="text-lg font-medium mb-3"
                    style={{ color: theme.colors.secondary }}
                  >
                    Share Your Success
                  </h3>
                  <p className="text-white/60 text-sm">
                    Share your achievements and certificates with friends
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="w-full min-h-screen bg-black relative">
      <PhaseNavigation currentPhase="after" />
      
      {/* Tab Navigation */}
      {activeTab !== 'overview' && (
        <div className="pt-20 border-b border-white/10 bg-black/90 backdrop-blur-sm sticky top-20 z-40">
          <div className="container mx-auto px-6">
            <div className="flex items-center space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className="text-white/60 hover:text-white/90 transition-colors py-4 text-sm"
              >
                ← Back to Overview
              </button>
              
              <div className="flex space-x-6">
                <button
                  onClick={() => setActiveTab('certificates')}
                  className={`py-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'certificates'
                      ? 'text-white border-blue-500'
                      : 'text-white/60 border-transparent hover:text-white/90'
                  }`}
                >
                  Your Certificates
                </button>
                
                <button
                  onClick={() => setActiveTab('memories')}
                  className={`py-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'memories'
                      ? 'text-white border-blue-500'
                      : 'text-white/60 border-transparent hover:text-white/90'
                  }`}
                >
                  Event Memories
                </button>
                
                <button
                  onClick={() => setActiveTab('memory-wallet')}
                  className={`py-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'memory-wallet'
                      ? 'text-white border-blue-500'
                      : 'text-white/60 border-transparent hover:text-white/90'
                  }`}
                >
                  Memory Wallet
                </button>
                
                <button
                  onClick={() => setActiveTab('insights')}
                  className={`py-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'insights'
                      ? 'text-white border-blue-500'
                      : 'text-white/60 border-transparent hover:text-white/90'
                  }`}
                >
                  Journey Insights
                </button>
                
                <button
                  onClick={() => setActiveTab('fan-score')}
                  className={`py-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'fan-score'
                      ? 'text-white border-blue-500'
                      : 'text-white/60 border-transparent hover:text-white/90'
                  }`}
                >
                  🏆 Achievements
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Content */}
      <div className={activeTab === 'overview' ? 'h-screen overflow-hidden' : 'min-h-screen'}>
        {renderContent()}
      </div>
    </div>
  );
}