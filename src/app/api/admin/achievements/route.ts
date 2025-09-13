import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { 
  achievementDefinitions,
  userAchievements,
  type UpsertAchievementDefinition 
} from '../../../../../shared/schema';
import { eq, desc, count, sql } from 'drizzle-orm';
import { withAuth } from '../../../../../server/auth';

/**
 * Admin Achievement Management API
 * Allows admins to create, read, update, and delete achievement definitions
 */

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('includeStats') === 'true';
    const isActive = searchParams.get('isActive');
    
    // Get session information for authorization
    const session = (request as any).session;

    if (!session || !session.isAuthenticated) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (!session.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    // Build query conditions
    const conditions = [];
    if (isActive !== null) {
      conditions.push(eq(achievementDefinitions.isActive, isActive === 'true'));
    }

    // Fetch achievement definitions
    const achievements = await db
      .select()
      .from(achievementDefinitions)
      .where(conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined)
      .orderBy(desc(achievementDefinitions.createdAt));

    let achievementsWithStats = achievements;

    // Include statistics if requested
    if (includeStats) {
      achievementsWithStats = await Promise.all(
        achievements.map(async (achievement) => {
          const [stats] = await db
            .select({
              totalAwarded: count(),
              uniqueUsers: sql<number>`COUNT(DISTINCT ${userAchievements.userId})`
            })
            .from(userAchievements)
            .where(eq(userAchievements.achievementId, achievement.id));

          return {
            ...achievement,
            criteria: typeof achievement.criteria === 'string' 
              ? JSON.parse(achievement.criteria) 
              : achievement.criteria,
            stats: {
              totalAwarded: stats?.totalAwarded || 0,
              uniqueUsers: stats?.uniqueUsers || 0
            }
          };
        })
      );
    } else {
      achievementsWithStats = achievements.map(achievement => ({
        ...achievement,
        criteria: typeof achievement.criteria === 'string' 
          ? JSON.parse(achievement.criteria) 
          : achievement.criteria
      }));
    }

    return NextResponse.json({
      success: true,
      achievements: achievementsWithStats,
      total: achievements.length
    });

  } catch (error) {
    console.error('Admin achievements fetch error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch achievements' },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const session = (request as any).session;

    if (!session || !session.isAuthenticated || !session.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      code, 
      name, 
      description, 
      icon, 
      criteria, 
      pointsBonus = 0, 
      isActive = true 
    } = body;

    // Validate required fields
    if (!code || !name || !description || !criteria) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: code, name, description, criteria' },
        { status: 400 }
      );
    }

    // Validate criteria structure
    if (!criteria.type && !criteria.conditions) {
      return NextResponse.json(
        { success: false, message: 'Invalid criteria: must have either type or conditions' },
        { status: 400 }
      );
    }

    const achievementData: UpsertAchievementDefinition = {
      code,
      name,
      description,
      icon,
      criteria,
      pointsBonus,
      isActive
    };

    // Insert new achievement
    const [newAchievement] = await db
      .insert(achievementDefinitions)
      .values(achievementData)
      .returning();

    return NextResponse.json({
      success: true,
      achievement: {
        ...newAchievement,
        criteria: typeof newAchievement.criteria === 'string' 
          ? JSON.parse(newAchievement.criteria) 
          : newAchievement.criteria
      },
      message: `Achievement "${name}" created successfully`
    });

  } catch (error: any) {
    console.error('Admin achievements creation error:', error);
    
    // Handle unique constraint violations
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, message: 'Achievement code already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to create achievement' },
      { status: 500 }
    );
  }
}

async function handlePUT(request: NextRequest) {
  try {
    const session = (request as any).session;

    if (!session || !session.isAuthenticated || !session.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      id,
      code, 
      name, 
      description, 
      icon, 
      criteria, 
      pointsBonus, 
      isActive 
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Achievement ID is required' },
        { status: 400 }
      );
    }

    // Update achievement
    const [updatedAchievement] = await db
      .update(achievementDefinitions)
      .set({
        code,
        name,
        description,
        icon,
        criteria,
        pointsBonus,
        isActive,
        updatedAt: new Date()
      })
      .where(eq(achievementDefinitions.id, id))
      .returning();

    if (!updatedAchievement) {
      return NextResponse.json(
        { success: false, message: 'Achievement not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      achievement: {
        ...updatedAchievement,
        criteria: typeof updatedAchievement.criteria === 'string' 
          ? JSON.parse(updatedAchievement.criteria) 
          : updatedAchievement.criteria
      },
      message: `Achievement "${updatedAchievement.name}" updated successfully`
    });

  } catch (error: any) {
    console.error('Admin achievements update error:', error);
    
    if (error.code === '23505') {
      return NextResponse.json(
        { success: false, message: 'Achievement code already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to update achievement' },
      { status: 500 }
    );
  }
}

async function handleDELETE(request: NextRequest) {
  try {
    const session = (request as any).session;

    if (!session || !session.isAuthenticated || !session.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Achievement ID is required' },
        { status: 400 }
      );
    }

    // Check if achievement has been awarded to users
    const [awardCount] = await db
      .select({ count: count() })
      .from(userAchievements)
      .where(eq(userAchievements.achievementId, id));

    if ((awardCount?.count || 0) > 0) {
      // Instead of deleting, mark as inactive
      const [updatedAchievement] = await db
        .update(achievementDefinitions)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(eq(achievementDefinitions.id, id))
        .returning();

      return NextResponse.json({
        success: true,
        message: `Achievement has been awarded to users, so it was deactivated instead of deleted`,
        achievement: updatedAchievement
      });
    } else {
      // Safe to delete if never awarded
      const [deletedAchievement] = await db
        .delete(achievementDefinitions)
        .where(eq(achievementDefinitions.id, id))
        .returning();

      if (!deletedAchievement) {
        return NextResponse.json(
          { success: false, message: 'Achievement not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Achievement "${deletedAchievement.name}" deleted successfully`
      });
    }

  } catch (error) {
    console.error('Admin achievements deletion error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete achievement' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGET);
export const POST = withAuth(handlePOST);
export const PUT = withAuth(handlePUT);
export const DELETE = withAuth(handleDELETE);