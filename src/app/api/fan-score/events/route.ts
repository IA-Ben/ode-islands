import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { 
  fanScoreEvents, 
  users 
} from '../../../../../shared/schema';
import { eq, desc, and, count, sql, gte, lte } from 'drizzle-orm';
import { withAuth } from '../../../../../server/auth';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activityType = searchParams.get('activityType');
    const eventId = searchParams.get('eventId');
    const chapterId = searchParams.get('chapterId');
    const phase = searchParams.get('phase');
    const referenceType = searchParams.get('referenceType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate limit and offset
    if (limit > 100) {
      return NextResponse.json(
        { success: false, message: 'Limit cannot exceed 100' },
        { status: 400 }
      );
    }

    // Get session information for authorization
    const session = (request as any).session;

    if (!session || !session.isAuthenticated) {
      return NextResponse.json(
        { success: false, message: 'Authentication required to access fan score events' },
        { status: 401 }
      );
    }

    // Build query conditions
    const conditions = [eq(fanScoreEvents.userId, session.userId)];
    
    if (activityType) conditions.push(eq(fanScoreEvents.activityType, activityType));
    if (eventId) conditions.push(eq(fanScoreEvents.eventId, eventId));
    if (chapterId) conditions.push(eq(fanScoreEvents.chapterId, chapterId));
    if (phase) conditions.push(eq(fanScoreEvents.phase, phase));
    if (referenceType) conditions.push(eq(fanScoreEvents.referenceType, referenceType));
    if (startDate) conditions.push(gte(fanScoreEvents.createdAt, new Date(startDate)));
    if (endDate) conditions.push(lte(fanScoreEvents.createdAt, new Date(endDate)));

    // Get user's scoring events with pagination
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
      .where(and(...conditions))
      .orderBy(desc(fanScoreEvents.createdAt))
      .limit(limit)
      .offset(offset);

    // Process events to ensure proper data formatting
    const processedEvents = events.map((event) => ({
      ...event,
      metadata: typeof event.metadata === 'string' ? JSON.parse(event.metadata || '{}') : event.metadata || {},
    }));

    // Get total count for pagination
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(fanScoreEvents)
      .where(and(...conditions));

    // Get activity type breakdown for stats
    const activityBreakdown = await db
      .select({
        activityType: fanScoreEvents.activityType,
        count: count(),
        totalPoints: sql<number>`sum(${fanScoreEvents.points})`,
      })
      .from(fanScoreEvents)
      .where(eq(fanScoreEvents.userId, session.userId))
      .groupBy(fanScoreEvents.activityType)
      .orderBy(desc(sql`sum(${fanScoreEvents.points})`));

    return NextResponse.json({
      success: true,
      events: processedEvents,
      pagination: {
        total: totalResult[0]?.count || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (totalResult[0]?.count || 0),
      },
      stats: {
        activityBreakdown: activityBreakdown.map(item => ({
          ...item,
          totalPoints: Number(item.totalPoints || 0),
        })),
      },
    });

  } catch (error) {
    console.error('Fan score events fetch error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to fetch fan score events' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handleGET);