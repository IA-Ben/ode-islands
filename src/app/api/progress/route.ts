import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { userProgress, users } from '../../../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { withUserAuth, withUserAuthAndCSRF } from '../../../../server/auth';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chapterId = searchParams.get('chapterId');

    // Get authenticated user ID from session (prevents IDOR vulnerability)
    const session = (request as any).session;
    const userId = session.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Build query conditions
    const conditions = [eq(userProgress.userId, userId)];
    if (chapterId) {
      conditions.push(eq(userProgress.chapterId, chapterId));
    }

    // Get user progress
    const progress = await db
      .select()
      .from(userProgress)
      .where(and(...conditions))
      .orderBy(desc(userProgress.lastAccessed));

    return NextResponse.json({
      success: true,
      progress: progress,
    });

  } catch (error) {
    console.error('Progress fetch error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = (request as any).parsedBody || await request.json();
    const { chapterId, cardIndex, timeSpent } = body;

    // Get authenticated user ID from session (prevents spoofing)
    const session = (request as any).session;
    const userId = session.userId;

    // Validate required fields
    if (!chapterId || cardIndex === undefined) {
      return NextResponse.json(
        { success: false, message: 'Chapter ID and card index are required' },
        { status: 400 }
      );
    }

    // Check if progress record already exists
    const existingProgress = await db
      .select()
      .from(userProgress)
      .where(
        and(
          eq(userProgress.userId, userId),
          eq(userProgress.chapterId, chapterId),
          eq(userProgress.cardIndex, cardIndex)
        )
      )
      .limit(1);

    if (existingProgress.length > 0) {
      // Update existing progress
      const updatedProgress = await db
        .update(userProgress)
        .set({
          lastAccessed: new Date(),
          timeSpent: timeSpent || existingProgress[0].timeSpent,
        })
        .where(eq(userProgress.id, existingProgress[0].id))
        .returning();

      return NextResponse.json({
        success: true,
        message: 'Progress updated',
        progress: updatedProgress[0],
      });
    } else {
      // Create new progress record
      const newProgress = await db
        .insert(userProgress)
        .values({
          userId,
          chapterId,
          cardIndex,
          timeSpent: timeSpent || 0,
          completedAt: new Date(),
          lastAccessed: new Date(),
        })
        .returning();

      return NextResponse.json({
        success: true,
        message: 'Progress recorded',
        progress: newProgress[0],
      });
    }

  } catch (error) {
    console.error('Progress save error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to save progress' },
      { status: 500 }
    );
  }
}

// Apply authentication middleware
export const GET = withUserAuth(handleGET);
export const POST = withUserAuthAndCSRF(handlePOST); // CSRF protection for state-changing operations