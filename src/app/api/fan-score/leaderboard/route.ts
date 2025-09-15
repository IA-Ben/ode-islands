import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { 
  userFanScores, 
  users 
} from '../../../../../shared/schema';
import { eq, desc, and, sql, count } from 'drizzle-orm';
import { withAuth } from '../../../../../server/auth';
import { ScoringService } from '../../../../../server/scoringService';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scopeType = searchParams.get('scopeType') || 'global';
    const scopeId = searchParams.get('scopeId') || 'global';
    const eventId = searchParams.get('eventId');
    const phase = searchParams.get('phase');
    // Sanitize input parameters with proper validation
    const rawLimit = parseInt(searchParams.get('limit') || '10');
    const rawOffset = parseInt(searchParams.get('offset') || '0');
    const limit = Math.max(1, Math.min(isNaN(rawLimit) ? 10 : rawLimit, 100));
    const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset);
    const includeUserPosition = searchParams.get('includeUserPosition') !== 'false';

    // Get session information for authorization
    const session = (request as any).session;

    if (!session || !session.isAuthenticated) {
      return NextResponse.json(
        { success: false, message: 'Authentication required to access leaderboard' },
        { status: 401 }
      );
    }

    // Determine the scope based on parameters
    let finalScopeType = scopeType;
    let finalScopeId = scopeId;
    
    if (eventId && scopeType === 'global') {
      finalScopeType = 'event';
      finalScopeId = eventId;
    } else if (phase && scopeType === 'global') {
      finalScopeType = 'phase';
      finalScopeId = phase;
    }

    const scoringService = new ScoringService();

    // Get leaderboard data with user information (fixed N+1 query problem)
    const leaderboard = await scoringService.getLeaderboard(finalScopeType, finalScopeId, limit, offset);

    // Transform leaderboard data (no additional queries needed)
    const enhancedLeaderboard = leaderboard.map((entry, index) => ({
      position: entry.position || (offset + index + 1),
      userId: entry.userId,
      totalScore: entry.totalScore,
      level: entry.level,
      user: entry.user ? {
        firstName: entry.user.firstName || '',
        lastName: entry.user.lastName || '',
        profileImageUrl: entry.user.profileImageUrl || null,
        displayName: entry.user.displayName || 'User',
      } : null,
    }));

    // Get current user's position if requested
    let userPosition = null;
    if (includeUserPosition) {
      const position = await scoringService.getLeaderboardPosition(session.userId, finalScopeType, finalScopeId);
      const userScore = await scoringService.getCurrentScore(session.userId, finalScopeType, finalScopeId);
      const userLevel = scoringService.computeLevel(userScore);
      
      userPosition = {
        position,
        totalScore: userScore,
        level: userLevel,
        isInTopList: enhancedLeaderboard.some(entry => entry.userId === session.userId),
      };
    }

    // Get total participants in this scope (standardized count approach)
    const totalParticipants = await db
      .select({ count: count() })
      .from(userFanScores)
      .where(
        and(
          eq(userFanScores.scopeType, finalScopeType),
          eq(userFanScores.scopeId, finalScopeId)
        )
      );

    const totalCount = totalParticipants[0]?.count || 0;
    const hasMore = offset + limit < totalCount;
    const totalPages = Math.ceil(totalCount / limit);
    const currentPage = Math.floor(offset / limit) + 1;

    return NextResponse.json({
      success: true,
      data: {
        scope: {
          type: finalScopeType,
          id: finalScopeId,
          totalParticipants: totalCount,
        },
        leaderboard: enhancedLeaderboard,
        userPosition,
        pagination: {
          total: totalCount,
          limit,
          offset,
          currentPage,
          totalPages,
          hasMore,
          hasPrevious: offset > 0
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      }
    });

  } catch (error) {
    console.error('Leaderboard fetch error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to fetch leaderboard data' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGET);