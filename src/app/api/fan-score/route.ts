import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { 
  userFanScores, 
  fanScoreEvents, 
  users,
  achievementDefinitions,
  userAchievements 
} from '../../../../shared/schema';
import { eq, desc, and, count, sum, sql } from 'drizzle-orm';
import { withAuth } from '../../../../server/auth';
import { ScoringService } from '../../../../server/scoringService';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scopeType = searchParams.get('scopeType') || 'global';
    const scopeId = searchParams.get('scopeId') || 'global';
    const includeRecentEvents = searchParams.get('includeRecentEvents') !== 'false';
    const recentEventsLimit = parseInt(searchParams.get('recentEventsLimit') || '10');

    // Get session information for authorization
    const session = (request as any).session;

    if (!session || !session.isAuthenticated) {
      return NextResponse.json(
        { success: false, message: 'Authentication required to access fan scores' },
        { status: 401 }
      );
    }

    const scoringService = new ScoringService();

    // Get user's current score for the specified scope
    const currentScore = await scoringService.getCurrentScore(session.userId, scopeType, scopeId);

    // Compute current level and next threshold
    const currentLevel = scoringService.computeLevel(currentScore);
    const nextLevel = currentLevel + 1;
    
    // Find the threshold for the next level
    const LEVEL_THRESHOLDS = [
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

    const nextThreshold = LEVEL_THRESHOLDS.find(t => t.level === nextLevel)?.minScore;
    const pointsToNextLevel = nextThreshold ? nextThreshold - currentScore : 0;

    // Get all user's scores across different scopes
    const allScopes = await db
      .select({
        scopeType: userFanScores.scopeType,
        scopeId: userFanScores.scopeId,
        totalScore: userFanScores.totalScore,
        level: userFanScores.level,
      })
      .from(userFanScores)
      .where(eq(userFanScores.userId, session.userId))
      .orderBy(desc(userFanScores.totalScore));

    // Get recent scoring events if requested
    let recentEvents: Array<{
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
    }> = [];
    if (includeRecentEvents) {
      const events = await db
        .select({
          id: fanScoreEvents.id,
          activityType: fanScoreEvents.activityType,
          points: fanScoreEvents.points,
          referenceType: fanScoreEvents.referenceType,
          referenceId: fanScoreEvents.referenceId,
          eventId: fanScoreEvents.eventId,
          chapterId: fanScoreEvents.chapterId,
          cardIndex: fanScoreEvents.cardIndex,
          phase: fanScoreEvents.phase,
          createdAt: fanScoreEvents.createdAt,
          metadata: fanScoreEvents.metadata,
        })
        .from(fanScoreEvents)
        .where(eq(fanScoreEvents.userId, session.userId))
        .orderBy(desc(fanScoreEvents.createdAt))
        .limit(recentEventsLimit);

      recentEvents = events.map(event => ({
        ...event,
        metadata: typeof event.metadata === 'string' ? JSON.parse(event.metadata || '{}') : event.metadata || {},
      }));
    }

    // Get user's achievements count
    const achievementsCount = await db
      .select({ count: count() })
      .from(userAchievements)
      .where(eq(userAchievements.userId, session.userId));

    // Get total achievements available
    const totalAchievements = await db
      .select({ count: count() })
      .from(achievementDefinitions)
      .where(eq(achievementDefinitions.isActive, true));

    // Get user's leaderboard position for the specified scope
    const leaderboardPosition = await scoringService.getLeaderboardPosition(session.userId, scopeType, scopeId);

    // Get summary statistics
    const totalPointsEarned = await db
      .select({ total: sum(fanScoreEvents.points) })
      .from(fanScoreEvents)
      .where(eq(fanScoreEvents.userId, session.userId));

    const totalActivities = await db
      .select({ count: count() })
      .from(fanScoreEvents)
      .where(eq(fanScoreEvents.userId, session.userId));

    return NextResponse.json({
      success: true,
      data: {
        currentScore: {
          scopeType,
          scopeId,
          totalScore: currentScore,
          level: currentLevel,
          nextLevel: nextLevel <= 10 ? nextLevel : null,
          pointsToNextLevel: nextLevel <= 10 ? pointsToNextLevel : 0,
          leaderboardPosition,
        },
        allScopes,
        achievements: {
          unlocked: achievementsCount[0]?.count || 0,
          total: totalAchievements[0]?.count || 0,
        },
        statistics: {
          totalPointsEarned: Number(totalPointsEarned[0]?.total || 0),
          totalActivities: totalActivities[0]?.count || 0,
        },
        recentEvents: includeRecentEvents ? recentEvents : undefined,
      }
    });

  } catch (error) {
    console.error('Fan score fetch error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to fetch fan score data' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGET);