import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { 
  achievementDefinitions,
  userAchievements,
  userFanScores,
  fanScoreEvents
} from '../../../../../shared/schema';
import { eq, desc, and, sql, notInArray } from 'drizzle-orm';
import { withAuth } from '../../../../../server/auth';
import { ScoringService } from '../../../../../server/scoringService';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const includeUnlocked = searchParams.get('includeUnlocked') !== 'false';
    const includeAvailable = searchParams.get('includeAvailable') !== 'false';
    const includeProgress = searchParams.get('includeProgress') !== 'false';

    // Get session information for authorization
    const session = (request as any).session;

    if (!session || !session.isAuthenticated) {
      return NextResponse.json(
        { success: false, message: 'Authentication required to access achievements' },
        { status: 401 }
      );
    }

    const scoringService = new ScoringService();
    let unlockedAchievements: Array<{
      id: string;
      code: string;
      name: string;
      description: string;
      icon: string | null;
      criteria: Record<string, any>;
      pointsBonus: number | null;
      isActive: boolean | null;
      createdAt: Date | null;
      updatedAt: Date | null;
      awardedAt: Date | null;
      status: 'unlocked';
    }> = [];
    let availableAchievements: Array<{
      id: string;
      code: string;
      name: string;
      description: string;
      icon: string | null;
      criteria: Record<string, any>;
      pointsBonus: number | null;
      isActive: boolean | null;
      createdAt: Date | null;
      updatedAt: Date | null;
      status: 'available';
      progress?: {
        current: number;
        total: number;
        percentage: number;
      };
    }> = [];
    let progressData = null;

    // Get user's unlocked achievements
    if (includeUnlocked) {
      const userAchievementsList = await db
        .select({
          achievement: achievementDefinitions,
          awardedAt: userAchievements.awardedAt,
        })
        .from(userAchievements)
        .innerJoin(achievementDefinitions, eq(userAchievements.achievementId, achievementDefinitions.id))
        .where(eq(userAchievements.userId, session.userId))
        .orderBy(desc(userAchievements.awardedAt));

      unlockedAchievements = userAchievementsList.map(({ achievement, awardedAt }) => ({
        ...achievement,
        criteria: typeof achievement.criteria === 'string' 
          ? JSON.parse(achievement.criteria || '{}') 
          : achievement.criteria || {},
        awardedAt,
        status: 'unlocked' as const,
      }));
    }

    // Get available (not yet unlocked) achievements
    if (includeAvailable) {
      // First, get the IDs of achievements the user already has
      const unlockedIds = await db
        .select({ achievementId: userAchievements.achievementId })
        .from(userAchievements)
        .where(eq(userAchievements.userId, session.userId));
      
      const unlockedIdList = unlockedIds.map(ua => ua.achievementId);

      // Build query conditions
      const conditions = [eq(achievementDefinitions.isActive, true)];
      // Note: category filtering removed as column doesn't exist in schema
      if (unlockedIdList.length > 0) {
        conditions.push(notInArray(achievementDefinitions.id, unlockedIdList));
      }

      const availableList = await db
        .select()
        .from(achievementDefinitions)
        .where(and(...conditions))
        .orderBy(achievementDefinitions.name);

      availableAchievements = availableList.map(achievement => ({
        ...achievement,
        criteria: typeof achievement.criteria === 'string' 
          ? JSON.parse(achievement.criteria || '{}') 
          : achievement.criteria || {},
        status: 'available' as const,
      }));
    }

    // Get achievement progress data
    if (includeProgress) {
      // Get user's current global score for level-based achievements
      const globalScore = await scoringService.getCurrentScore(session.userId, 'global', 'global');
      const currentLevel = scoringService.computeLevel(globalScore);

      // Get user's total activities count (simplified query)
      const totalActivitiesResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(fanScoreEvents)
        .where(eq(fanScoreEvents.userId, session.userId));
      
      const totalActivities = totalActivitiesResult[0]?.count || 0;

      progressData = {
        globalScore,
        currentLevel,
        totalActivities: 0, // Simplified for now
        streaks: {
          current: 0, // Would need to calculate based on daily activity
          longest: 0,
        },
        completionRate: {
          unlocked: unlockedAchievements.length,
          total: unlockedAchievements.length + availableAchievements.length,
          percentage: Math.round(
            (unlockedAchievements.length / Math.max(unlockedAchievements.length + availableAchievements.length, 1)) * 100
          ),
        },
      };
    }

    // Calculate progress for each available achievement (simplified)
    const achievementsWithProgress = availableAchievements.map(achievement => {
      const criteria = achievement.criteria as any;
      let progress = 0;
      let maxProgress = 1;

      // Simple progress calculation based on criteria type
      if (criteria.type === 'score_threshold') {
        maxProgress = criteria.threshold || 100;
        progress = Math.min(progressData?.globalScore || 0, maxProgress);
      } else if (criteria.type === 'level_threshold') {
        maxProgress = criteria.level || 2;
        progress = Math.min(progressData?.currentLevel || 1, maxProgress);
      } else if (criteria.type === 'activity_count') {
        maxProgress = criteria.count || 10;
        progress = Math.min(progressData?.totalActivities || 0, maxProgress);
      }

      return {
        ...achievement,
        progress: {
          current: progress,
          total: maxProgress,
          percentage: Math.round((progress / maxProgress) * 100),
        },
      };
    });

    return NextResponse.json({
      success: true,
      achievements: {
        unlocked: includeUnlocked ? unlockedAchievements : undefined,
        available: includeAvailable ? achievementsWithProgress : undefined,
      },
      progress: includeProgress ? progressData : undefined,
      summary: {
        totalUnlocked: unlockedAchievements.length,
        totalAvailable: availableAchievements.length,
        totalAchievements: unlockedAchievements.length + availableAchievements.length,
        completionPercentage: Math.round(
          (unlockedAchievements.length / Math.max(unlockedAchievements.length + availableAchievements.length, 1)) * 100
        ),
      },
    });

  } catch (error) {
    console.error('Achievements fetch error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to fetch achievements data' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGET);