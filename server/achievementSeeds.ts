import { db } from './db';
import { 
  achievementDefinitions,
  fanScoringRules,
  type UpsertAchievementDefinition,
  type UpsertFanScoringRule
} from '../shared/schema';
import { 
  ACTIVITY_TYPES,
  STREAK_TYPES,
  ACHIEVEMENT_CRITERIA_TYPES,
  REFERENCE_TYPES,
  TIME_DURATIONS
} from '../shared/constants';

/**
 * Comprehensive Achievement Seed Data
 * 
 * This file contains diverse achievement definitions covering:
 * - Activity-based achievements
 * - Progress-based achievements
 * - Social-based achievements  
 * - Level-based achievements
 * - Streak-based achievements
 * - Special achievements
 */

const achievementSeedData: UpsertAchievementDefinition[] = [
  // ==================== WELCOME & FIRST TIME ACHIEVEMENTS ====================
  {
    code: 'FIRST_STEPS',
    name: 'First Steps',
    description: 'Complete your first card to begin your journey',
    icon: '👶',
    criteria: {
      type: ACHIEVEMENT_CRITERIA_TYPES.FIRST_ACHIEVEMENT,
      activityType: ACTIVITY_TYPES.CARD_COMPLETE
    },
    pointsBonus: 50,
    isActive: true
  },
  {
    code: 'QUIZ_MASTER_BEGINNER', 
    name: 'Quiz Master Beginner',
    description: 'Answer your first quiz question correctly',
    icon: '🧠',
    criteria: {
      type: ACHIEVEMENT_CRITERIA_TYPES.FIRST_ACHIEVEMENT,
      activityType: ACTIVITY_TYPES.QUIZ_CORRECT
    },
    pointsBonus: 25,
    isActive: true
  },
  {
    code: 'MEMORY_COLLECTOR',
    name: 'Memory Collector',
    description: 'Collect your first memory',
    icon: '💎',
    criteria: {
      type: ACHIEVEMENT_CRITERIA_TYPES.FIRST_ACHIEVEMENT,
      activityType: ACTIVITY_TYPES.MEMORY_COLLECT
    },
    pointsBonus: 30,
    isActive: true
  },

  // ==================== ACTIVITY COUNT ACHIEVEMENTS ====================
  {
    code: 'CARD_ENTHUSIAST',
    name: 'Card Enthusiast',
    description: 'Complete 10 cards',
    icon: '📄',
    criteria: {
      type: ACHIEVEMENT_CRITERIA_TYPES.ACTIVITY_COUNT,
      activityType: ACTIVITY_TYPES.CARD_COMPLETE,
      threshold: 10
    },
    pointsBonus: 100,
    isActive: true
  },
  {
    code: 'QUIZ_CHAMPION',
    name: 'Quiz Champion',
    description: 'Answer 25 quiz questions correctly',
    icon: '🏆',
    criteria: {
      type: ACHIEVEMENT_CRITERIA_TYPES.ACTIVITY_COUNT,
      activityType: ACTIVITY_TYPES.QUIZ_CORRECT,
      threshold: 25
    },
    pointsBonus: 200,
    isActive: true
  },
  {
    code: 'POLL_PARTICIPANT',
    name: 'Voice of the Community',
    description: 'Participate in 15 polls',
    icon: '🗳️',
    criteria: {
      type: ACHIEVEMENT_CRITERIA_TYPES.ACTIVITY_COUNT,
      activityType: ACTIVITY_TYPES.POLL_PARTICIPATION,
      threshold: 15
    },
    pointsBonus: 150,
    isActive: true
  },
  {
    code: 'MEMORY_HOARDER',
    name: 'Memory Hoarder',
    description: 'Collect 50 memories',
    icon: '📦',
    criteria: {
      type: ACHIEVEMENT_CRITERIA_TYPES.ACTIVITY_COUNT,
      activityType: ACTIVITY_TYPES.MEMORY_COLLECT,
      threshold: 50
    },
    pointsBonus: 300,
    isActive: true
  },

  // ==================== PROGRESSIVE TIER ACHIEVEMENTS ====================
  {
    code: 'EXPLORER_BRONZE',
    name: 'Bronze Explorer',
    description: 'Complete 5 cards to earn your bronze explorer badge',
    icon: '🥉',
    criteria: {
      type: ACHIEVEMENT_CRITERIA_TYPES.ACTIVITY_COUNT,
      activityType: ACTIVITY_TYPES.CARD_COMPLETE,
      threshold: 5
    },
    pointsBonus: 50,
    isActive: true
  },
  {
    code: 'EXPLORER_SILVER',
    name: 'Silver Explorer',
    description: 'Complete 25 cards to earn your silver explorer badge',
    icon: '🥈',
    criteria: {
      type: ACHIEVEMENT_CRITERIA_TYPES.ACTIVITY_COUNT,
      activityType: ACTIVITY_TYPES.CARD_COMPLETE,
      threshold: 25
    },
    pointsBonus: 150,
    isActive: true
  },
  {
    code: 'EXPLORER_GOLD',
    name: 'Gold Explorer',
    description: 'Complete 100 cards to earn your gold explorer badge',
    icon: '🥇',
    criteria: {
      type: ACHIEVEMENT_CRITERIA_TYPES.ACTIVITY_COUNT,
      activityType: ACTIVITY_TYPES.CARD_COMPLETE,
      threshold: 100
    },
    pointsBonus: 500,
    isActive: true
  },

  // ==================== LEVEL-BASED ACHIEVEMENTS ====================
  {
    code: 'RISING_STAR',
    name: 'Rising Star',
    description: 'Reach level 3 to show your growing engagement',
    icon: '⭐',
    criteria: {
      type: ACHIEVEMENT_CRITERIA_TYPES.LEVEL,
      level: 3
    },
    pointsBonus: 100,
    isActive: true
  },
  {
    code: 'FAN_FAVORITE',
    name: 'Fan Favorite',
    description: 'Reach level 5 to become a community favorite',
    icon: '🌟',
    criteria: {
      type: ACHIEVEMENT_CRITERIA_TYPES.LEVEL,
      level: 5
    },
    pointsBonus: 250,
    isActive: true
  },
  {
    code: 'SUPER_FAN',
    name: 'Super Fan',
    description: 'Reach level 7 to join the elite super fan club',
    icon: '💫',
    criteria: {
      type: ACHIEVEMENT_CRITERIA_TYPES.LEVEL,
      level: 7
    },
    pointsBonus: 500,
    isActive: true
  },
  {
    code: 'LEGEND',
    name: 'Legend',
    description: 'Reach the maximum level 10 to achieve legendary status',
    icon: '👑',
    criteria: {
      type: ACHIEVEMENT_CRITERIA_TYPES.LEVEL,
      level: 10
    },
    pointsBonus: 1000,
    isActive: true
  },

  // ==================== SCORE-BASED ACHIEVEMENTS ====================
  {
    code: 'POINT_COLLECTOR',
    name: 'Point Collector',
    description: 'Accumulate 500 fan points',
    icon: '💰',
    criteria: {
      type: ACHIEVEMENT_CRITERIA_TYPES.SCORE,
      threshold: 500
    },
    pointsBonus: 100,
    isActive: true
  },
  {
    code: 'HIGH_SCORER',
    name: 'High Scorer',
    description: 'Accumulate 2000 fan points',
    icon: '🎯',
    criteria: {
      type: ACHIEVEMENT_CRITERIA_TYPES.SCORE,
      threshold: 2000
    },
    pointsBonus: 300,
    isActive: true
  },
  {
    code: 'POINT_MASTER',
    name: 'Point Master',
    description: 'Accumulate 10000 fan points',
    icon: '💎',
    criteria: {
      type: ACHIEVEMENT_CRITERIA_TYPES.SCORE,
      threshold: 10000
    },
    pointsBonus: 750,
    isActive: true
  },

  // ==================== STREAK ACHIEVEMENTS ====================
  {
    code: 'DAILY_DEDICATE',
    name: 'Daily Dedicate',
    description: 'Maintain a 3-day activity streak',
    icon: '🔥',
    criteria: {
      type: ACHIEVEMENT_CRITERIA_TYPES.STREAK,
      streakType: STREAK_TYPES.DAILY,
      threshold: 3
    },
    pointsBonus: 150,
    isActive: true
  },
  {
    code: 'STREAK_WARRIOR',
    name: 'Streak Warrior',
    description: 'Maintain a 7-day activity streak',
    icon: '⚡',
    criteria: {
      type: ACHIEVEMENT_CRITERIA_TYPES.STREAK,
      streakType: STREAK_TYPES.DAILY,
      threshold: 7
    },
    pointsBonus: 300,
    isActive: true
  },
  {
    code: 'CONSISTENCY_KING',
    name: 'Consistency King',
    description: 'Maintain a 30-day activity streak',
    icon: '🎖️',
    criteria: {
      type: ACHIEVEMENT_CRITERIA_TYPES.STREAK,
      streakType: STREAK_TYPES.DAILY,
      threshold: 30
    },
    pointsBonus: 1000,
    isActive: true
  },
  {
    code: 'WEEKLY_WARRIOR',
    name: 'Weekly Warrior',
    description: 'Stay active for 4 consecutive weeks',
    icon: '🗓️',
    criteria: {
      type: ACHIEVEMENT_CRITERIA_TYPES.STREAK,
      streakType: STREAK_TYPES.WEEKLY,
      threshold: 4
    },
    pointsBonus: 500,
    isActive: true
  },

  // ==================== PROGRESS COMPLETION ACHIEVEMENTS ====================
  {
    code: 'CHAPTER_MASTER',
    name: 'Chapter Master',
    description: 'Complete 5 chapters',
    icon: '📚',
    criteria: {
      type: ACHIEVEMENT_CRITERIA_TYPES.PROGRESS_COMPLETION,
      completionType: 'chapters',
      threshold: 5
    },
    pointsBonus: 200,
    isActive: true
  },
  {
    code: 'STORY_EXPLORER',
    name: 'Story Explorer',
    description: 'Complete 10 chapters to become a story explorer',
    icon: '🗺️',
    criteria: {
      type: ACHIEVEMENT_CRITERIA_TYPES.PROGRESS_COMPLETION,
      completionType: 'chapters',
      threshold: 10
    },
    pointsBonus: 400,
    isActive: true
  },

  // ==================== SOCIAL & RANKING ACHIEVEMENTS ====================
  {
    code: 'TOP_PERFORMER',
    name: 'Top Performer',
    description: 'Reach the top 10 on the global leaderboard',
    icon: '🏅',
    criteria: {
      type: ACHIEVEMENT_CRITERIA_TYPES.SOCIAL_RANKING,
      rankType: 'leaderboard_position',
      threshold: 10,
      scope: 'global'
    },
    pointsBonus: 500,
    isActive: true
  },
  {
    code: 'ELITE_MEMBER',
    name: 'Elite Member',
    description: 'Reach the top 5% of all users',
    icon: '👑',
    criteria: {
      type: ACHIEVEMENT_CRITERIA_TYPES.SOCIAL_RANKING,
      rankType: 'top_percentage',
      threshold: 5,
      scope: 'global'
    },
    pointsBonus: 1000,
    isActive: true
  },

  // ==================== VARIETY & ENGAGEMENT ACHIEVEMENTS ====================
  {
    code: 'WELL_ROUNDED',
    name: 'Well Rounded',
    description: 'Complete cards, participate in polls, and answer quizzes',
    icon: '🎭',
    criteria: {
      conditions: [
        {
          type: ACHIEVEMENT_CRITERIA_TYPES.ACTIVITY_COUNT,
          activityType: ACTIVITY_TYPES.CARD_COMPLETE,
          threshold: 5
        },
        {
          type: ACHIEVEMENT_CRITERIA_TYPES.ACTIVITY_COUNT,
          activityType: ACTIVITY_TYPES.POLL_PARTICIPATION,
          threshold: 3
        },
        {
          type: ACHIEVEMENT_CRITERIA_TYPES.ACTIVITY_COUNT,
          activityType: ACTIVITY_TYPES.QUIZ_CORRECT,
          threshold: 3
        }
      ],
      logic: 'AND'
    },
    pointsBonus: 300,
    isActive: true
  },
  {
    code: 'ACTIVITY_VARIETY',
    name: 'Jack of All Trades',
    description: 'Try different types of activities',
    icon: '🎪',
    criteria: {
      type: ACHIEVEMENT_CRITERIA_TYPES.ACTIVITY_VARIETY,
      requiredTypes: [ACTIVITY_TYPES.CARD_COMPLETE, ACTIVITY_TYPES.POLL_PARTICIPATION, ACTIVITY_TYPES.MEMORY_COLLECT, ACTIVITY_TYPES.QUIZ_CORRECT],
      minimumEach: 2
    },
    pointsBonus: 200,
    isActive: true
  },

  // ==================== PERFECT SCORE ACHIEVEMENTS ====================
  {
    code: 'QUIZ_PERFECTIONIST',
    name: 'Quiz Perfectionist',
    description: 'Get 10 quiz questions correct',
    icon: '💯',
    criteria: {
      type: ACHIEVEMENT_CRITERIA_TYPES.PERFECT_SCORE,
      activityType: 'quiz',
      threshold: 10
    },
    pointsBonus: 250,
    isActive: true
  },
  {
    code: 'GENIUS',
    name: 'Quiz Genius',
    description: 'Get 50 quiz questions correct',
    icon: '🧠',
    criteria: {
      type: ACHIEVEMENT_CRITERIA_TYPES.PERFECT_SCORE,
      activityType: 'quiz',
      threshold: 50
    },
    pointsBonus: 750,
    isActive: true
  },

  // ==================== TIME-BASED ACHIEVEMENTS ====================
  {
    code: 'EARLY_BIRD',
    name: 'Early Bird',
    description: 'Complete 5 activities in a single day',
    icon: '🌅',
    criteria: {
      type: ACHIEVEMENT_CRITERIA_TYPES.TIME_BASED,
      operation: 'within_period',
      duration: TIME_DURATIONS.TODAY,
      threshold: 5
    },
    pointsBonus: 100,
    isActive: true
  },
  {
    code: 'WEEKLY_CHAMPION',
    name: 'Weekly Champion',
    description: 'Complete 20 activities in a single week',
    icon: '📅',
    criteria: {
      type: ACHIEVEMENT_CRITERIA_TYPES.TIME_BASED,
      operation: 'within_period',
      duration: TIME_DURATIONS.THIS_WEEK,
      threshold: 20
    },
    pointsBonus: 300,
    isActive: true
  },

  // ==================== SPECIAL COMMEMORATIVE ACHIEVEMENTS ====================
  {
    code: 'BETA_TESTER',
    name: 'Beta Tester',
    description: 'One of the first to experience the platform',
    icon: '🚀',
    criteria: {
      type: ACHIEVEMENT_CRITERIA_TYPES.ACTIVITY_COUNT,
      activityType: ACTIVITY_TYPES.CARD_COMPLETE,
      threshold: 1,
      timeframe: TIME_DURATIONS.FIRST_MONTH
    },
    pointsBonus: 500,
    isActive: true
  },
  {
    code: 'COMMUNITY_BUILDER',
    name: 'Community Builder',
    description: 'Help build the community through diverse engagement',
    icon: '🏗️',
    criteria: {
      conditions: [
        {
          type: ACHIEVEMENT_CRITERIA_TYPES.ACTIVITY_COUNT,
          activityType: ACTIVITY_TYPES.POLL_PARTICIPATION,
          threshold: 10
        },
        {
          type: ACHIEVEMENT_CRITERIA_TYPES.ACTIVITY_COUNT,
          activityType: ACTIVITY_TYPES.MEMORY_COLLECT,
          threshold: 10
        },
        {
          type: ACHIEVEMENT_CRITERIA_TYPES.STREAK,
          streakType: STREAK_TYPES.DAILY,
          threshold: 7
        }
      ],
      logic: 'AND'
    },
    pointsBonus: 750,
    isActive: true
  }
];

