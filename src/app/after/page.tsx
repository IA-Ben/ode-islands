"use client";

import { useState, useEffect } from "react";
import PhaseNavigation from "@/components/PhaseNavigation";
import EventMemoriesGallery from "@/components/EventMemoriesGallery";
import CertificateManager from "@/components/CertificateManager";
import MemoryWallet from "@/components/MemoryWallet";
import ScoreProgressPanel from "@/components/ScoreProgressPanel";
import Leaderboard from "@/components/Leaderboard";
import ScoreBadge from "@/components/ScoreBadge";
import HeroRecapCard from "@/components/HeroRecapCard";
import ImmersivePageLayout, { ImmersiveTheme } from '@/components/ImmersivePageLayout';
import AnimateText from '@/components/AnimateText';
import { useTheme } from '@/contexts/ThemeContext';

// CMS Configuration Interface
interface AfterExperienceConfig {
  eventId: string;
  config: any;
  tabs: Array<{
    tabKey: string;
    title: string;
    displayOrder: number;
    isVisible: boolean;
    theme: any;
  }>;
  recapHero: any;
  messageSettings: any;
  communitySettings: any;
  upcomingEvents: any[];
  merchCollections: any[];
  gallerySettings: any;
  featureFlags: any[];
}

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
  const [activeTab, setActiveTab] = useState<'overview' | 'message' | 'wallet' | 'gallery' | 'merch' | 'community'>('overview');
  const [animateIn, setAnimateIn] = useState(false);
  const [cmsConfig, setCmsConfig] = useState<AfterExperienceConfig | null>(null);
  const [isLoadingCms, setIsLoadingCms] = useState(true);
  
  // Load CMS configuration
  useEffect(() => {
    async function loadCmsConfig() {
      try {
        // For demo, use a default event ID. In production, this would come from URL params or context
        const eventId = 'default-event';
        const response = await fetch(`/api/cms/after-config/${eventId}`);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setCmsConfig(data.config);
          }
        }
      } catch (error) {
        console.error('Failed to load CMS config:', error);
      } finally {
        setIsLoadingCms(false);
      }
    }
    
    loadCmsConfig();
  }, []);
  
  // Get tab themes from CMS or fallback to defaults
  const getTabThemes = (): Record<string, TabTheme> => {
    if (cmsConfig?.tabs) {
      const themes: Record<string, TabTheme> = {};
      cmsConfig.tabs.forEach(tab => {
        themes[tab.tabKey] = tab.theme || getDefaultTabTheme(tab.tabKey);
      });
      return themes;
    }
    
    // Fallback to default themes
    return getDefaultTabThemes();
  };
  
  // Default tab themes - Professional Lumus-inspired palettes
  const getDefaultTabThemes = (): Record<string, TabTheme> => ({
    overview: {
      background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
      overlay: 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.2))',
      title: '#ffffff',
      subtitle: '#e2e8f0',
      description: '#cbd5e0',
      shadow: true
    },
    message: {
      background: 'linear-gradient(135deg, #581c87 0%, #7c3aed 100%)',
      overlay: 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.2))',
      title: '#ffffff',
      subtitle: '#f3e8ff',
      description: '#ddd6fe',
      shadow: true
    },
    wallet: {
      background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
      overlay: 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.2))',
      title: '#ffffff',
      subtitle: '#ecfdf5',
      description: '#d1fae5',
      shadow: true
    },
    gallery: {
      background: 'linear-gradient(135deg, #374151 0%, #4b5563 100%)',
      overlay: 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.2))',
      title: '#ffffff',
      subtitle: '#f3f4f6',
      description: '#d1d5db',
      shadow: true
    },
    merch: {
      background: 'linear-gradient(135deg, #7c2d12 0%, #9a3412 100%)',
      overlay: 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.2))',
      title: '#ffffff',
      subtitle: '#fef7f0',
      description: '#fed7aa',
      shadow: true
    },
    community: {
      background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
      overlay: 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.2))',
      title: '#ffffff',
      subtitle: '#dbeafe',
      description: '#bfdbfe',
      shadow: true
    }
  });
  
  // Helper function for individual tab themes  
  const getDefaultTabTheme = (tabKey: string): TabTheme => {
    const defaultThemes = getDefaultTabThemes();
    return defaultThemes[tabKey] || defaultThemes.overview;
  };
  
  const tabThemes = getTabThemes();
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
      case 'message':
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
                <svg className="w-6 h-6 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <AnimateText active={animateIn} delay={1800}>
                  Your Personalized Message
                </AnimateText>
              </h3>
              <p className="text-white/80 text-lg">A custom video message crafted from your journey</p>
            </div>
            
            <div className="bg-white/10 rounded-xl p-6 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-white mb-2">Generating Your Message</h4>
              <p className="text-white/60 mb-4">We're creating a personalized video message based on your unique journey through The Ode Islands.</p>
              <div className="w-full bg-white/20 rounded-full h-2 mb-4">
                <div className="bg-gradient-to-r from-purple-400 to-pink-500 h-2 rounded-full w-3/4 transition-all duration-1000"></div>
              </div>
              <p className="text-white/50 text-sm">Estimated completion: 2-3 minutes</p>
            </div>
          </div>
        );

      case 'gallery':
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
                <svg className="w-6 h-6 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <AnimateText active={animateIn} delay={1800}>
                  Event Memories Gallery
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
      
      case 'wallet':
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
                <svg className="w-6 h-6 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <AnimateText active={animateIn} delay={1800}>
                  Memory Wallet v2
                </AnimateText>
              </h3>
              <p className="text-white/80 text-lg">Fuse your collected memories into a Memory Crystal</p>
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
                <svg className="w-6 h-6 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 714.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 713.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 710 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 710-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 713.138-3.138z" />
                </svg>
                <AnimateText active={animateIn} delay={1800}>
                  Achievement Certificates
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
                  <svg className="w-6 h-6 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 714.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 713.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 710 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 710-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 713.138-3.138z" />
                  </svg>
                  <AnimateText active={animateIn} delay={1800}>
                    Your Achievement Legacy
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
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
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
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
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
                <svg className="w-6 h-6 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 712-2h2a2 2 0 712 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 712-2h2a2 2 0 712 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <AnimateText active={animateIn} delay={1800}>
                  Journey Insights
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
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
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
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <h4 className="text-2xl font-bold text-white mb-4">Community Impact</h4>
                <p className="text-white/70 leading-relaxed">
                  See how your participation contributed to the collective experience. Your journey inspired others and shaped the community.
                </p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 max-w-md mx-auto">
                <div className="text-white/60 mb-2">
                  <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-white/60 text-sm">Detailed analytics dashboard coming soon</p>
              </div>
            </div>
          </div>
        );
      default: // overview
        return (
          <div className="space-y-12">
            {/* Hero Recap Card */}
            <HeroRecapCard className="w-full" />
            
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
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
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
                  <span className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    View Complete Achievement Legacy
                  </span>
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
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
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
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
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
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
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
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
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
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
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
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
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
              <div className="text-white/90 text-base font-semibold mb-1">
                Post-Journey Experience
              </div>
              <div className="text-white/60 text-sm">
                Your adventure legacy awaits
              </div>
            </div>
            {activeTab !== 'overview' && (
              <button
                onClick={() => setActiveTab('overview')}
                className="group flex items-center space-x-2 text-white/90 hover:text-white transition-all duration-200 text-sm font-medium bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20 hover:bg-white/15"
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
        {/* Professional Tab Navigation */}
        {activeTab !== 'overview' && (
          <div 
            className="bg-white/8 backdrop-blur-sm rounded-lg border border-white/20 p-1 mb-8"
            style={{
              opacity: 0,
              animation: animateIn ? 'animButtonIn 0.8s 1.2s ease forwards' : 'none'
            }}
          >
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('certificates')}
                className={`flex-1 px-4 py-3 text-sm font-semibold rounded-md transition-all duration-200 ${
                  activeTab === 'certificates'
                    ? 'bg-white/20 text-white backdrop-blur-sm border border-white/30'
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
                className={`flex-1 px-4 py-3 text-sm font-semibold rounded-md transition-all duration-200 ${
                  activeTab === 'memories'
                    ? 'bg-white/20 text-white backdrop-blur-sm border border-white/30'
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
                onClick={() => setActiveTab('memory-wallet')}
                className={`flex-1 px-4 py-3 text-sm font-semibold rounded-md transition-all duration-200 ${
                  activeTab === 'memory-wallet'
                    ? 'bg-white/20 text-white backdrop-blur-sm border border-white/30'
                    : 'text-white/70 hover:text-white/90 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span>Collection</span>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('insights')}
                className={`flex-1 px-4 py-3 text-sm font-semibold rounded-md transition-all duration-200 ${
                  activeTab === 'insights'
                    ? 'bg-white/20 text-white backdrop-blur-sm border border-white/30'
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
              
              <button
                onClick={() => setActiveTab('fan-score')}
                className={`flex-1 px-4 py-3 text-sm font-semibold rounded-md transition-all duration-200 ${
                  activeTab === 'fan-score'
                    ? 'bg-white/20 text-white backdrop-blur-sm border border-white/30'
                    : 'text-white/70 hover:text-white/90 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  <span>Achievements</span>
                </div>
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