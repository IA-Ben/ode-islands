import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../server/db';
import { 
  achievementDefinitions,
  userAchievements,
  users
} from '../../../../../../shared/schema';
import { eq, desc } from 'drizzle-orm';
import { withAuth } from '../../../../../../server/auth';

/**
 * Individual Achievement Management API
 */

async function handleGET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = (request as any).session;

    if (!session || !session.isAuthenticated || !session.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const includeAwardees = searchParams.get('includeAwardees') === 'true';

    // Fetch achievement details
    const [achievement] = await db
      .select()
      .from(achievementDefinitions)
      .where(eq(achievementDefinitions.id, params.id));

    if (!achievement) {
      return NextResponse.json(
        { success: false, message: 'Achievement not found' },
        { status: 404 }
      );
    }

    let awardees = [];
    
    if (includeAwardees) {
      // Fetch users who have earned this achievement
      awardees = await db
        .select({
          userId: userAchievements.userId,
          awardedAt: userAchievements.awardedAt,
          user: {
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            profileImageUrl: users.profileImageUrl
          }
        })
        .from(userAchievements)
        .innerJoin(users, eq(userAchievements.userId, users.id))
        .where(eq(userAchievements.achievementId, params.id))
        .orderBy(desc(userAchievements.awardedAt));
    }

    return NextResponse.json({
      success: true,
      achievement: {
        ...achievement,
        criteria: typeof achievement.criteria === 'string' 
          ? JSON.parse(achievement.criteria) 
          : achievement.criteria
      },
      awardees: includeAwardees ? awardees : undefined,
      totalAwardees: awardees.length
    });

  } catch (error) {
    console.error('Achievement detail fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch achievement details' },
      { status: 500 }
    );
  }
}

async function handlePOST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = (request as any).session;

    if (!session || !session.isAuthenticated || !session.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, userId } = body;

    if (action === 'award_manually' && userId) {
      // Manually award achievement to a specific user
      try {
        await db.insert(userAchievements).values({
          userId,
          achievementId: params.id
        });

        return NextResponse.json({
          success: true,
          message: 'Achievement awarded manually'
        });
      } catch (error: any) {
        if (error.code === '23505') {
          return NextResponse.json(
            { success: false, message: 'User already has this achievement' },
            { status: 409 }
          );
        }
        throw error;
      }
    } else if (action === 'revoke' && userId) {
      // Revoke achievement from a specific user
      const deletedCount = await db
        .delete(userAchievements)
        .where(
          eq(userAchievements.achievementId, params.id) &&
          eq(userAchievements.userId, userId)
        );

      return NextResponse.json({
        success: true,
        message: 'Achievement revoked successfully'
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action or missing userId' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Achievement action error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to perform achievement action' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGET);
export const POST = withAuth(handlePOST);