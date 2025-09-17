import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { collectibleProgress, collectibleDefinitions, userCollectibles } from '../../../../../shared/schema';
import { eq, desc, and, count, sql } from 'drizzle-orm';
import { withAuth, withUserAuthAndCSRF } from '../../../../../server/auth';

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

    // If no progress record exists, return 404 - use POST to create progress records
    if (progressRecord.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Progress record not found. Use POST to create initial progress tracking.'
        },
        { status: 404 }
      );
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

async function handlePOST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    const session = (request as any).session;

    if (!session || !session.isAuthenticated) {
      return NextResponse.json(
        { success: false, message: 'Authentication required to create collectible progress' },
        { status: 401 }
      );
    }

    if (!eventId) {
      return NextResponse.json(
        { success: false, message: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Check if progress record already exists
    const existingProgress = await db
      .select()
      .from(collectibleProgress)
      .where(and(
        eq(collectibleProgress.userId, session.userId),
        eq(collectibleProgress.eventId, eventId)
      ))
      .limit(1);

    if (existingProgress.length > 0) {
      return NextResponse.json(
        {
          success: true,
          progress: existingProgress[0],
          message: 'Progress record already exists'
        }
      );
    }

    // Calculate real-time progress and create new record
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

    return NextResponse.json({
      success: true,
      progress: createdProgress[0],
      message: 'Progress tracking initialized successfully'
    });

  } catch (error) {
    console.error('Collectible progress creation error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to create collectible progress' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGET);
export const POST = withUserAuthAndCSRF(handlePOST);