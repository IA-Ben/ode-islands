import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { 
  userFanScores, 
  users 
} from '../../../../../shared/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { withAuth } from '../../../../../server/auth';
import { ScoringService } from '../../../../../server/scoringService';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scopeType = searchParams.get('scopeType') || 'global';
    const scopeId = searchParams.get('scopeId') || 'global';
    const eventId = searchParams.get('eventId');
    const phase = searchParams.get('phase');
    const limit = parseInt(searchParams.get('limit') || '10');
    const includeUserPosition = searchParams.get('includeUserPosition') !== 'false';

    // Validate limit
    if (limit > 50) {
      return NextResponse.json(
        { success: false, message: 'Limit cannot exceed 50' },
        { status: 400 }
      );
    }

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

    // Get leaderboard data
    const leaderboard = await scoringService.getLeaderboard(finalScopeType, finalScopeId, limit);

    // Enhance leaderboard data with user information
    const enhancedLeaderboard = await Promise.all(
      leaderboard.map(async (entry, index) => {
        const user = await db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            profileImageUrl: users.profileImageUrl,
          })
          .from(users)
          .where(eq(users.id, entry.userId))
          .limit(1);

        return {
          position: entry.position || (index + 1),
          userId: entry.userId,
          totalScore: entry.totalScore,
          level: entry.level,
          user: user[0] ? {
            firstName: user[0].firstName || '',
            lastName: user[0].lastName || '',
            profileImageUrl: user[0].profileImageUrl || null,
            displayName: `${user[0].firstName || ''} ${user[0].lastName || ''}`.trim() || 'User',
          } : null,
        };
      })
    );

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

    // Get total participants in this scope
    const totalParticipants = await db
      .select({ count: sql<number>`count(*)` })
      .from(userFanScores)
      .where(
        and(
          eq(userFanScores.scopeType, finalScopeType),
          eq(userFanScores.scopeId, finalScopeId)
        )
      );

    return NextResponse.json({
      success: true,
      data: {
        scope: {
          type: finalScopeType,
          id: finalScopeId,
          totalParticipants: totalParticipants[0]?.count || 0,
        },
        leaderboard: enhancedLeaderboard,
        userPosition,
        meta: {
          limit,
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