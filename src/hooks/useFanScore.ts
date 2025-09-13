"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import type { FanScoreData, ScoreToastData, ActivityType } from '@/@typings/fanScore';

interface UseFanScoreOptions {
  scopeType?: string;
  scopeId?: string;
  includeRecentEvents?: boolean;
  recentEventsLimit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseFanScoreReturn {
  scoreData: FanScoreData | null;
  loading: boolean;
  error: string | null;
  refreshScore: () => Promise<void>;
  showToast: (toastData: ScoreToastData) => void;
  toasts: ScoreToastData[];
  dismissToast: (index: number) => void;
}

export const useFanScore = (options: UseFanScoreOptions = {}): UseFanScoreReturn => {
  const {
    scopeType = 'global',
    scopeId = 'global',
    includeRecentEvents = true,
    recentEventsLimit = 10,
    autoRefresh = false,
    refreshInterval = 30000 // 30 seconds
  } = options;

  const [scoreData, setScoreData] = useState<FanScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ScoreToastData[]>([]);
  
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // WebSocket connection for real-time score updates
  const wsUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
    : null;

  const { connectionStatus, lastMessage } = useWebSocket(wsUrl, {
    onMessage: (message) => {
      if (message.type === 'fan_score_update' && message.payload) {
        const update = message.payload;
        
        // Show toast for new points earned
        if (update.pointsAwarded && update.pointsAwarded > 0) {
          // Map server activity type to UI activity type for proper display
          const uiActivityType = mapServerToUIActivityType(update.activityType);
          
          showToast({
            points: update.pointsAwarded,
            activityType: uiActivityType,
            title: getActivityTitle(uiActivityType),
            description: getActivityDescription(uiActivityType, update.pointsAwarded),
            duration: 4000
          });
        }

        // Refresh score data after a brief delay to ensure backend is updated
        setTimeout(() => {
          refreshScore();
        }, 500);
      }
    }
  });

  const fetchScoreData = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      
      const params = new URLSearchParams({
        scopeType,
        scopeId,
        includeRecentEvents: includeRecentEvents.toString(),
        recentEventsLimit: recentEventsLimit.toString()
      });

      const response = await fetch(`/api/fan-score?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setScoreData(result.data);
      } else {
        setError(result.message || 'Failed to fetch fan score data');
      }
    } catch (err) {
      console.error('Fan score fetch error:', err);
      setError('Failed to fetch fan score data');
    } finally {
      setLoading(false);
    }
  }, [scopeType, scopeId, includeRecentEvents, recentEventsLimit]);

  const refreshScore = useCallback(async (): Promise<void> => {
    await fetchScoreData();
  }, [fetchScoreData]);

  const showToast = useCallback((toastData: ScoreToastData): void => {
    const newToast = {
      ...toastData,
      duration: toastData.duration || 3000
    };

    setToasts(prev => [newToast, ...prev.slice(0, 2)]); // Keep max 3 toasts

    // Auto-dismiss toast after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast !== newToast));
    }, newToast.duration);
  }, []);

  const dismissToast = useCallback((index: number): void => {
    setToasts(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchScoreData();
  }, [fetchScoreData]);

  // Auto-refresh interval
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        refreshScore();
      }, refreshInterval);

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, refreshScore]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  return {
    scoreData,
    loading,
    error,
    refreshScore,
    showToast,
    toasts,
    dismissToast
  };
};

// Activity type mapping between server and UI
const mapServerToUIActivityType = (serverType: string): string => {
  const typeMap: Record<string, string> = {
    // Server activity types -> UI activity types
    'card_complete': 'card_completion',
    'chapter_complete': 'chapter_completion', 
    'memory_collect': 'memory_collection',
    'interaction': 'content_interaction',
    // Missing activity types from server
    'content_share': 'content_share',
    'video_complete': 'video_complete',
    'ar_complete': 'ar_complete',
    'quiz_complete': 'quiz_complete',
    // Already matching types
    'quiz_correct': 'quiz_correct',
    'quiz_incorrect': 'quiz_incorrect',
    'poll_participation': 'poll_participation',
    'achievement_unlock': 'achievement_unlock',
    'daily_login': 'daily_login',
    'content_interaction': 'content_interaction',
    'event_participation': 'event_participation'
  };
  
  return typeMap[serverType] || serverType;
};

// Helper functions for activity descriptions
function getActivityTitle(activityType: string): string {
  const titles: Record<string, string> = {
    card_completion: 'Card Completed!',
    poll_participation: 'Poll Answered!',
    quiz_correct: 'Quiz Correct!',
    quiz_incorrect: 'Quiz Attempted!',
    memory_collection: 'Memory Collected!',
    chapter_completion: 'Chapter Completed!',
    event_participation: 'Event Joined!',
    content_share: 'Content Shared!',
    video_complete: 'Video Watched!',
    ar_complete: 'AR Experience!',
    quiz_complete: 'Quiz Completed!',
    achievement_unlock: 'Achievement Unlocked!',
    daily_login: 'Daily Login Bonus!',
    content_interaction: 'Engagement Bonus!'
  };
  return titles[activityType] || 'Points Earned!';
}

function getActivityDescription(activityType: string, points: number): string {
  const descriptions: Record<string, string> = {
    card_completion: `Earned ${points} points for completing a card`,
    poll_participation: `Earned ${points} points for participating in a poll`,
    quiz_correct: `Earned ${points} points for a correct quiz answer`,
    quiz_incorrect: `Earned ${points} points for attempting a quiz`,
    memory_collection: `Earned ${points} points for collecting a memory`,
    chapter_completion: `Earned ${points} points for completing a chapter`,
    event_participation: `Earned ${points} points for joining an event`,
    achievement_unlock: `Earned ${points} bonus points for unlocking an achievement`,
    daily_login: `Earned ${points} points for your daily login`,
    content_interaction: `Earned ${points} points for engaging with content`,
    content_share: `Earned ${points} points for sharing content`,
    video_complete: `Earned ${points} points for watching a video`,
    ar_complete: `Earned ${points} points for completing an AR experience`,
    quiz_complete: `Earned ${points} points for completing a quiz`
  };
  return descriptions[activityType] || `Earned ${points} points!`;
}

export default useFanScore;