import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { cardAssignments } from '@/shared/schema';
import { and, eq } from 'drizzle-orm';

interface RouteParams {
  params: { id: string };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: eventId } = params;
    const body = await request.json();
    const { cardId, laneId, action } = body;

    if (!cardId || !laneId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (action === 'publish') {
      // Set card assignment to active and remove time constraints for immediate visibility
      const [updated] = await db
        .update(cardAssignments)
        .set({
          status: 'active',
          visibilityStartAt: new Date(),
          visibilityEndAt: null,
        })
        .where(
          and(
            eq(cardAssignments.cardId, cardId),
            eq(cardAssignments.parentType, 'event_lane'),
            eq(cardAssignments.parentId, laneId)
          )
        )
        .returning();

      if (!updated) {
        return NextResponse.json({ error: 'Card assignment not found' }, { status: 404 });
      }

      // TODO: Trigger real-time notification to connected clients via WebSocket
      // This would notify all users viewing the event that new content is available

      return NextResponse.json({
        success: true,
        publishedAt: new Date().toISOString(),
        assignment: updated,
      });
    } else if (action === 'unpublish') {
      // Set card assignment to inactive
      const [updated] = await db
        .update(cardAssignments)
        .set({
          status: 'inactive',
        })
        .where(
          and(
            eq(cardAssignments.cardId, cardId),
            eq(cardAssignments.parentType, 'event_lane'),
            eq(cardAssignments.parentId, laneId)
          )
        )
        .returning();

      return NextResponse.json({
        success: true,
        unpublishedAt: new Date().toISOString(),
        assignment: updated,
      });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error publishing card:', error);
    return NextResponse.json({ error: 'Failed to publish card' }, { status: 500 });
  }
}
