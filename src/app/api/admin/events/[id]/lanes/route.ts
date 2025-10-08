import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { eventLanes, cardAssignments } from '@/shared/schema';
import { eq, and, sql } from 'drizzle-orm';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: eventId } = params;

    // Fetch lanes with card counts
    const lanes = await db
      .select({
        id: eventLanes.id,
        eventId: eventLanes.eventId,
        laneKey: eventLanes.laneKey,
        title: eventLanes.title,
        description: eventLanes.description,
        iconName: eventLanes.iconName,
        order: eventLanes.order,
        isActive: eventLanes.isActive,
        createdAt: eventLanes.createdAt,
        cardCount: sql<number>`(
          SELECT COUNT(*)
          FROM ${cardAssignments}
          WHERE ${cardAssignments.parentType} = 'event_lane'
          AND ${cardAssignments.parentId} = ${eventLanes.id}
        )`,
      })
      .from(eventLanes)
      .where(eq(eventLanes.eventId, eventId))
      .orderBy(eventLanes.order);

    return NextResponse.json({ lanes });
  } catch (error) {
    console.error('Error fetching event lanes:', error);
    return NextResponse.json({ error: 'Failed to fetch event lanes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: eventId } = params;
    const body = await request.json();
    const { lanes } = body;

    if (!Array.isArray(lanes)) {
      return NextResponse.json({ error: 'Invalid lanes data' }, { status: 400 });
    }

    // Delete existing lanes for this event
    await db.delete(eventLanes).where(eq(eventLanes.eventId, eventId));

    // Insert new lanes
    const savedLanes = [];
    for (const lane of lanes) {
      const [saved] = await db
        .insert(eventLanes)
        .values({
          eventId,
          laneKey: lane.laneKey,
          title: lane.title,
          description: lane.description || null,
          iconName: lane.iconName || null,
          order: lane.order,
          isActive: lane.isActive !== undefined ? lane.isActive : true,
        })
        .returning();
      savedLanes.push(saved);
    }

    return NextResponse.json({ lanes: savedLanes });
  } catch (error) {
    console.error('Error saving event lanes:', error);
    return NextResponse.json({ error: 'Failed to save event lanes' }, { status: 500 });
  }
}
