// Fan Score system TypeScript interfaces

export interface FanScoreData {
  currentScore: {
    scopeType: string;
    scopeId: string;
    totalScore: number;
    level: number;
    nextLevel: number | null;
    pointsToNextLevel: number;
    leaderboardPosition: number;
  };
  allScopes: Array<{
    scopeType: string;
    scopeId: string;
    totalScore: number;
    level: number;
  }>;
  achievements: {
    unlocked: number;
    total: number;
  };
  statistics: {
    totalPointsEarned: number;
    totalActivities: number;
  };
  recentEvents?: Array<{
    id: string;
    activityType: string;
    points: number;
    referenceType: string;
    referenceId: string;
    eventId: string | null;
    chapterId: string | null;
    cardIndex: number | null;
    phase: string | null;
    createdAt: Date | null;
    metadata: Record<string, any>;
  }>;
}

export interface LeaderboardEntry {
  userId: string;
  totalScore: number;
  level: number;
  position: number;
  user?: {
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  };
}

export interface AchievementDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  icon?: string;
  criteria: Record<string, any>;
  pointsBonus: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  awardedAt: Date;
  achievement?: AchievementDefinition;
}

export interface LevelThreshold {
  level: number;
  minScore: number;
  maxScore?: number;
}

export const LEVEL_THRESHOLDS: LevelThreshold[] = [
  { level: 1, minScore: 0, maxScore: 99 },
  { level: 2, minScore: 100, maxScore: 249 },
  { level: 3, minScore: 250, maxScore: 499 },
  { level: 4, minScore: 500, maxScore: 999 },
  { level: 5, minScore: 1000, maxScore: 1999 },
  { level: 6, minScore: 2000, maxScore: 3999 },
  { level: 7, minScore: 4000, maxScore: 7999 },
  { level: 8, minScore: 8000, maxScore: 15999 },
  { level: 9, minScore: 16000, maxScore: 31999 },
  { level: 10, minScore: 32000 }, // No max for highest level
];

export interface ScoreToastData {
  points: number;
  activityType: string;
  title?: string;
  description?: string;
  icon?: string;
  color?: string;
  duration?: number;
}

export interface FanScoreContextType {
  scoreData: FanScoreData | null;
  loading: boolean;
  error: string | null;
  refreshScore: () => Promise<void>;
  showToast: (toastData: ScoreToastData) => void;
}

export type ActivityType = 
  | 'card_completion'
  | 'poll_participation' 
  | 'quiz_correct'
  | 'quiz_incorrect'
  | 'memory_collection'
  | 'chapter_completion'
  | 'event_participation'
  | 'achievement_unlock'
  | 'daily_login'
  | 'content_interaction'
  | 'content_share'
  | 'video_complete'
  | 'ar_complete'
  | 'quiz_complete';

export interface ActivityTypeConfig {
  icon: string;
  color: string;
  label: string;
  emoji: string;
}

export const ACTIVITY_CONFIGS: Record<ActivityType, ActivityTypeConfig> = {
  card_completion: {
    icon: 'card',
    color: '#3B82F6',
    label: 'Card Completed',
    emoji: '📄'
  },
  poll_participation: {
    icon: 'poll',
    color: '#8B5CF6',
    label: 'Poll Answered',
    emoji: '📊'
  },
  quiz_correct: {
    icon: 'quiz',
    color: '#10B981',
    label: 'Quiz Correct',
    emoji: '✅'
  },
  quiz_incorrect: {
    icon: 'quiz',
    color: '#F59E0B',
    label: 'Quiz Attempted',
    emoji: '❌'
  },
  memory_collection: {
    icon: 'memory',
    color: '#EC4899',
    label: 'Memory Collected',
    emoji: '💎'
  },
  chapter_completion: {
    icon: 'chapter',
    color: '#6366F1',
    label: 'Chapter Completed',
    emoji: '📚'
  },
  event_participation: {
    icon: 'event',
    color: '#F97316',
    label: 'Event Joined',
    emoji: '🎪'
  },
  achievement_unlock: {
    icon: 'achievement',
    color: '#FFD700',
    label: 'Achievement Unlocked',
    emoji: '🏆'
  },
  daily_login: {
    icon: 'login',
    color: '#059669',
    label: 'Daily Login',
    emoji: '📅'
  },
  content_interaction: {
    icon: 'interaction',
    color: '#7C3AED',
    label: 'Content Interaction',
    emoji: '👆'
  },
  content_share: {
    icon: 'share',
    color: '#06B6D4',
    label: 'Content Shared',
    emoji: '🔗'
  },
  video_complete: {
    icon: 'video',
    color: '#EF4444',
    label: 'Video Watched',
    emoji: '🎥'
  },
  ar_complete: {
    icon: 'ar',
    color: '#8B5CF6',
    label: 'AR Experience',
    emoji: '🥽'
  },
  quiz_complete: {
    icon: 'quiz',
    color: '#22C55E',
    label: 'Quiz Completed',
    emoji: '🧠'
  }
};