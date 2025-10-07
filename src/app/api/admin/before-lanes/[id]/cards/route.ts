import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../../server/db';
import { beforeLanes, cardAssignments, cards, mediaAssets } from '../../../../../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { withAuth } from '../../../../../../../server/auth';
import { requirePermission } from '../../../../../../../server/rbac';

async function handleGET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const laneId = params.id;

    const assignments = await db
      .select({
        assignment: cardAssignments,
        card: cards,
        imageMedia: mediaAssets,
      })
      .from(cardAssignments)
      .leftJoin(cards, eq(cardAssignments.cardId, cards.id))
      .leftJoin(mediaAssets, eq(cards.imageMediaId, mediaAssets.id))
      .where(
        and(
          eq(cardAssignments.parentType, 'before_lane'),
          eq(cardAssignments.parentId, laneId)
        )
      )
      .orderBy(cardAssignments.order);

    return NextResponse.json({
      success: true,
      assignments: assignments.map(a => ({
        ...a.assignment,
        card: a.card,
        imageUrl: a.imageMedia?.cloudUrl,
      })),
    });
  } catch (error) {
    console.error('Error fetching lane cards:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lane cards' },
      { status: 500 }
    );
  }
}

async function handlePOST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const laneId = params.id;
    const { cardId, order = 0 } = await request.json();

    if (!cardId) {
      return NextResponse.json(
        { success: false, error: 'Card ID is required' },
        { status: 400 }
      );
    }

    const [assignment] = await db
      .insert(cardAssignments)
      .values({
        cardId,
        parentType: 'before_lane',
        parentId: laneId,
        order,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json({ success: true, assignment });
  } catch (error) {
    console.error('Error assigning card to lane:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to assign card' },
      { status: 500 }
    );
  }
}

async function handleDELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const laneId = params.id;
    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get('cardId');

    if (!cardId) {
      return NextResponse.json(
        { success: false, error: 'Card ID is required' },
        { status: 400 }
      );
    }

    await db
      .delete(cardAssignments)
      .where(
        and(
          eq(cardAssignments.parentType, 'before_lane'),
          eq(cardAssignments.parentId, laneId),
          eq(cardAssignments.cardId, cardId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing card from lane:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove card' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(
  requirePermission('content:read', handleGET)
);

export const POST = withAuth(
  requirePermission('content:write', handlePOST)
);

export const DELETE = withAuth(
  requirePermission('content:write', handleDELETE)
);