// Basic scoring rules to complement achievements
const scoringRulesSeedData: UpsertFanScoringRule[] = [
  {
    activityType: ACTIVITY_TYPES.CARD_COMPLETE,
    points: 10,
    maxPerDay: 50,
    isActive: true,
    metadata: { category: 'content_engagement' }
  },
  {
    activityType: ACTIVITY_TYPES.POLL_PARTICIPATION,
    points: 5,
    maxPerDay: 20,
    isActive: true,
    metadata: { category: 'community_engagement' }
  },
  {
    activityType: ACTIVITY_TYPES.QUIZ_CORRECT,
    points: 15,
    maxPerDay: 30,
    isActive: true,
    metadata: { category: 'knowledge_demonstration' }
  },
  {
    activityType: ACTIVITY_TYPES.QUIZ_INCORRECT,
    points: 3,
    maxPerDay: 30,
    isActive: true,
    metadata: { category: 'learning_attempt' }
  },
  {
    activityType: ACTIVITY_TYPES.MEMORY_COLLECT,
    points: 8,
    maxPerDay: 25,
    isActive: true,
    metadata: { category: 'collection' }
  },
  {
    activityType: ACTIVITY_TYPES.CHAPTER_COMPLETE,
    points: 50,
    maxPerDay: 10,
    isActive: true,
    metadata: { category: 'major_milestone' }
  },
  {
    activityType: ACTIVITY_TYPES.ACHIEVEMENT_BONUS,
    points: 0, // Will be set by the achievement itself
    isActive: true,
    metadata: { category: 'bonus_points' }
  },
  {
    activityType: ACTIVITY_TYPES.DAILY_LOGIN,
    points: 5,
    maxPerDay: 1,
    isActive: true,
    metadata: { category: 'engagement' }
  }
];

