"use client";

import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useFanScore } from '@/hooks/useFanScore';
import type { FanScoreData } from '@/@typings/fanScore';
import { LEVEL_THRESHOLDS } from '@/@typings/fanScore';

interface ScoreBadgeProps {
  /** Custom scope for score display */
  scopeType?: string;
  scopeId?: string;
  /** Show level instead of just score */
  showLevel?: boolean;
  /** Show position in leaderboard */
  showPosition?: boolean;
  /** Compact mode - smaller badge */
  compact?: boolean;
  /** Custom className */
  className?: string;
  /** Click handler for navigation to score dashboard */
  onClick?: () => void;
  /** Use provided score data instead of fetching */
  scoreData?: FanScoreData | null;
}

export default function ScoreBadge({
  scopeType = 'global',
  scopeId = 'global',
  showLevel = true,
  showPosition = false,
  compact = false,
  className = '',
  onClick,
  scoreData: providedScoreData
}: ScoreBadgeProps) {
  const { theme } = useTheme();
  const { scoreData: fetchedScoreData, loading, error } = useFanScore({
    scopeType,
    scopeId,
    includeRecentEvents: false
  });

  // Use provided data or fetched data
  const scoreData = providedScoreData || fetchedScoreData;

  const getLevelIcon = (level: number) => {
    if (level >= 10) return '👑'; // Crown for max level
    if (level >= 8) return '💎'; // Diamond for high levels
    if (level >= 6) return '⭐'; // Star for mid-high levels
    if (level >= 4) return '🔥'; // Fire for mid levels
    if (level >= 2) return '⚡'; // Lightning for early levels
    return '🌟'; // Default for level 1
  };

  const getLevelColor = (level: number) => {
    if (level >= 10) return '#FFD700'; // Gold
    if (level >= 8) return '#C084FC'; // Purple
    if (level >= 6) return '#60A5FA'; // Blue
    if (level >= 4) return '#F97316'; // Orange
    if (level >= 2) return '#10B981'; // Green
    return '#6B7280'; // Gray
  };

  if (loading && !scoreData) {
    return (
      <div className={`score-badge loading ${className}`}>
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 ${compact ? 'px-2 py-1' : 'px-3 py-2'}`}>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white/60"></div>
          {!compact && <span className="text-xs text-white/60">Loading...</span>}
        </div>
      </div>
    );
  }

  if (error || !scoreData) {
    return (
      <div className={`score-badge error ${className}`}>
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 ${compact ? 'px-2 py-1' : 'px-3 py-2'}`}>
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          {!compact && <span className="text-xs text-red-400">Error</span>}
        </div>
      </div>
    );
  }

  const { currentScore } = scoreData;
  const level = currentScore.level;
  const score = currentScore.totalScore;
  const position = currentScore.leaderboardPosition;

  const badgeStyle = {
    background: `linear-gradient(135deg, ${theme.colors.primary}20, ${getLevelColor(level)}20)`,
    borderColor: `${getLevelColor(level)}40`,
  };

  // Calculate progress using LEVEL_THRESHOLDS for accurate percentage
  const calculateProgressPercentage = () => {
    if (level >= 10) return 100; // Max level reached
    
    const currentLevelThreshold = LEVEL_THRESHOLDS.find(t => t.level === level);
    const nextLevelThreshold = LEVEL_THRESHOLDS.find(t => t.level === level + 1);
    
    if (!currentLevelThreshold || !nextLevelThreshold) return 0;
    
    const currentLevelMin = currentLevelThreshold.minScore;
    const nextLevelMin = nextLevelThreshold.minScore;
    const progressInCurrentLevel = score - currentLevelMin;
    const levelRange = nextLevelMin - currentLevelMin;
    
    return Math.max(0, Math.min(100, (progressInCurrentLevel / levelRange) * 100));
  };

  const progressPercentage = calculateProgressPercentage();

  return (
    <div 
      className={`score-badge ${onClick ? 'cursor-pointer hover:scale-105' : ''} transition-all duration-200 ${className}`}
      onClick={onClick}
    >
      <div 
        className={`flex items-center space-x-2 rounded-full border backdrop-blur-sm ${
          compact ? 'px-2 py-1' : 'px-3 py-2'
        }`}
        style={badgeStyle}
      >
        {/* Level Icon */}
        {showLevel && (
          <div className="flex items-center space-x-1">
            <span className={`${compact ? 'text-sm' : 'text-base'}`}>
              {getLevelIcon(level)}
            </span>
            <span 
              className={`font-bold ${compact ? 'text-xs' : 'text-sm'} text-white`}
              style={{ color: getLevelColor(level) }}
            >
              {level}
            </span>
          </div>
        )}

        {/* Score Display */}
        <div className="flex items-center space-x-1">
          <svg className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-yellow-400`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className={`font-semibold text-white ${compact ? 'text-xs' : 'text-sm'}`}>
            {score.toLocaleString()}
          </span>
        </div>

        {/* Position Display */}
        {showPosition && position > 0 && (
          <div className="flex items-center space-x-1">
            <span className={`text-white/60 ${compact ? 'text-xs' : 'text-sm'}`}>
              #{position}
            </span>
          </div>
        )}

        {/* Progress Bar for Next Level */}
        {!compact && currentScore.nextLevel && currentScore.pointsToNextLevel > 0 && (
          <div className="hidden sm:flex items-center space-x-1">
            <div className="w-12 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span className="text-xs text-white/60">
              {currentScore.pointsToNextLevel}
            </span>
          </div>
        )}
      </div>

      {/* Hover Tooltip */}
      {onClick && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1 bg-black/80 text-xs text-white/80 rounded opacity-0 hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
          {showPosition && position > 0 ? `Level ${level} • ${score.toLocaleString()} points • #${position} globally` : `Level ${level} • ${score.toLocaleString()} points`}
          {currentScore.nextLevel && currentScore.pointsToNextLevel > 0 && (
            <span> • {currentScore.pointsToNextLevel} to level {currentScore.nextLevel}</span>
          )}
        </div>
      )}
    </div>
  );
}