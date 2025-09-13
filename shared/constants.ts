/**
 * Shared Constants for Achievement and Scoring System
 * 
 * This file provides a single source of truth for activity types, streak identifiers,
 * and other constants used across the achievement and scoring systems.
 * 
 * ⚠️ CRITICAL: These constants must match exactly between:
 * - API endpoints that emit scoring events
 * - Achievement seed definitions
 * - Scoring service logic
 * - Streak calculation methods
 */

/**
 * Activity Types used throughout the scoring and achievement system
 * These MUST match the activityType values emitted by API endpoints
 */
export const ACTIVITY_TYPES = {
  // Content Completion Activities
  CARD_COMPLETE: 'card_complete',
  CHAPTER_COMPLETE: 'chapter_complete',
  
  // Memory Collection Activities
  MEMORY_COLLECT: 'memory_collect',
  
  // Community Engagement Activities  
  POLL_PARTICIPATION: 'poll_participation',
  QUIZ_CORRECT: 'quiz_correct',
  QUIZ_INCORRECT: 'quiz_incorrect',
  
  // Interactive Content Activities
  AR_COMPLETE: 'ar_complete',
  VIDEO_COMPLETE: 'video_complete',
  QUIZ_COMPLETE: 'quiz_complete',
  CONTENT_SHARE: 'content_share',
  INTERACTION: 'interaction',
  
  // Login and Engagement Activities
  DAILY_LOGIN: 'daily_login',
  
  // System Activities
  ACHIEVEMENT_BONUS: 'achievement_bonus',
} as const;

/**
 * Streak Types used in streak achievements and calculation
 * These MUST match between achievement criteria and streak calculation logic
 */
export const STREAK_TYPES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
} as const;

/**
 * Achievement Criteria Types
 * Used to define different types of achievement conditions
 */
export const ACHIEVEMENT_CRITERIA_TYPES = {
  FIRST_ACHIEVEMENT: 'first_achievement',
  ACTIVITY_COUNT: 'activity_count',
  ACTIVITY_VARIETY: 'activity_variety',
  LEVEL: 'level',
  SCORE: 'score',
  STREAK: 'streak',
  TIME_BASED: 'time_based',
  PROGRESS_COMPLETION: 'progress_completion',
  SOCIAL_RANKING: 'social_ranking',
  PERFECT_SCORE: 'perfect_score',
} as const;

/**
 * Reference Types used in scoring events
 */
export const REFERENCE_TYPES = {
  CARD: 'card',
  CHAPTER: 'chapter', 
  MEMORY: 'memory',
  POLL: 'poll',
  QUIZ: 'quiz',
  LOGIN: 'login',
  VIDEO: 'video',
  AR: 'ar',
  INTERACTION: 'interaction',
} as const;

/**
 * Scope Types for fan scoring
 */
export const SCOPE_TYPES = {
  GLOBAL: 'global',
  EVENT: 'event',
  PHASE: 'phase',
  CHAPTER: 'chapter',
} as const;

/**
 * Time-based Duration Constants
 */
export const TIME_DURATIONS = {
  TODAY: 'today',
  THIS_WEEK: 'this_week',
  THIS_MONTH: 'this_month',
  FIRST_MONTH: 'first_month',
} as const;

/**
 * Memory Collection Categories
 */
export const MEMORY_CATEGORIES = {
  MOMENT: 'moment',
  ACHIEVEMENT: 'achievement',
  MILESTONE: 'milestone',
  SOCIAL: 'social',
} as const;

/**
 * Emotional Tones for memories
 */
export const EMOTIONAL_TONES = {
  POSITIVE: 'positive',
  NEUTRAL: 'neutral',
  EXCITED: 'excited',
  PROUD: 'proud',
} as const;

/**
 * Collection Triggers for memories
 */
export const COLLECTION_TRIGGERS = {
  AUTO: 'auto',
  MANUAL: 'manual',
  ACHIEVEMENT: 'achievement',
  MILESTONE: 'milestone',
} as const;

/**
 * Type definitions for TypeScript support
 */
export type ActivityType = typeof ACTIVITY_TYPES[keyof typeof ACTIVITY_TYPES];
export type StreakType = typeof STREAK_TYPES[keyof typeof STREAK_TYPES];
export type AchievementCriteriaType = typeof ACHIEVEMENT_CRITERIA_TYPES[keyof typeof ACHIEVEMENT_CRITERIA_TYPES];
export type ReferenceType = typeof REFERENCE_TYPES[keyof typeof REFERENCE_TYPES];
export type ScopeType = typeof SCOPE_TYPES[keyof typeof SCOPE_TYPES];
export type TimeDuration = typeof TIME_DURATIONS[keyof typeof TIME_DURATIONS];
export type MemoryCategory = typeof MEMORY_CATEGORIES[keyof typeof MEMORY_CATEGORIES];
export type EmotionalTone = typeof EMOTIONAL_TONES[keyof typeof EMOTIONAL_TONES];
export type CollectionTrigger = typeof COLLECTION_TRIGGERS[keyof typeof COLLECTION_TRIGGERS];

/**
 * Helper function to validate activity type
 */
export function isValidActivityType(activityType: string): activityType is ActivityType {
  return Object.values(ACTIVITY_TYPES).includes(activityType as ActivityType);
}

/**
 * Helper function to validate streak type
 */
export function isValidStreakType(streakType: string): streakType is StreakType {
  return Object.values(STREAK_TYPES).includes(streakType as StreakType);
}

/**
 * Activity Type Mappings for Legacy Support
 * These mappings help migrate from old activity type names to new standardized ones
 */
export const LEGACY_ACTIVITY_TYPE_MAPPINGS = {
  // Legacy -> New mappings
  'card_completion': ACTIVITY_TYPES.CARD_COMPLETE,
  'memory_collection': ACTIVITY_TYPES.MEMORY_COLLECT,
  'chapter_completion': ACTIVITY_TYPES.CHAPTER_COMPLETE,
  'daily_login': ACTIVITY_TYPES.DAILY_LOGIN, // This one already matches
  'weekly_activity': STREAK_TYPES.WEEKLY, // Map to streak type instead
} as const;

/**
 * Helper function to migrate legacy activity types
 */
export function migrateLegacyActivityType(legacyType: string): string {
  return LEGACY_ACTIVITY_TYPE_MAPPINGS[legacyType as keyof typeof LEGACY_ACTIVITY_TYPE_MAPPINGS] || legacyType;
}