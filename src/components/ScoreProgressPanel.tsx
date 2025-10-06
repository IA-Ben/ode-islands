"use client";

import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useFanScore } from '@/hooks/useFanScore';
import { Button } from '@/components/ui/button';
import type { FanScoreData } from '@/@typings/fanScore';
import { ACTIVITY_CONFIGS, LEVEL_THRESHOLDS } from '@/@typings/fanScore';
import { surfaces } from '@/lib/admin/designTokens';

interface ScoreProgressPanelProps {
  /** Custom scope for score display */
  scopeType?: string;
  scopeId?: string;
  /** Show all scopes or just current */
  showAllScopes?: boolean;
  /** Show recent activities */
  showRecentActivities?: boolean;
  /** Show achievements section */
  showAchievements?: boolean;
  /** Show statistics section */
  showStatistics?: boolean;
  /** Custom className */
  className?: string;
  /** Use provided score data instead of fetching */
  scoreData?: FanScoreData | null;
  /** Hide refresh button */
  hideRefresh?: boolean;
}

export default function ScoreProgressPanel({
  scopeType = 'global',
  scopeId = 'global',
  showAllScopes = true,
  showRecentActivities = true,
  showAchievements = true,
  showStatistics = true,
  className = '',
  scoreData: providedScoreData,
  hideRefresh = false
}: ScoreProgressPanelProps) {
  const { theme } = useTheme();
  const { scoreData: fetchedScoreData, loading, error, refreshScore } = useFanScore({
    scopeType,
    scopeId,
    includeRecentEvents: showRecentActivities,
    recentEventsLimit: 20
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'activities' | 'achievements' | 'statistics'>('overview');

  // Use provided data or fetched data
  const scoreData = providedScoreData || fetchedScoreData;

  const getLevelColor = (level: number) => {
    if (level >= 10) return '#FFD700'; // Gold
    if (level >= 8) return '#C084FC'; // Purple
    if (level >= 6) return '#60A5FA'; // Blue
    if (level >= 4) return '#F97316'; // Orange
    if (level >= 2) return '#10B981'; // Green
    return '#6B7280'; // Gray
  };

  const getLevelIcon = (level: number) => {
    if (level >= 10) return '👑';
    if (level >= 8) return '💎';
    if (level >= 6) return '⭐';
    if (level >= 4) return '🔥';
    if (level >= 2) return '⚡';
    return '🌟';
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getActivityConfig = (activityType: string) => {
    return ACTIVITY_CONFIGS[activityType as keyof typeof ACTIVITY_CONFIGS] || {
      icon: 'default',
      color: theme.colors.primary,
      label: 'Activity',
      emoji: '⭐'
    };
  };

  if (loading && !scoreData) {
    return (
      <div className={`score-progress-panel ${className}`}>
        <div className={`${surfaces.cardGlass} rounded-lg border border-slate-700/50 p-6`}>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fuchsia-400"></div>
            <span className="ml-3 text-white/60">Loading your score progress...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !scoreData) {
    return (
      <div className={`score-progress-panel ${className}`}>
        <div className={`${surfaces.cardGlass} rounded-lg border border-slate-700/50 p-6`}>
          <div className="text-center py-12">
            <div className="text-red-400 mb-4">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-red-400 mb-4">{error || 'Failed to load score data'}</p>
            {!hideRefresh && (
              <Button 
                onClick={refreshScore}
                className={`${surfaces.subtleGlass} hover:bg-white/20 text-white border border-slate-700/50`}
              >
                Try Again
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const { currentScore, achievements, statistics, recentEvents, allScopes } = scoreData;
  const level = currentScore.level;
  const score = currentScore.totalScore;
  const nextLevel = currentScore.nextLevel;
  const pointsToNext = currentScore.pointsToNextLevel;

  // Calculate progress percentage for current level
  const currentThreshold = LEVEL_THRESHOLDS.find(t => t.level === level);
  const nextThreshold = LEVEL_THRESHOLDS.find(t => t.level === nextLevel);
  const progressPercentage = nextLevel && nextThreshold ? 
    Math.max(0, Math.min(100, ((score - (currentThreshold?.minScore || 0)) / ((nextThreshold.minScore - (currentThreshold?.minScore || 0)) || 1)) * 100))
    : 100;

  return (
    <div className={`score-progress-panel ${className}`}>
      <div className={`${surfaces.cardGlass} rounded-lg border border-slate-700/50 overflow-hidden`}>
        {/* Header */}
        <div className="p-6 border-b border-slate-700/30">
          <div className="flex items-center justify-between mb-4">
            <h2 
              className="text-2xl font-bold"
              style={{ color: theme.colors.secondary }}
            >
              Fan Score Progress
            </h2>
            {!hideRefresh && (
              <Button
                onClick={refreshScore}
                className={`${surfaces.subtleGlass} hover:bg-white/20 text-white border border-slate-700/50`}
                disabled={loading}
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white/60"></div>
                ) : (
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                Refresh
              </Button>
            )}
          </div>

          {/* Current Level and Score */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div 
                className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-2xl font-bold text-white mb-2"
                style={{ backgroundColor: getLevelColor(level) }}
              >
                {getLevelIcon(level)}
              </div>
              <div className="text-lg font-semibold text-white">Level {level}</div>
              <div className="text-sm text-white/60">Current Level</div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-white mb-1">
                {score.toLocaleString()}
              </div>
              <div className="text-sm text-white/60">Total Points</div>
              {currentScore.leaderboardPosition > 0 && (
                <div className="text-xs text-white/40 mt-1">
                  #{currentScore.leaderboardPosition} globally
                </div>
              )}
            </div>

            <div className="text-center">
              {nextLevel ? (
                <>
                  <div className="text-lg font-semibold text-white mb-1">
                    {pointsToNext.toLocaleString()}
                  </div>
                  <div className="text-sm text-white/60">Points to Level {nextLevel}</div>
                  <div className={`w-full ${surfaces.subtleGlass} rounded-full h-2 mt-2`}>
                    <div 
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${progressPercentage}%`,
                        backgroundColor: getLevelColor(nextLevel)
                      }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="text-lg font-semibold text-yellow-400 mb-1">
                    MAX LEVEL
                  </div>
                  <div className="text-sm text-white/60">Congratulations!</div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-slate-700/30">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', show: true },
              { id: 'activities', label: 'Recent Activities', show: showRecentActivities },
              { id: 'achievements', label: 'Achievements', show: showAchievements },
              { id: 'statistics', label: 'Statistics', show: showStatistics }
            ].filter(tab => tab.show).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'border-fuchsia-500 text-white'
                    : 'border-transparent text-white/60 hover:text-white/80 hover:border-slate-700/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Level Progress */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Level Progress</h3>
                <div className="space-y-3">
                  {LEVEL_THRESHOLDS.slice(0, 10).map((threshold) => (
                    <div key={threshold.level} className="flex items-center space-x-3">
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          threshold.level <= level ? 'text-white' : 'text-white/40'
                        }`}
                        style={{ 
                          backgroundColor: threshold.level <= level ? getLevelColor(threshold.level) : 'rgba(255,255,255,0.1)'
                        }}
                      >
                        {threshold.level <= level ? getLevelIcon(threshold.level) : threshold.level}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-white">
                          Level {threshold.level}
                        </div>
                        <div className="text-xs text-white/60">
                          {threshold.minScore.toLocaleString()} 
                          {threshold.maxScore && ` - ${threshold.maxScore.toLocaleString()}`} points
                        </div>
                      </div>
                      {threshold.level === level && (
                        <div className={`text-xs text-white/60 ${surfaces.subtleGlass} px-2 py-1 rounded`}>
                          Current
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* All Scopes */}
              {showAllScopes && allScopes.length > 1 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">All Scopes</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allScopes.map((scope, index) => (
                      <div key={index} className={`${surfaces.subtleGlass} rounded-lg p-4`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-white">
                              {scope.scopeType === 'global' ? 'Global' : 
                               scope.scopeType === 'event' ? 'Event' : scope.scopeType}
                            </div>
                            <div className="text-xs text-white/60">{scope.scopeId}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-white">
                              {scope.totalScore.toLocaleString()}
                            </div>
                            <div className="text-xs text-white/60">Level {scope.level}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recent Activities Tab */}
          {activeTab === 'activities' && showRecentActivities && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Recent Activities</h3>
              {recentEvents && recentEvents.length > 0 ? (
                <div className="space-y-3">
                  {recentEvents.map((event) => {
                    const config = getActivityConfig(event.activityType);
                    return (
                      <div key={event.id} className={`flex items-center space-x-3 p-3 ${surfaces.subtleGlass} rounded-lg`}>
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                          style={{ backgroundColor: config.color }}
                        >
                          {config.emoji}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-white">
                            {config.label}
                          </div>
                          <div className="text-xs text-white/60">
                            {formatDate(event.createdAt)} • {event.referenceType}
                          </div>
                        </div>
                        <div className="text-right">
                          <div 
                            className="text-sm font-bold"
                            style={{ color: config.color }}
                          >
                            +{event.points}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-white/40 mb-2">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-white/60">No recent activities yet</p>
                </div>
              )}
            </div>
          )}

          {/* Achievements Tab */}
          {activeTab === 'achievements' && showAchievements && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Achievements</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className={`${surfaces.subtleGlass} rounded-lg p-4 text-center`}>
                  <div className="text-2xl font-bold text-white">{achievements.unlocked}</div>
                  <div className="text-sm text-white/60">Unlocked</div>
                </div>
                <div className={`${surfaces.subtleGlass} rounded-lg p-4 text-center`}>
                  <div className="text-2xl font-bold text-white">{achievements.total}</div>
                  <div className="text-sm text-white/60">Total Available</div>
                </div>
              </div>
              
              {achievements.total > 0 && (
                <div className={`w-full ${surfaces.subtleGlass} rounded-full h-3`}>
                  <div 
                    className="h-3 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-500"
                    style={{ width: `${(achievements.unlocked / achievements.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === 'statistics' && showStatistics && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`${surfaces.subtleGlass} rounded-lg p-4 text-center`}>
                  <div className="text-2xl font-bold text-white">
                    {statistics.totalPointsEarned.toLocaleString()}
                  </div>
                  <div className="text-sm text-white/60">Total Points Earned</div>
                </div>
                
                <div className={`${surfaces.subtleGlass} rounded-lg p-4 text-center`}>
                  <div className="text-2xl font-bold text-white">
                    {statistics.totalActivities}
                  </div>
                  <div className="text-sm text-white/60">Total Activities</div>
                </div>
                
                <div className={`${surfaces.subtleGlass} rounded-lg p-4 text-center`}>
                  <div className="text-2xl font-bold text-white">
                    {statistics.totalActivities > 0 ? Math.round(statistics.totalPointsEarned / statistics.totalActivities) : 0}
                  </div>
                  <div className="text-sm text-white/60">Avg Points/Activity</div>
                </div>
                
                <div className={`${surfaces.subtleGlass} rounded-lg p-4 text-center`}>
                  <div className="text-2xl font-bold text-white">
                    {currentScore.leaderboardPosition || 'N/A'}
                  </div>
                  <div className="text-sm text-white/60">Global Rank</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}