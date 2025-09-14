"use client";

import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import ImmersivePageLayout, { ImmersiveTheme } from '@/components/ImmersivePageLayout';
import ScoreBadge from '@/components/ScoreBadge';
import ScoreToast, { SingleScoreToast } from '@/components/ScoreToast';
import ScoreProgressPanel from '@/components/ScoreProgressPanel';
import Leaderboard from '@/components/Leaderboard';
import { Button } from '@/components/ui/button';
import { useFanScore } from '@/hooks/useFanScore';
import AnimateText from '@/components/AnimateText';
import type { ScoreToastData } from '@/@typings/fanScore';

export default function TestFanScorePage() {
  const { theme } = useTheme();
  const { scoreData, loading, error, showToast, toasts, dismissToast } = useFanScore();
  const [showSingleToast, setShowSingleToast] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ImmersiveTheme>({
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    overlay: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.1))',
    title: '#ffffff',
    subtitle: '#e2e8f0',
    description: '#cbd5e0',
    shadow: true
  });
  const [animate, setAnimate] = useState(true);

  const handleTestToast = () => {
    showToast({
      points: 25,
      activityType: 'card_completion',
      title: 'Card Completed!',
      description: 'You earned 25 points for completing a card',
      duration: 4000
    });
  };

  const handleTestAchievementToast = () => {
    showToast({
      points: 100,
      activityType: 'achievement_unlock',
      title: 'Achievement Unlocked!',
      description: 'You earned 100 bonus points for unlocking an achievement',
      duration: 5000
    });
  };

  const handleTestSingleToast = () => {
    setShowSingleToast(true);
  };

  const handleThemeChange = (newTheme: Partial<ImmersiveTheme>) => {
    setCurrentTheme(prev => ({ ...prev, ...newTheme }));
  };

  React.useEffect(() => {
    // Trigger animation on mount
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <ImmersivePageLayout
      title="Fan Score Test Arena"
      subtitle="Experience the Power of Engagement"
      description="Interactive showcase of all Fan Score components with real-time data integration and immersive design patterns."
      theme={currentTheme}
      animateIn={animate}
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
              Component Testing Environment
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <ScoreBadge 
              showLevel={true}
              showPosition={true}
              compact={true}
              onClick={() => console.log('Navigate to score dashboard')}
            />
          </div>
        </div>
      }
    >
      <div className="space-y-16 pb-12">
        {/* Theme Controls */}
        <div className="bg-white/5 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl shadow-black/20 p-10 hover:bg-white/[0.07] transition-all duration-500">
          <div className="flex items-center justify-center mb-8">
            <h2 className="text-3xl font-bold text-white text-center">
              <AnimateText active={animate} delay={1200}>
                🎨 Theme Customization
              </AnimateText>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="text-white/80 text-base font-medium mb-4">Background Themes</div>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => handleThemeChange({
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    overlay: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.1))'
                  })}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 border-2 border-white/40 hover:scale-110 hover:border-white/60 transition-all duration-300 shadow-lg hover:shadow-xl"
                />
                <button
                  onClick={() => handleThemeChange({
                    background: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
                    overlay: 'linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.1))'
                  })}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-yellow-500 border-2 border-white/40 hover:scale-110 hover:border-white/60 transition-all duration-300 shadow-lg hover:shadow-xl"
                />
                <button
                  onClick={() => handleThemeChange({
                    background: 'linear-gradient(135deg, #5f27cd 0%, #341f97 100%)',
                    overlay: 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.2))'
                  })}
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-700 to-indigo-900 border-2 border-white/40 hover:scale-110 hover:border-white/60 transition-all duration-300 shadow-lg hover:shadow-xl"
                />
              </div>
            </div>
            <div className="text-center group">
              <div className="text-white/80 text-base font-medium mb-4">Text Effects</div>
              <button
                onClick={() => handleThemeChange({ shadow: !currentTheme.shadow })}
                className={`px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
                  currentTheme.shadow
                    ? 'bg-white/20 text-white border border-white/40 shadow-lg'
                    : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/15'
                }`}
              >
                {currentTheme.shadow ? 'On' : 'Off'}
              </button>
            </div>
            <div className="text-center group">
              <div className="text-white/80 text-base font-medium mb-4">Animations</div>
              <button
                onClick={() => setAnimate(!animate)}
                className={`px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 transform hover:scale-105 ${
                  animate
                    ? 'bg-white/20 text-white border border-white/40 shadow-lg'
                    : 'bg-white/10 text-white/70 border border-white/20 hover:bg-white/15'
                }`}
              >
                {animate ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="bg-white/5 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl shadow-black/20 p-10 hover:bg-white/[0.07] transition-all duration-500">
          <div className="flex items-center justify-center mb-8">
            <h2 className="text-3xl font-bold text-white text-center">
              <AnimateText active={animate} delay={1500}>
                🎯 Interactive Toast Testing
              </AnimateText>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <button
              onClick={handleTestToast}
              className="group relative overflow-hidden bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-5 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl border border-blue-400/20 hover:border-blue-300/40"
              style={{
                opacity: 0,
                animation: animate ? 'animButtonIn 0.6s 1.8s ease forwards' : 'none'
              }}
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center justify-center space-x-3">
                <span className="text-xl">📚</span>
                <span className="text-base">Card Completion</span>
              </div>
            </button>
            <button
              onClick={handleTestAchievementToast}
              className="group relative overflow-hidden bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-5 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl border border-orange-400/20 hover:border-orange-300/40"
              style={{
                opacity: 0,
                animation: animate ? 'animButtonIn 0.6s 2.1s ease forwards' : 'none'
              }}
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center justify-center space-x-3">
                <span className="text-xl">🏆</span>
                <span className="text-base">Achievement</span>
              </div>
            </button>
            <button
              onClick={handleTestSingleToast}
              className="group relative overflow-hidden bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold py-5 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-2xl border border-emerald-400/20 hover:border-emerald-300/40"
              style={{
                opacity: 0,
                animation: animate ? 'animButtonIn 0.6s 2.4s ease forwards' : 'none'
              }}
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center justify-center space-x-3">
                <span className="text-xl">🎉</span>
                <span className="text-base">Single Toast</span>
              </div>
            </button>
          </div>
        </div>

        {/* Components Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Score Progress Panel */}
          <div 
            className="bg-white/5 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl shadow-black/20 p-10 hover:bg-white/[0.07] transition-all duration-500"
            style={{
              opacity: 0,
              animation: animate ? 'animButtonIn 0.8s 2.7s ease forwards' : 'none'
            }}
          >
            <div className="flex items-center justify-center mb-8">
              <h2 className="text-3xl font-bold text-white text-center">
                📈 Progress Panel
              </h2>
            </div>
            <ScoreProgressPanel 
              showAllScopes={true}
              showRecentActivities={true}
              showAchievements={true}
              showStatistics={true}
              className="transform transition-all duration-300 hover:scale-[1.02]"
            />
          </div>

          {/* Leaderboard */}
          <div 
            className="bg-white/5 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl shadow-black/20 p-10 hover:bg-white/[0.07] transition-all duration-500"
            style={{
              opacity: 0,
              animation: animate ? 'animButtonIn 0.8s 3.0s ease forwards' : 'none'
            }}
          >
            <div className="flex items-center justify-center mb-8">
              <h2 className="text-3xl font-bold text-white text-center">
                🥇 Leaderboard
              </h2>
            </div>
            <div className="space-y-6">
              <Leaderboard 
                limit={8}
                showAvatars={true}
                includeUserPosition={true}
                showParticipantCount={true}
                className="transform transition-all duration-300 hover:scale-[1.01]"
              />
              
              {/* Compact Leaderboard */}
              <div className="pt-4 border-t border-white/10">
                <h3 className="text-lg font-semibold text-white/80 mb-4 text-center">Compact Version</h3>
                <Leaderboard 
                  limit={3}
                  compact={true}
                  showAvatars={true}
                  title="Top 3"
                  includeUserPosition={false}
                  className="transform transition-all duration-300 hover:scale-[1.01]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Badge Variations */}
        <div 
          className="bg-white/5 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl shadow-black/20 p-10 hover:bg-white/[0.07] transition-all duration-500"
          style={{
            opacity: 0,
            animation: animate ? 'animButtonIn 0.8s 3.3s ease forwards' : 'none'
          }}
        >
          <div className="flex items-center justify-center mb-10">
            <h2 className="text-3xl font-bold text-white text-center">
              🏅 Badge Variations
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8 text-center transform transition-all duration-300 hover:scale-105 hover:bg-white/15 shadow-lg hover:shadow-xl">
              <h3 className="text-base text-white/80 mb-6 font-semibold">Full Badge</h3>
              <div className="flex justify-center">
                <ScoreBadge 
                  showLevel={true}
                  showPosition={true}
                />
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8 text-center transform transition-all duration-300 hover:scale-105 hover:bg-white/15 shadow-lg hover:shadow-xl">
              <h3 className="text-base text-white/80 mb-6 font-semibold">Level Only</h3>
              <div className="flex justify-center">
                <ScoreBadge 
                  showLevel={true}
                  showPosition={false}
                />
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8 text-center transform transition-all duration-300 hover:scale-105 hover:bg-white/15 shadow-lg hover:shadow-xl">
              <h3 className="text-base text-white/80 mb-6 font-semibold">Compact</h3>
              <div className="flex justify-center">
                <ScoreBadge 
                  compact={true}
                  showLevel={true}
                />
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8 text-center transform transition-all duration-300 hover:scale-105 hover:bg-white/15 shadow-lg hover:shadow-xl">
              <h3 className="text-base text-white/80 mb-6 font-semibold">Score Only</h3>
              <div className="flex justify-center">
                <ScoreBadge 
                  showLevel={false}
                  showPosition={false}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Component Status */}
        <div 
          className="bg-white/5 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl shadow-black/20 p-10 hover:bg-white/[0.07] transition-all duration-500"
          style={{
            opacity: 0,
            animation: animate ? 'animButtonIn 0.8s 3.6s ease forwards' : 'none'
          }}
        >
          <div className="flex items-center justify-center mb-10">
            <h2 className="text-3xl font-bold text-white text-center">
              📊 System Status
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8 transform transition-all duration-300 hover:scale-105 hover:bg-white/15 shadow-lg hover:shadow-xl">
              <div className="text-5xl mb-6">
                {loading ? '⏳' : error ? '❌' : '✅'}
              </div>
              <div className="text-xl font-bold text-white mb-4">Data Loading</div>
              <div className="text-sm text-white/80 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
                {loading ? 'Loading...' : error ? 'Error' : 'Connected'}
              </div>
            </div>
            
            <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8 transform transition-all duration-300 hover:scale-105 hover:bg-white/15 shadow-lg hover:shadow-xl">
              <div className="text-5xl mb-6">🎯</div>
              <div className="text-xl font-bold text-white mb-4">Active Toasts</div>
              <div className="text-sm text-white/80 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
                {toasts.length} showing
              </div>
            </div>
            
            <div className="text-center bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-8 transform transition-all duration-300 hover:scale-105 hover:bg-white/15 shadow-lg hover:shadow-xl">
              <div className="text-5xl mb-6">🏆</div>
              <div className="text-xl font-bold text-white mb-4">Score Data</div>
              <div className="text-sm text-white/80 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
                {scoreData?.currentScore?.level ? `Level ${scoreData.currentScore.level}` : 'No data'}
              </div>
            </div>
          </div>
        </div>

        {/* Debug Info */}
        {scoreData && (
          <div 
            className="bg-white/5 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl shadow-black/20 p-10 hover:bg-white/[0.07] transition-all duration-500"
            style={{
              opacity: 0,
              animation: animate ? 'animButtonIn 0.8s 3.9s ease forwards' : 'none'
            }}
          >
            <div className="flex items-center justify-center mb-8">
              <h3 className="text-3xl font-bold text-white text-center">
                🔧 Debug Information
              </h3>
            </div>
            <div className="bg-black/30 rounded-2xl p-8 border border-white/20 backdrop-blur-sm">
              <pre className="text-sm text-green-300 overflow-auto font-mono leading-relaxed">
                {JSON.stringify({
                  currentScore: scoreData?.currentScore || null,
                  achievements: scoreData?.achievements || [],
                  statistics: scoreData?.statistics || null,
                  recentEventsCount: scoreData?.recentEvents?.length || 0
                }, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      </ImmersivePageLayout>

      {/* Toast Components */}
      <ScoreToast
        toasts={toasts}
        onDismiss={dismissToast}
        position="top-right"
        maxToasts={3}
        showConfetti={true}
      />

      <SingleScoreToast
        points={50}
        activityType="quiz_correct"
        title="Quiz Correct!"
        description="You earned 50 points for a correct answer"
        visible={showSingleToast}
        onDismiss={() => setShowSingleToast(false)}
        position="top-center"
        duration={3000}
      />
    </>
  );
}