/**
 * Initialize achievement system with comprehensive seed data
 */
export async function seedAchievements(): Promise<{
  achievementsCreated: number;
  rulesCreated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let achievementsCreated = 0;
  let rulesCreated = 0;

  try {
    console.log('🌱 Seeding achievement definitions...');
    
    // Insert achievement definitions
    for (const achievement of achievementSeedData) {
      try {
        await db.insert(achievementDefinitions)
          .values(achievement)
          .onConflictDoUpdate({
            target: [achievementDefinitions.code],
            set: {
              name: achievement.name,
              description: achievement.description,
              icon: achievement.icon,
              criteria: achievement.criteria,
              pointsBonus: achievement.pointsBonus,
              isActive: achievement.isActive,
              updatedAt: new Date()
            }
          });
        achievementsCreated++;
      } catch (error) {
        errors.push(`Failed to create achievement ${achievement.code}: ${error}`);
      }
    }

    console.log('🌱 Seeding scoring rules...');
    
    // Insert scoring rules
    for (const rule of scoringRulesSeedData) {
      try {
        await db.insert(fanScoringRules)
          .values(rule)
          .onConflictDoUpdate({
            target: [fanScoringRules.activityType, fanScoringRules.eventId, fanScoringRules.phase, fanScoringRules.chapterId, fanScoringRules.cardIndex],
            set: {
              points: rule.points,
              maxPerDay: rule.maxPerDay,
              isActive: rule.isActive,
              metadata: rule.metadata,
              updatedAt: new Date()
            }
          });
        rulesCreated++;
      } catch (error) {
        errors.push(`Failed to create scoring rule for ${rule.activityType}: ${error}`);
      }
    }

    console.log(`✅ Achievement seeding completed:`);
    console.log(`   - ${achievementsCreated} achievements created/updated`);
    console.log(`   - ${rulesCreated} scoring rules created/updated`);
    
    if (errors.length > 0) {
      console.log(`⚠️  ${errors.length} errors occurred during seeding`);
      errors.forEach(error => console.log(`   - ${error}`));
    }

    return { achievementsCreated, rulesCreated, errors };

  } catch (error) {
    console.error('❌ Critical error during achievement seeding:', error);
    throw error;
  }
}

/**
 * Clear all achievement data (useful for testing)
 */
export async function clearAchievements(): Promise<void> {
  console.log('🧹 Clearing achievement data...');
  
  try {
    await db.delete(achievementDefinitions);
    await db.delete(fanScoringRules);
    console.log('✅ Achievement data cleared');
  } catch (error) {
    console.error('❌ Error clearing achievement data:', error);
    throw error;
  }
}

// Export seed data for testing and reference
export { achievementSeedData, scoringRulesSeedData };