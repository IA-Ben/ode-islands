import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { collectibleProgress, collectibleDefinitions, userCollectibles } from '../../../../../shared/schema';
import { eq, desc, and, count, sql } from 'drizzle-orm';
import { withAuth } from '../../../../../server/auth';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    // Get session information for authorization
    const session = (request as any).session;

    if (!session || !session.isAuthenticated) {
      return NextResponse.json(
        { success: false, message: 'Authentication required to access collectible progress' },
        { status: 401 }
      );
    }

    if (!eventId) {
      return NextResponse.json(
        { success: false, message: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Try to get existing progress record
    let progressRecord = await db
      .select()
      .from(collectibleProgress)
      .where(and(
        eq(collectibleProgress.userId, session.userId),
        eq(collectibleProgress.eventId, eventId)
      ))
      .limit(1);

    // If no progress record exists, calculate real-time progress and create one
    if (progressRecord.length === 0) {
      // Count total collectibles available for this event
      const totalCollectiblesResult = await db
        .select({ count: count() })
        .from(collectibleDefinitions)
        .where(eq(collectibleDefinitions.eventId, eventId));
      
      const totalCollectibles = totalCollectiblesResult[0]?.count || 0;

      // Count unlocked collectibles for this user/event
      const unlockedCollectiblesResult = await db
        .select({ count: count() })
        .from(userCollectibles)
        .leftJoin(collectibleDefinitions, eq(userCollectibles.collectibleId, collectibleDefinitions.id))
        .where(and(
          eq(userCollectibles.userId, session.userId),
          eq(collectibleDefinitions.eventId, eventId),
          eq(userCollectibles.isUnlocked, true)
        ));

      const unlockedCount = unlockedCollectiblesResult[0]?.count || 0;
      const completionPercentage = totalCollectibles > 0 ? Math.round((unlockedCount / totalCollectibles) * 100) : 0;
      const hasCompletedGrid = completionPercentage >= 100;

      // Get first and last unlock times
      const unlockTimes = await db
        .select({
          firstUnlock: sql<string>`MIN(${userCollectibles.unlockedAt})`,
          lastUnlock: sql<string>`MAX(${userCollectibles.unlockedAt})`
        })
        .from(userCollectibles)
        .leftJoin(collectibleDefinitions, eq(userCollectibles.collectibleId, collectibleDefinitions.id))
        .where(and(
          eq(userCollectibles.userId, session.userId),
          eq(collectibleDefinitions.eventId, eventId),
          eq(userCollectibles.isUnlocked, true)
        ));

      const firstUnlockAt = unlockTimes[0]?.firstUnlock || null;
      const lastUnlockAt = unlockTimes[0]?.lastUnlock || null;

      // Create new progress record
      const newProgressData = {
        userId: session.userId,
        eventId,
        totalCollectibles,
        unlockedCount,
        completionPercentage,
        hasCompletedGrid,
        firstUnlockAt: firstUnlockAt ? new Date(firstUnlockAt) : null,
        lastUnlockAt: lastUnlockAt ? new Date(lastUnlockAt) : null,
        completedAt: hasCompletedGrid ? new Date() : null,
      };

      const createdProgress = await db
        .insert(collectibleProgress)
        .values([newProgressData])
        .returning();

      progressRecord = createdProgress;
    }

    const progress = progressRecord[0];

    return NextResponse.json({
      success: true,
      progress,
    });

  } catch (error) {
    console.error('Collectible progress fetch error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to fetch collectible progress' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGET);