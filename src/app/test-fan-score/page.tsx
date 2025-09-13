"use client";

import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import ScoreBadge from '@/components/ScoreBadge';
import ScoreToast, { SingleScoreToast } from '@/components/ScoreToast';
import ScoreProgressPanel from '@/components/ScoreProgressPanel';
import Leaderboard from '@/components/Leaderboard';
import { Button } from '@/components/ui/button';
import { useFanScore } from '@/hooks/useFanScore';
import type { ScoreToastData } from '@/@typings/fanScore';

export default function TestFanScorePage() {
  const { theme } = useTheme();
  const { scoreData, loading, error, showToast, toasts, dismissToast } = useFanScore();
  const [showSingleToast, setShowSingleToast] = useState(false);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 
            className="text-4xl font-bold mb-4"
            style={{ color: theme.colors.secondary }}
          >
            Fan Score Components Test
          </h1>
          <p className="text-white/60 mb-6">
            Testing all Fan Score UI components with real data integration
          </p>

          {/* Header with Score Badge */}
          <div className="flex items-center justify-between bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4 mb-8">
            <div className="text-white font-medium">Sample Header</div>
            <div className="flex items-center space-x-4">
              <ScoreBadge 
                showLevel={true}
                showPosition={true}
                onClick={() => console.log('Navigate to score dashboard')}
              />
              <ScoreBadge 
                compact={true}
                showLevel={true}
              />
            </div>
          </div>
        </div>

        {/* Test Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Button
            onClick={handleTestToast}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Test Card Completion Toast
          </Button>
          <Button
            onClick={handleTestAchievementToast}
            className="bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            Test Achievement Toast
          </Button>
          <Button
            onClick={handleTestSingleToast}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Test Single Toast
          </Button>
        </div>

        {/* Components Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Score Progress Panel */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Score Progress Panel</h2>
            <ScoreProgressPanel 
              showAllScopes={true}
              showRecentActivities={true}
              showAchievements={true}
              showStatistics={true}
            />
          </div>

          {/* Leaderboard */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
            <Leaderboard 
              limit={10}
              showAvatars={true}
              includeUserPosition={true}
              showParticipantCount={true}
            />
            
            {/* Compact Leaderboard */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Compact Version</h3>
              <Leaderboard 
                limit={5}
                compact={true}
                showAvatars={true}
                title="Top 5"
                includeUserPosition={false}
              />
            </div>
          </div>
        </div>

        {/* Badge Variations */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6">Score Badge Variations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4">
              <h3 className="text-sm text-white/60 mb-2">Full Badge</h3>
              <ScoreBadge 
                showLevel={true}
                showPosition={true}
              />
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4">
              <h3 className="text-sm text-white/60 mb-2">Level Only</h3>
              <ScoreBadge 
                showLevel={true}
                showPosition={false}
              />
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4">
              <h3 className="text-sm text-white/60 mb-2">Compact</h3>
              <ScoreBadge 
                compact={true}
                showLevel={true}
              />
            </div>
            
            <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4">
              <h3 className="text-sm text-white/60 mb-2">Score Only</h3>
              <ScoreBadge 
                showLevel={false}
                showPosition={false}
              />
            </div>
          </div>
        </div>

        {/* Component Status */}
        <div className="mt-12 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Component Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl mb-2">
                {loading ? '⏳' : error ? '❌' : '✅'}
              </div>
              <div className="text-sm text-white/60">Data Loading</div>
              <div className="text-xs text-white/40">
                {loading ? 'Loading...' : error ? 'Error' : 'Success'}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl mb-2">🎯</div>
              <div className="text-sm text-white/60">Active Toasts</div>
              <div className="text-xs text-white/40">
                {toasts.length} showing
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl mb-2">📊</div>
              <div className="text-sm text-white/60">Score Data</div>
              <div className="text-xs text-white/40">
                {scoreData ? `Level ${scoreData.currentScore.level}` : 'No data'}
              </div>
            </div>
          </div>
        </div>

        {/* Debug Info */}
        {scoreData && (
          <div className="mt-8 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
            <h3 className="text-lg font-bold text-white mb-4">Debug Info</h3>
            <pre className="text-xs text-white/60 overflow-auto">
              {JSON.stringify({
                currentScore: scoreData.currentScore,
                achievements: scoreData.achievements,
                statistics: scoreData.statistics,
                recentEventsCount: scoreData.recentEvents?.length || 0
              }, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Toast Components */}
      <ScoreToast
        toasts={toasts}
        onDismiss={dismissToast}
        position="top-right"
        maxToasts={3}
        showConfetti={true}
      />

      {/* Single Toast */}
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
    </div>
  );
}