import {
  fanScoringRules,
  fanScoreEvents,
  userFanScores,
  achievementDefinitions,
  userAchievements,
  userProgress,
  polls,
  pollResponses,
  type FanScoringRule,
  type UpsertFanScoreEvent,
  type UpsertUserFanScore,
  type AchievementDefinition,
  type UpsertUserAchievement,
} from "../shared/schema";
import { ACTIVITY_TYPES, STREAK_TYPES, ACHIEVEMENT_CRITERIA_TYPES } from "../shared/constants";
import { db } from "./db";
import { eq, and, sql, desc, count, sum } from "drizzle-orm";
import { webSocketManager } from "./websocket";

// Types for the scoring service
export interface AwardContext {
  activityType: string;
  referenceType: string;
  referenceId: string;
  eventId?: string;
  chapterId?: string;
  cardIndex?: number;
  phase?: string;
  metadata?: Record<string, any>;
}

export interface AwardResult {
  success: boolean;
  pointsAwarded: number;
  newTotalScore: number;
  newLevel: number;
  newAchievements: AchievementDefinition[];
  error?: string;
}

export interface LevelThreshold {
  level: number;
  minScore: number;
  maxScore?: number;
}

// Level thresholds configuration - can be made configurable later
const LEVEL_THRESHOLDS: LevelThreshold[] = [
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

export class ScoringService {
  /**
   * Main scoring function - awards points for user activities
   */
  async award(userId: string, context: AwardContext): Promise<AwardResult> {
    try {
      // Start a transaction for data consistency
      return await db.transaction(async (tx) => {
        // 1. Fetch the effective scoring rule
        const rule = await this.findScoringRule(context);
        if (!rule) {
          return {
            success: false,
            pointsAwarded: 0,
            newTotalScore: 0,
            newLevel: 1,
            newAchievements: [],
            error: `No scoring rule found for activity type: ${context.activityType}`,
          };
        }

        // 2. Check daily caps
        const canAward = await this.checkDailyCap(userId, rule, tx);
        if (!canAward) {
          return {
            success: false,
            pointsAwarded: 0,
            newTotalScore: 0,
            newLevel: 1,
            newAchievements: [],
            error: "Daily cap reached for this activity type",
          };
        }

        // 3. Generate idempotency key to prevent duplicate scoring
        const idempotencyKey = this.generateIdempotencyKey(context);

        // 4. Create score event with idempotency protection
        const scoreEvent: UpsertFanScoreEvent = {
          userId,
          activityType: context.activityType,
          points: rule.points,
          referenceType: context.referenceType,
          referenceId: context.referenceId,
          eventId: context.eventId,
          chapterId: context.chapterId,
          cardIndex: context.cardIndex,
          phase: context.phase,
          idempotencyKey,
          metadata: context.metadata,
        };

        try {
          await tx.insert(fanScoreEvents).values(scoreEvent);
        } catch (error: any) {
          // Handle duplicate key error (idempotency violation)
          if (error.code === '23505') { // PostgreSQL unique violation
            return {
              success: false,
              pointsAwarded: 0,
              newTotalScore: 0,
              newLevel: 1,
              newAchievements: [],
              error: "Points already awarded for this activity",
            };
          }
          throw error;
        }

        // 5. Update user fan scores for different scopes atomically
        const scopes = this.determineScopeUpdates(context);
        let globalScore = 0;

        for (const scope of scopes) {
          // Use atomic increment to avoid race conditions
          const result = await tx
            .insert(userFanScores)
            .values({
              userId,
              scopeType: scope.scopeType,
              scopeId: scope.scopeId,
              totalScore: rule.points,
              level: this.computeLevel(rule.points),
              stats: {},
            } as UpsertUserFanScore)
            .onConflictDoUpdate({
              target: [userFanScores.userId, userFanScores.scopeType, userFanScores.scopeId],
              set: {
                totalScore: sql`${userFanScores.totalScore} + ${rule.points}`,
                level: sql`(
                  CASE 
                    WHEN ${userFanScores.totalScore} + ${rule.points} >= 32000 THEN 10
                    WHEN ${userFanScores.totalScore} + ${rule.points} >= 16000 THEN 9
                    WHEN ${userFanScores.totalScore} + ${rule.points} >= 8000 THEN 8
                    WHEN ${userFanScores.totalScore} + ${rule.points} >= 4000 THEN 7
                    WHEN ${userFanScores.totalScore} + ${rule.points} >= 2000 THEN 6
                    WHEN ${userFanScores.totalScore} + ${rule.points} >= 1000 THEN 5
                    WHEN ${userFanScores.totalScore} + ${rule.points} >= 500 THEN 4
                    WHEN ${userFanScores.totalScore} + ${rule.points} >= 250 THEN 3
                    WHEN ${userFanScores.totalScore} + ${rule.points} >= 100 THEN 2
                    ELSE 1
                  END
                )`,
                updatedAt: sql`NOW()`,
              },
            })
            .returning({
              totalScore: userFanScores.totalScore,
              level: userFanScores.level,
            });

          // Get the updated score for global scope
          if (scope.scopeType === 'global') {
            // Since we used atomic increment, get the final score
            const [updatedRecord] = await tx
              .select({ totalScore: userFanScores.totalScore, level: userFanScores.level })
              .from(userFanScores)
              .where(
                and(
                  eq(userFanScores.userId, userId),
                  eq(userFanScores.scopeType, 'global'),
                  eq(userFanScores.scopeId, 'global')
                )
              );
            globalScore = updatedRecord?.totalScore || rule.points;
          }
        }

        // 6. Update streak data
        await this.updateStreakData(userId, tx);

        // 7. Evaluate achievements
        const newAchievements = await this.evaluateAchievements(userId, globalScore, tx);

        const result = {
          success: true,
          pointsAwarded: rule.points,
          newTotalScore: globalScore,
          newLevel: this.computeLevel(globalScore),
          newAchievements,
        };

        // 8. Emit WebSocket updates for real-time UI updates
        try {
          const wsManager = webSocketManager;
          
          // Send score update notification
          wsManager.sendNotificationToUser(userId, {
            type: 'fan_score_update',
            payload: {
              activityType: context.activityType,
              pointsAwarded: rule.points,
              newTotalScore: globalScore,
              newLevel: this.computeLevel(globalScore),
              newAchievements: newAchievements.length,
              context
            }
          });

          // Send celebratory achievement notifications for each new achievement
          for (const achievement of newAchievements) {
            wsManager.sendNotificationToUser(userId, {
              type: 'achievement_unlocked',
              payload: {
                achievement: {
                  id: achievement.id,
                  code: achievement.code,
                  name: achievement.name,
                  description: achievement.description,
                  icon: achievement.icon,
                  pointsBonus: achievement.pointsBonus
                },
                triggerActivity: {
                  type: context.activityType,
                  points: rule.points
                },
                userStats: {
                  totalScore: globalScore,
                  level: this.computeLevel(globalScore)
                },
                celebrationType: this.determineCelebrationType(achievement),
                timestamp: new Date().toISOString()
              }
            });
          }
        } catch (wsError) {
          console.error('Failed to send WebSocket update:', wsError);
          // Don't fail the scoring if WebSocket fails
        }

        return result;
      });
    } catch (error) {
      console.error('Error in scoring service award:', error);
      return {
        success: false,
        pointsAwarded: 0,
        newTotalScore: 0,
        newLevel: 1,
        newAchievements: [],
        error: 'Internal server error',
      };
    }
  }

  /**
   * Compute user level based on total score
   */
  computeLevel(totalScore: number): number {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      const threshold = LEVEL_THRESHOLDS[i];
      if (totalScore >= threshold.minScore && 
          (threshold.maxScore === undefined || totalScore <= threshold.maxScore)) {
        return threshold.level;
      }
    }
    return 1; // Default to level 1
  }

  /**
   * Evaluate and award new achievements
   */
  async evaluateAchievements(userId: string, totalScore: number, tx?: any): Promise<AchievementDefinition[]> {
    const dbConnection = tx || db;
    const newAchievements: AchievementDefinition[] = [];

    try {
      // Get all active achievement definitions
      const achievements = await dbConnection
        .select()
        .from(achievementDefinitions)
        .where(eq(achievementDefinitions.isActive, true));

      // Get user's current achievements to avoid duplicates
      const userAchievementIds = await dbConnection
        .select({ achievementId: userAchievements.achievementId })
        .from(userAchievements)
        .where(eq(userAchievements.userId, userId));
      
      const earnedAchievementIds = new Set(userAchievementIds.map((ua: { achievementId: string }) => ua.achievementId));

      // Evaluate each achievement
      for (const achievement of achievements) {
        if (earnedAchievementIds.has(achievement.id)) {
          continue; // User already has this achievement
        }

        const earned = await this.checkAchievementCriteria(userId, achievement, totalScore, dbConnection);
        if (earned) {
          // Award the achievement idempotently to prevent duplicate key errors
          try {
            await dbConnection.insert(userAchievements).values({
              userId,
              achievementId: achievement.id,
            } as UpsertUserAchievement)
            .onConflictDoNothing();

            newAchievements.push(achievement);
          } catch (error: any) {
            // Handle any remaining edge cases gracefully
            if (error.code !== '23505') { // If not unique violation, re-throw
              throw error;
            }
            // If unique violation despite onConflictDoNothing, just continue
            console.log(`Achievement ${achievement.id} already awarded to user ${userId}`);
          }

          // Award bonus points if specified
          if (achievement.pointsBonus > 0) {
            await this.awardBonusPoints(userId, achievement.pointsBonus, achievement.id, dbConnection);
          }
        }
      }

      return newAchievements;
    } catch (error) {
      console.error('Error evaluating achievements:', error);
      return [];
    }
  }

  /**
   * Get user's current score for a specific scope
   */
  async getCurrentScore(userId: string, scopeType: string, scopeId: string, tx?: any): Promise<number> {
    const dbConnection = tx || db;
    
    const [userScore] = await dbConnection
      .select({ totalScore: userFanScores.totalScore })
      .from(userFanScores)
      .where(
        and(
          eq(userFanScores.userId, userId),
          eq(userFanScores.scopeType, scopeType),
          eq(userFanScores.scopeId, scopeId)
        )
      );

    return userScore?.totalScore || 0;
  }

  /**
   * Get user's leaderboard position for a scope
   */
  async getLeaderboardPosition(userId: string, scopeType: string, scopeId: string): Promise<number> {
    // Use a subquery to compute rankings for all users in the scope, then find the specific user's position
    const [result] = await db
      .select({ 
        position: sql<number>`position`
      })
      .from(
        sql<{ userId: string; position: number }>`(
          SELECT 
            ${userFanScores.userId} as user_id,
            ROW_NUMBER() OVER (ORDER BY ${userFanScores.totalScore} DESC) as position
          FROM ${userFanScores}
          WHERE ${userFanScores.scopeType} = ${scopeType} 
            AND ${userFanScores.scopeId} = ${scopeId}
        ) as ranked_users`
      )
      .where(sql`user_id = ${userId}`);

    return result?.position || 0;
  }

  /**
   * Get leaderboard for a specific scope
   */
  async getLeaderboard(scopeType: string, scopeId: string, limit: number = 10): Promise<any[]> {
    return await db
      .select({
        userId: userFanScores.userId,
        totalScore: userFanScores.totalScore,
        level: userFanScores.level,
        position: sql<number>`ROW_NUMBER() OVER (ORDER BY ${userFanScores.totalScore} DESC)`.as('position')
      })
      .from(userFanScores)
      .where(
        and(
          eq(userFanScores.scopeType, scopeType),
          eq(userFanScores.scopeId, scopeId)
        )
      )
      .orderBy(desc(userFanScores.totalScore))
      .limit(limit);
  }

  // Private helper methods

  private async findScoringRule(context: AwardContext): Promise<FanScoringRule | null> {
    // Build query conditions dynamically based on context
    const conditions = [
      eq(fanScoringRules.activityType, context.activityType),
      eq(fanScoringRules.isActive, true),
    ];

    // Add optional filters if they exist in context
    if (context.eventId) {
      conditions.push(eq(fanScoringRules.eventId, context.eventId));
    }
    if (context.phase) {
      conditions.push(eq(fanScoringRules.phase, context.phase));
    }
    if (context.chapterId) {
      conditions.push(eq(fanScoringRules.chapterId, context.chapterId));
    }
    if (context.cardIndex !== undefined) {
      conditions.push(eq(fanScoringRules.cardIndex, context.cardIndex));
    }

    // Try to find the most specific rule first
    const [rule] = await db
      .select()
      .from(fanScoringRules)
      .where(and(...conditions))
      .orderBy(desc(fanScoringRules.createdAt))
      .limit(1);

    if (rule) {
      return rule;
    }

    // If no specific rule found, try general rules (without event/phase/chapter filters)
    const [generalRule] = await db
      .select()
      .from(fanScoringRules)
      .where(
        and(
          eq(fanScoringRules.activityType, context.activityType),
          eq(fanScoringRules.isActive, true),
          sql`${fanScoringRules.eventId} IS NULL`,
          sql`${fanScoringRules.phase} IS NULL`,
          sql`${fanScoringRules.chapterId} IS NULL`,
          sql`${fanScoringRules.cardIndex} IS NULL`
        )
      )
      .limit(1);

    return generalRule || null;
  }

  private async checkDailyCap(userId: string, rule: FanScoringRule, tx?: any): Promise<boolean> {
    if (!rule.maxPerDay) {
      return true; // No daily cap
    }

    const dbConnection = tx || db;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [dailyCount] = await dbConnection
      .select({ count: count() })
      .from(fanScoreEvents)
      .where(
        and(
          eq(fanScoreEvents.userId, userId),
          eq(fanScoreEvents.activityType, rule.activityType),
          sql`${fanScoreEvents.createdAt} >= ${today}`,
          sql`${fanScoreEvents.createdAt} < ${tomorrow}`
        )
      );

    return (dailyCount?.count || 0) < rule.maxPerDay;
  }

  private generateIdempotencyKey(context: AwardContext): string {
    // Create a unique key based on activity and reference
    const parts = [
      context.activityType,
      context.referenceType,
      context.referenceId,
    ];
    
    if (context.eventId) parts.push(`event:${context.eventId}`);
    if (context.chapterId) parts.push(`chapter:${context.chapterId}`);
    if (context.cardIndex !== undefined) parts.push(`card:${context.cardIndex}`);
    if (context.phase) parts.push(`phase:${context.phase}`);

    return parts.join('|');
  }

  private determineScopeUpdates(context: AwardContext): Array<{scopeType: string, scopeId: string}> {
    const scopes = [
      { scopeType: 'global', scopeId: 'global' }
    ];

    if (context.eventId) {
      scopes.push({ scopeType: 'event', scopeId: context.eventId });
    }

    if (context.phase) {
      scopes.push({ scopeType: 'phase', scopeId: context.phase });
    }

    return scopes;
  }

  private async checkAchievementCriteria(
    userId: string, 
    achievement: AchievementDefinition, 
    totalScore: number, 
    tx?: any
  ): Promise<boolean> {
    try {
      const criteria = achievement.criteria as any;
      const dbConnection = tx || db;
      
      // Handle simple single-condition achievements
      if (criteria.type) {
        return await this.evaluateSingleCriteria(userId, criteria, totalScore, dbConnection);
      }

      // Handle complex multi-condition achievements
      if (criteria.conditions && Array.isArray(criteria.conditions)) {
        return await this.evaluateMultiConditionCriteria(userId, criteria, totalScore, dbConnection);
      }

      console.warn(`Unknown achievement criteria format for achievement ${achievement.id}:`, criteria);
      return false;
    } catch (error) {
      console.error('Error checking achievement criteria:', error);
      return false;
    }
  }

  private async evaluateSingleCriteria(
    userId: string,
    criteria: any,
    totalScore: number,
    dbConnection: any
  ): Promise<boolean> {
    switch (criteria.type) {
      case ACHIEVEMENT_CRITERIA_TYPES.SCORE:
        return totalScore >= criteria.threshold;

      case ACHIEVEMENT_CRITERIA_TYPES.LEVEL:
        const currentLevel = this.computeLevel(totalScore);
        return currentLevel >= criteria.level;

      case ACHIEVEMENT_CRITERIA_TYPES.ACTIVITY_COUNT:
        return await this.checkActivityCount(userId, criteria, dbConnection);

      case ACHIEVEMENT_CRITERIA_TYPES.ACTIVITY_VARIETY:
        return await this.checkActivityVariety(userId, criteria, dbConnection);

      case ACHIEVEMENT_CRITERIA_TYPES.TIME_BASED:
        return await this.checkTimeBased(userId, criteria, dbConnection);

      case ACHIEVEMENT_CRITERIA_TYPES.STREAK:
        return await this.checkStreak(userId, criteria, dbConnection);

      case ACHIEVEMENT_CRITERIA_TYPES.PROGRESS_COMPLETION:
        return await this.checkProgressCompletion(userId, criteria, dbConnection);

      case ACHIEVEMENT_CRITERIA_TYPES.SOCIAL_RANKING:
        return await this.checkSocialRanking(userId, criteria, dbConnection);

      case ACHIEVEMENT_CRITERIA_TYPES.PERFECT_SCORE:
        return await this.checkPerfectScore(userId, criteria, dbConnection);

      case ACHIEVEMENT_CRITERIA_TYPES.FIRST_ACHIEVEMENT:
        return await this.checkFirstAchievement(userId, criteria, dbConnection);

      default:
        console.warn(`Unknown criteria type: ${criteria.type}`);
        return false;
    }
  }

  private async evaluateMultiConditionCriteria(
    userId: string,
    criteria: any,
    totalScore: number,
    dbConnection: any
  ): Promise<boolean> {
    const { conditions, logic = 'AND' } = criteria;
    const results: boolean[] = [];

    for (const condition of conditions) {
      const result = await this.evaluateSingleCriteria(userId, condition, totalScore, dbConnection);
      results.push(result);
    }

    if (logic === 'OR') {
      return results.some(result => result);
    } else {
      return results.every(result => result);
    }
  }

  // Individual criteria evaluation methods
  private async checkActivityCount(userId: string, criteria: any, dbConnection: any): Promise<boolean> {
    const { activityType, threshold, timeframe } = criteria;
    
    let whereConditions = [
      eq(fanScoreEvents.userId, userId)
    ];
    
    if (activityType) {
      whereConditions.push(eq(fanScoreEvents.activityType, activityType));
    }
    
    // Add time constraints if specified
    if (timeframe) {
      const timeConstraint = this.getTimeConstraint(timeframe);
      if (timeConstraint) {
        whereConditions.push(sql`${fanScoreEvents.createdAt} >= ${timeConstraint}`);
      }
    }
    
    const [result] = await dbConnection
      .select({ count: count() })
      .from(fanScoreEvents)
      .where(and(...whereConditions));
    
    return (result?.count || 0) >= threshold;
  }

  private async checkActivityVariety(userId: string, criteria: any, dbConnection: any): Promise<boolean> {
    const { requiredTypes, minimumEach, timeframe } = criteria;
    
    for (const activityType of requiredTypes) {
      let whereConditions = [
        eq(fanScoreEvents.userId, userId),
        eq(fanScoreEvents.activityType, activityType)
      ];
      
      if (timeframe) {
        const timeConstraint = this.getTimeConstraint(timeframe);
        if (timeConstraint) {
          whereConditions.push(sql`${fanScoreEvents.createdAt} >= ${timeConstraint}`);
        }
      }
      
      const [result] = await dbConnection
        .select({ count: count() })
        .from(fanScoreEvents)
        .where(and(...whereConditions));
      
      if ((result?.count || 0) < (minimumEach || 1)) {
        return false;
      }
    }
    
    return true;
  }

  private async checkTimeBased(userId: string, criteria: any, dbConnection: any): Promise<boolean> {
    const { type, duration, threshold } = criteria;
    
    if (type === 'consecutive_days') {
      return await this.checkConsecutiveDays(userId, duration, dbConnection);
    } else if (type === 'within_period') {
      const timeConstraint = this.getTimeConstraint(duration);
      if (!timeConstraint) return false;
      
      const [result] = await dbConnection
        .select({ count: count() })
        .from(fanScoreEvents)
        .where(
          and(
            eq(fanScoreEvents.userId, userId),
            sql`${fanScoreEvents.createdAt} >= ${timeConstraint}`
          )
        );
      
      return (result?.count || 0) >= threshold;
    }
    
    return false;
  }

  private async checkStreak(userId: string, criteria: any, dbConnection: any): Promise<boolean> {
    const { streakType, threshold } = criteria;
    
    if (streakType === STREAK_TYPES.DAILY) {
      return await this.checkDailyStreak(userId, threshold, dbConnection);
    } else if (streakType === STREAK_TYPES.WEEKLY) {
      return await this.checkWeeklyStreak(userId, threshold, dbConnection);
    }
    
    return false;
  }

  private async checkProgressCompletion(userId: string, criteria: any, dbConnection: any): Promise<boolean> {
    const { completionType, threshold } = criteria;
    
    if (completionType === 'chapters') {
      // Count distinct chapters completed
      const [result] = await dbConnection
        .select({ count: sql<number>`COUNT(DISTINCT ${userProgress.chapterId})` })
        .from(userProgress)
        .where(eq(userProgress.userId, userId));
      
      return (result?.count || 0) >= threshold;
    } else if (completionType === 'cards') {
      const [result] = await dbConnection
        .select({ count: count() })
        .from(userProgress)
        .where(eq(userProgress.userId, userId));
      
      return (result?.count || 0) >= threshold;
    }
    
    return false;
  }

  private async checkSocialRanking(userId: string, criteria: any, dbConnection: any): Promise<boolean> {
    const { rankType, threshold, scope = 'global' } = criteria;
    
    if (rankType === 'leaderboard_position') {
      const position = await this.getLeaderboardPosition(userId, scope, 'global');
      return position > 0 && position <= threshold;
    } else if (rankType === 'top_percentage') {
      // Calculate total users and user's position
      const [totalUsers] = await dbConnection
        .select({ count: count() })
        .from(userFanScores)
        .where(
          and(
            eq(userFanScores.scopeType, scope),
            eq(userFanScores.scopeId, 'global')
          )
        );
      
      const position = await this.getLeaderboardPosition(userId, scope, 'global');
      if (position === 0 || !totalUsers?.count) return false;
      
      const percentile = (position / totalUsers.count) * 100;
      return percentile <= threshold;
    }
    
    return false;
  }

  private async checkPerfectScore(userId: string, criteria: any, dbConnection: any): Promise<boolean> {
    const { activityType, threshold } = criteria;
    
    // This would need to track perfect scores in quiz responses or similar
    // For now, we'll check if user has correct quiz responses
    if (activityType === 'quiz') {
      const [result] = await dbConnection
        .select({ count: count() })
        .from(pollResponses)
        .innerJoin(polls, eq(pollResponses.pollId, polls.id))
        .where(
          and(
            eq(pollResponses.userId, userId),
            eq(polls.pollType, 'quiz'),
            eq(pollResponses.isCorrect, true)
          )
        );
      
      return (result?.count || 0) >= threshold;
    }
    
    return false;
  }

  private async checkFirstAchievement(userId: string, criteria: any, dbConnection: any): Promise<boolean> {
    const { activityType } = criteria;
    
    // Check if user has at least one activity of this type
    // First achievements should be awarded if user has any events of the specified type
    // The duplicates prevention is handled by the achievement evaluation loop
    const [result] = await dbConnection
      .select({ count: count() })
      .from(fanScoreEvents)
      .where(
        and(
          eq(fanScoreEvents.userId, userId),
          eq(fanScoreEvents.activityType, activityType)
        )
      );
    
    return (result?.count || 0) >= 1; // At least one event means criteria is met
  }

  // Helper methods for time calculations
  private getTimeConstraint(timeframe: string): Date | null {
    const now = new Date();
    
    switch (timeframe) {
      case 'today':
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        return today;
      case 'this_week':
        const thisWeek = new Date(now);
        const day = thisWeek.getDay();
        const diff = thisWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
        thisWeek.setDate(diff);
        thisWeek.setHours(0, 0, 0, 0);
        return thisWeek;
      case 'this_month':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'last_7_days':
        const sevenDays = new Date(now);
        sevenDays.setDate(sevenDays.getDate() - 7);
        return sevenDays;
      case 'last_30_days':
        const thirtyDays = new Date(now);
        thirtyDays.setDate(thirtyDays.getDate() - 30);
        return thirtyDays;
      default:
        return null;
    }
  }

  private async checkConsecutiveDays(userId: string, days: number, dbConnection: any): Promise<boolean> {
    // Get user activities grouped by date for the last specified days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const activities = await dbConnection
      .select({
        date: sql<string>`DATE(${fanScoreEvents.createdAt})`,
        count: count()
      })
      .from(fanScoreEvents)
      .where(
        and(
          eq(fanScoreEvents.userId, userId),
          sql`${fanScoreEvents.createdAt} >= ${startDate}`
        )
      )
      .groupBy(sql`DATE(${fanScoreEvents.createdAt})`)
      .orderBy(sql`DATE(${fanScoreEvents.createdAt}) DESC`);
    
    if (activities.length < days) return false;
    
    // Check for consecutive days
    let consecutiveCount = 0;
    let expectedDate = new Date();
    expectedDate.setHours(0, 0, 0, 0);
    
    for (const activity of activities) {
      const activityDate = new Date(activity.date);
      const expectedDateStr = expectedDate.toISOString().split('T')[0];
      
      if (activityDate.toISOString().split('T')[0] === expectedDateStr) {
        consecutiveCount++;
        expectedDate.setDate(expectedDate.getDate() - 1);
        
        if (consecutiveCount >= days) {
          return true;
        }
      } else {
        break; // Not consecutive
      }
    }
    
    return false;
  }

  private async checkDailyStreak(userId: string, threshold: number, dbConnection: any): Promise<boolean> {
    const streakData = await this.calculateCurrentStreak(userId, 'daily', dbConnection);
    return streakData.currentStreak >= threshold;
  }

  private async checkWeeklyStreak(userId: string, threshold: number, dbConnection: any): Promise<boolean> {
    const streakData = await this.calculateCurrentStreak(userId, 'weekly', dbConnection);
    return streakData.currentStreak >= threshold;
  }

  /**
   * Calculate current and longest streak for a user
   */
  public async calculateCurrentStreak(userId: string, type: 'daily' | 'weekly', dbConnection?: any): Promise<{
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: Date | null;
  }> {
    const dbConn = dbConnection || db;
    const timeUnit = type === 'daily' ? 'day' : 'week';
    
    // Get user activities grouped by time period
    const activities = await dbConn
      .select({
        period: sql<string>`DATE_TRUNC('${sql.raw(timeUnit)}', ${fanScoreEvents.createdAt})`,
        count: count()
      })
      .from(fanScoreEvents)
      .where(eq(fanScoreEvents.userId, userId))
      .groupBy(sql`DATE_TRUNC('${sql.raw(timeUnit)}', ${fanScoreEvents.createdAt})`)
      .orderBy(sql`DATE_TRUNC('${sql.raw(timeUnit)}', ${fanScoreEvents.createdAt}) DESC`);

    if (activities.length === 0) {
      return { currentStreak: 0, longestStreak: 0, lastActivityDate: null };
    }

    const periods = activities.map(a => new Date(a.period));
    const lastActivityDate = periods[0];

    // Calculate current streak from most recent activity
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    
    const now = new Date();
    let expectedDate = this.getStartOfPeriod(now, type);
    
    // Check if there's activity today/this week
    const todayPeriod = this.getStartOfPeriod(now, type);
    const hasActivityToday = periods.some(date => 
      date.getTime() === todayPeriod.getTime()
    );
    
    // If no activity today, start from yesterday/last week
    if (!hasActivityToday) {
      expectedDate = this.subtractPeriod(expectedDate, 1, type);
    }

    // Calculate current streak
    for (const activityDate of periods) {
      if (activityDate.getTime() === expectedDate.getTime()) {
        currentStreak++;
        expectedDate = this.subtractPeriod(expectedDate, 1, type);
      } else {
        break;
      }
    }

    // Calculate longest streak
    tempStreak = 0;
    let previousDate: Date | null = null;
    
    for (const activityDate of periods.reverse()) {
      if (previousDate === null) {
        tempStreak = 1;
      } else {
        const expectedPrevious = this.subtractPeriod(activityDate, 1, type);
        if (previousDate.getTime() === expectedPrevious.getTime()) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      previousDate = activityDate;
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return { currentStreak, longestStreak, lastActivityDate };
  }

  private getStartOfPeriod(date: Date, type: 'daily' | 'weekly'): Date {
    const result = new Date(date);
    if (type === 'daily') {
      result.setHours(0, 0, 0, 0);
    } else { // weekly
      const day = result.getDay();
      const diff = result.getDate() - day + (day === 0 ? -6 : 1); // Monday start
      result.setDate(diff);
      result.setHours(0, 0, 0, 0);
    }
    return result;
  }

  private subtractPeriod(date: Date, amount: number, type: 'daily' | 'weekly'): Date {
    const result = new Date(date);
    if (type === 'daily') {
      result.setDate(result.getDate() - amount);
    } else { // weekly
      result.setDate(result.getDate() - (amount * 7));
    }
    return result;
  }

  /**
   * Update user streak data and award streak achievements if applicable
   */
  public async updateStreakData(userId: string, dbConnection?: any): Promise<void> {
    const dbConn = dbConnection || db;
    
    const dailyStreak = await this.calculateCurrentStreak(userId, 'daily', dbConn);
    const weeklyStreak = await this.calculateCurrentStreak(userId, 'weekly', dbConn);
    
    // Update user stats with streak information
    await dbConn
      .update(userFanScores)
      .set({
        stats: sql`jsonb_set(
          COALESCE(${userFanScores.stats}, '{}'),
          '{streaks}',
          jsonb_build_object(
            'daily_current', ${dailyStreak.currentStreak},
            'daily_longest', ${dailyStreak.longestStreak},
            'weekly_current', ${weeklyStreak.currentStreak},
            'weekly_longest', ${weeklyStreak.longestStreak},
            'last_updated', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
          )
        )`,
        updatedAt: sql`NOW()`
      })
      .where(
        and(
          eq(userFanScores.userId, userId),
          eq(userFanScores.scopeType, 'global'),
          eq(userFanScores.scopeId, 'global')
        )
      );
  }

  private async awardBonusPoints(
    userId: string, 
    bonusPoints: number, 
    achievementId: string, 
    tx?: any
  ): Promise<void> {
    const dbConnection = tx || db;

    // Create a bonus score event - already has idempotency protection
    try {
      await dbConnection.insert(fanScoreEvents).values({
        userId,
        activityType: 'achievement_bonus',
        points: bonusPoints,
        referenceType: 'achievement',
        referenceId: achievementId,
        idempotencyKey: `achievement_bonus:${achievementId}`,
        metadata: { source: 'achievement_bonus' },
      } as UpsertFanScoreEvent);
    } catch (error: any) {
      // Handle duplicate key error (idempotency violation) 
      if (error.code === '23505') {
        console.log(`Bonus points already awarded for achievement ${achievementId}`);
        return; // Points already awarded, exit early
      }
      throw error;
    }

    // Update global score atomically
    await dbConnection
      .insert(userFanScores)
      .values({
        userId,
        scopeType: 'global',
        scopeId: 'global',
        totalScore: bonusPoints,
        level: this.computeLevel(bonusPoints),
        stats: {},
      } as UpsertUserFanScore)
      .onConflictDoUpdate({
        target: [userFanScores.userId, userFanScores.scopeType, userFanScores.scopeId],
        set: {
          totalScore: sql`${userFanScores.totalScore} + ${bonusPoints}`,
          level: sql`(
            CASE 
              WHEN ${userFanScores.totalScore} + ${bonusPoints} >= 32000 THEN 10
              WHEN ${userFanScores.totalScore} + ${bonusPoints} >= 16000 THEN 9
              WHEN ${userFanScores.totalScore} + ${bonusPoints} >= 8000 THEN 8
              WHEN ${userFanScores.totalScore} + ${bonusPoints} >= 4000 THEN 7
              WHEN ${userFanScores.totalScore} + ${bonusPoints} >= 2000 THEN 6
              WHEN ${userFanScores.totalScore} + ${bonusPoints} >= 1000 THEN 5
              WHEN ${userFanScores.totalScore} + ${bonusPoints} >= 500 THEN 4
              WHEN ${userFanScores.totalScore} + ${bonusPoints} >= 250 THEN 3
              WHEN ${userFanScores.totalScore} + ${bonusPoints} >= 100 THEN 2
              ELSE 1
            END
          )`,
          updatedAt: sql`NOW()`,
        },
      });
  }

  /**
   * Determine celebration type based on achievement characteristics
   */
  private determineCelebrationType(achievement: AchievementDefinition): string {
    const criteria = achievement.criteria as any;
    
    // Special celebration for milestone achievements
    if (achievement.pointsBonus >= 1000) {
      return 'legendary'; // Fireworks, golden confetti, special sound
    }
    
    // High-value achievements
    if (achievement.pointsBonus >= 500) {
      return 'epic'; // Confetti burst, celebration sound
    }
    
    // Level-based achievements
    if (criteria.type === 'level' || achievement.code.includes('LEVEL')) {
      return 'level_up'; // Level-up animation, sparkles
    }
    
    // Streak achievements
    if (criteria.type === 'streak' || achievement.code.includes('STREAK')) {
      return 'streak'; // Fire animation, streak celebration
    }
    
    // First-time achievements
    if (criteria.type === 'first_achievement' || achievement.code.includes('FIRST')) {
      return 'first_time'; // Welcome animation, gentle celebration
    }
    
    // Progress/tier achievements
    if (achievement.code.includes('BRONZE') || achievement.code.includes('SILVER') || achievement.code.includes('GOLD')) {
      return 'tier_unlock'; // Medal animation, tier-specific colors
    }
    
    // Perfect score achievements
    if (criteria.type === 'perfect_score' || achievement.code.includes('PERFECT')) {
      return 'perfect'; // Star burst, excellence animation
    }
    
    // Social achievements
    if (criteria.type === 'social_ranking' || achievement.code.includes('TOP_')) {
      return 'social'; // Leaderboard animation, community celebration
    }
    
    // Default celebration for regular achievements
    return 'standard'; // Standard confetti, positive sound
  }

  /**
   * Trigger celebration notification (called separately for special occasions)
   */
  public async triggerSpecialCelebration(userId: string, celebrationType: string, context: any): Promise<void> {
    try {
      const wsManager = webSocketManager;
      wsManager.sendNotificationToUser(userId, {
        type: 'special_celebration',
        payload: {
          celebrationType,
          context,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to send special celebration:', error);
    }
  }
}

// Export singleton instance
export const scoringService = new ScoringService();