"use client";

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';

interface LeaderboardUser {
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  displayName: string;
}

interface LeaderboardEntry {
  position: number;
  userId: string;
  totalScore: number;
  level: number;
  user: LeaderboardUser | null;
}

interface UserPosition {
  position: number;
  totalScore: number;
  level: number;
  isInTopList: boolean;
}

interface LeaderboardData {
  scope: {
    type: string;
    id: string;
    totalParticipants: number;
  };
  leaderboard: LeaderboardEntry[];
  userPosition: UserPosition | null;
  meta: {
    limit: number;
    timestamp: string;
  };
}

interface LeaderboardProps {
  /** Scope for leaderboard */
  scopeType?: string;
  scopeId?: string;
  /** Event ID for event-specific leaderboard */
  eventId?: string;
  /** Phase for phase-specific leaderboard */
  phase?: string;
  /** Number of entries to display */
  limit?: number;
  /** Show current user's position even if not in top entries */
  includeUserPosition?: boolean;
  /** Compact mode - smaller entries */
  compact?: boolean;
  /** Custom className */
  className?: string;
  /** Hide refresh button */
  hideRefresh?: boolean;
  /** Show user avatars */
  showAvatars?: boolean;
  /** Custom title */
  title?: string;
  /** Show participant count */
  showParticipantCount?: boolean;
}

