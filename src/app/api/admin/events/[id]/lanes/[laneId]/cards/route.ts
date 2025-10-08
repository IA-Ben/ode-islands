import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { cardAssignments, cards } from '@/shared/schema';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: { id: string; laneId: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { laneId } = params;

    // Fetch card assignments for this lane
    const assignments = await db
      .select({
        id: cardAssignments.id,
        cardId: cardAssignments.cardId,
        order: cardAssignments.order,
        visibilityStartAt: cardAssignments.visibilityStartAt,
        visibilityEndAt: cardAssignments.visibilityEndAt,
        status: cardAssignments.status,
        card: {
          id: cards.id,
          title: cards.title,
          subtitle: cards.subtitle,
          type: cards.type,
          scope: cards.scope,
          publishStatus: cards.publishStatus,
          imageMediaId: cards.imageMediaId,
        },
      })
      .from(cardAssignments)
      .leftJoin(cards, eq(cardAssignments.cardId, cards.id))
      .where(
        and(
          eq(cardAssignments.parentType, 'event_lane'),
          eq(cardAssignments.parentId, laneId)
        )
      )
      .orderBy(cardAssignments.order);

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('Error fetching card assignments:', error);
    return NextResponse.json({ error: 'Failed to fetch card assignments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { laneId } = params;
    const body = await request.json();
    const { assignments } = body;

    if (!Array.isArray(assignments)) {
      return NextResponse.json({ error: 'Invalid assignments data' }, { status: 400 });
    }

    // Delete existing assignments for this lane
    await db
      .delete(cardAssignments)
      .where(
        and(
          eq(cardAssignments.parentType, 'event_lane'),
          eq(cardAssignments.parentId, laneId)
        )
      );

    // Insert new assignments
    const savedAssignments = [];
    for (const assignment of assignments) {
      const [saved] = await db
        .insert(cardAssignments)
        .values({
          cardId: assignment.cardId,
          parentType: 'event_lane',
          parentId: laneId,
          order: assignment.order,
          visibilityStartAt: assignment.visibilityStartAt || null,
          visibilityEndAt: assignment.visibilityEndAt || null,
          status: assignment.status || 'active',
        })
        .returning();
      savedAssignments.push(saved);
    }

    return NextResponse.json({ assignments: savedAssignments });
  } catch (error) {
    console.error('Error saving card assignments:', error);
    return NextResponse.json({ error: 'Failed to save card assignments' }, { status: 500 });
  }
}