export default function Leaderboard({
  scopeType = 'global',
  scopeId = 'global',
  eventId,
  phase,
  limit = 10,
  includeUserPosition = true,
  compact = false,
  className = '',
  hideRefresh = false,
  showAvatars = true,
  title = 'Leaderboard',
  showParticipantCount = true
}: LeaderboardProps) {
  const { theme } = useTheme();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        scopeType,
        scopeId,
        limit: limit.toString(),
        includeUserPosition: includeUserPosition.toString()
      });

      if (eventId) params.append('eventId', eventId);
      if (phase) params.append('phase', phase);

      const response = await fetch(`/api/fan-score/leaderboard?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        // Extract data from the nested 'data' object to match consistent API pattern
        if (result.data && result.data.leaderboard && result.data.scope && result.data.meta) {
          setLeaderboardData({
            scope: result.data.scope,
            leaderboard: result.data.leaderboard,
            userPosition: result.data.userPosition,
            meta: result.data.meta
          });
        } else {
          setError('Invalid response format from leaderboard API');
        }
      } else {
        setError(result.message || 'Failed to fetch leaderboard data');
      }
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
      setError('Failed to fetch leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [scopeType, scopeId, eventId, phase, limit, includeUserPosition]);

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return null;
    }
  };

  const getRankColor = (position: number) => {
    switch (position) {
      case 1: return '#FFD700'; // Gold
      case 2: return '#C0C0C0'; // Silver
      case 3: return '#CD7F32'; // Bronze
      default: return theme.colors.primary;
    }
  };

  const getLevelIcon = (level: number) => {
    if (level >= 10) return '👑';
    if (level >= 8) return '💎';
    if (level >= 6) return '⭐';
    if (level >= 4) return '🔥';
    if (level >= 2) return '⚡';
    return '🌟';
  };

  const getLevelColor = (level: number) => {
    if (level >= 10) return '#FFD700';
    if (level >= 8) return '#C084FC';
    if (level >= 6) return '#60A5FA';
    if (level >= 4) return '#F97316';
    if (level >= 2) return '#10B981';
    return '#6B7280';
  };

  const getAvatarUrl = (user: LeaderboardUser | null) => {
    if (!user) return `https://ui-avatars.com/api/?name=User&background=random&size=${compact ? 32 : 48}`;
    if (user.profileImageUrl) return user.profileImageUrl;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=random&size=${compact ? 32 : 48}`;
  };

  const getScopeDisplayName = () => {
    if (!leaderboardData) return '';
    const { scope } = leaderboardData;
    
    switch (scope.type) {
      case 'global': return 'Global Rankings';
      case 'event': return `Event Rankings`;
      case 'phase': return `${scope.id} Phase Rankings`;
      default: return `${scope.type} Rankings`;
    }
  };

  if (loading) {
    return (
      <div className={`leaderboard ${className}`}>
        <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">{title}</h3>
          </div>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/60"></div>
            <span className="ml-3 text-white/60">Loading leaderboard...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !leaderboardData) {
    return (
      <div className={`leaderboard ${className}`}>
        <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white">{title}</h3>
          </div>
          <div className="text-center py-12">
            <div className="text-red-400 mb-4">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.232 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-red-400 mb-4">{error || 'Failed to load leaderboard'}</p>
            {!hideRefresh && (
              <Button 
                onClick={fetchLeaderboard}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
              >
                Try Again
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const { leaderboard, userPosition, scope } = leaderboardData;

  return (
    <div className={`leaderboard ${className}`}>
      <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h3 
                className="text-xl font-bold"
                style={{ color: theme.colors.secondary }}
              >
                {title}
              </h3>
              <div className="text-sm text-white/60 mt-1">
                {getScopeDisplayName()}
                {showParticipantCount && scope.totalParticipants > 0 && (
                  <span> • {scope.totalParticipants.toLocaleString()} participants</span>
                )}
              </div>
            </div>
            {!hideRefresh && (
              <Button
                onClick={fetchLeaderboard}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
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
        </div>

        {/* Leaderboard Entries */}
        <div className="p-6">
          {leaderboard.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-white/40 mb-4">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="text-white/60 mb-2">No rankings available yet</p>
              <p className="text-white/40 text-sm">Be the first to earn points and claim the top spot!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((entry) => (
                <div
                  key={entry.userId}
                  className={`flex items-center space-x-4 rounded-lg transition-all duration-200 hover:bg-white/5 ${
                    compact ? 'p-3' : 'p-4'
                  }`}
                  style={{
                    backgroundColor: entry.position <= 3 ? `${getRankColor(entry.position)}10` : 'rgba(255,255,255,0.02)',
                    borderLeft: entry.position <= 3 ? `3px solid ${getRankColor(entry.position)}` : '3px solid transparent'
                  }}
                >
                  {/* Rank */}
                  <div className="flex-shrink-0 w-8 text-center">
                    {getRankIcon(entry.position) ? (
                      <span className="text-2xl">{getRankIcon(entry.position)}</span>
                    ) : (
                      <span 
                        className="text-lg font-bold"
                        style={{ color: getRankColor(entry.position) }}
                      >
                        {entry.position}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  {showAvatars && (
                    <div className="flex-shrink-0">
                      <img
                        src={getAvatarUrl(entry.user)}
                        alt={entry.user?.displayName || 'User'}
                        className={`rounded-full border-2 ${compact ? 'w-8 h-8' : 'w-12 h-12'}`}
                        style={{ borderColor: getLevelColor(entry.level) + '60' }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.user?.displayName || 'User')}&background=random&size=${compact ? 32 : 48}`;
                        }}
                      />
                    </div>
                  )}

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className={`font-semibold text-white truncate ${compact ? 'text-sm' : 'text-base'}`}>
                        {entry.user?.displayName || 'Anonymous User'}
                      </span>
                      <div 
                        className={`flex items-center space-x-1 px-2 py-1 rounded-full ${compact ? 'text-xs' : 'text-sm'}`}
                        style={{ backgroundColor: getLevelColor(entry.level) + '20' }}
                      >
                        <span className="text-xs">{getLevelIcon(entry.level)}</span>
                        <span 
                          className="font-medium"
                          style={{ color: getLevelColor(entry.level) }}
                        >
                          L{entry.level}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="flex-shrink-0 text-right">
                    <div className={`font-bold text-white ${compact ? 'text-sm' : 'text-lg'}`}>
                      {entry.totalScore.toLocaleString()}
                    </div>
                    <div className={`text-white/60 ${compact ? 'text-xs' : 'text-sm'}`}>
                      points
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Current User Position (if not in top entries) */}
          {includeUserPosition && userPosition && !userPosition.isInTopList && userPosition.position > 0 && (
            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="text-sm text-white/60 mb-3">Your Position</div>
              <div
                className="flex items-center space-x-4 p-4 rounded-lg bg-white/5"
                style={{
                  borderLeft: `3px solid ${theme.colors.primary}`
                }}
              >
                {/* Rank */}
                <div className="flex-shrink-0 w-8 text-center">
                  <span 
                    className="text-lg font-bold"
                    style={{ color: theme.colors.primary }}
                  >
                    {userPosition.position}
                  </span>
                </div>

                {/* Avatar Placeholder */}
                {showAvatars && (
                  <div className="flex-shrink-0">
                    <div 
                      className={`rounded-full border-2 flex items-center justify-center ${compact ? 'w-8 h-8' : 'w-12 h-12'}`}
                      style={{ 
                        borderColor: getLevelColor(userPosition.level) + '60',
                        backgroundColor: theme.colors.primary + '20'
                      }}
                    >
                      <span className="text-white text-xs">You</span>
                    </div>
                  </div>
                )}

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className={`font-semibold text-white ${compact ? 'text-sm' : 'text-base'}`}>
                      Your Position
                    </span>
                    <div 
                      className={`flex items-center space-x-1 px-2 py-1 rounded-full ${compact ? 'text-xs' : 'text-sm'}`}
                      style={{ backgroundColor: getLevelColor(userPosition.level) + '20' }}
                    >
                      <span className="text-xs">{getLevelIcon(userPosition.level)}</span>
                      <span 
                        className="font-medium"
                        style={{ color: getLevelColor(userPosition.level) }}
                      >
                        L{userPosition.level}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Score */}
                <div className="flex-shrink-0 text-right">
                  <div className={`font-bold text-white ${compact ? 'text-sm' : 'text-lg'}`}>
                    {userPosition.totalScore.toLocaleString()}
                  </div>
                  <div className={`text-white/60 ${compact ? 'text-xs' : 'text-sm'}`}>
                    points
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}