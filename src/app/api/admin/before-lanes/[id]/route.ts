import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../server/db';
import { beforeLanes, cardAssignments } from '../../../../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { withAuth } from '../../../../../../server/auth';
import { requirePermission } from '../../../../../../server/rbac';

async function handlePATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();

    const [updatedLane] = await db
      .update(beforeLanes)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(beforeLanes.id, id))
      .returning();

    if (!updatedLane) {
      return NextResponse.json(
        { success: false, error: 'Lane not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, lane: updatedLane });
  } catch (error) {
    console.error('Error updating before lane:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update before lane' },
      { status: 500 }
    );
  }
}

async function handleDELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Check if lane has assigned cards
    const assignments = await db
      .select()
      .from(cardAssignments)
      .where(
        and(
          eq(cardAssignments.parentType, 'before_lane'),
          eq(cardAssignments.parentId, id)
        )
      );

    if (assignments.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete lane with assigned cards. Remove cards first.' },
        { status: 409 }
      );
    }

    await db
      .delete(beforeLanes)
      .where(eq(beforeLanes.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting before lane:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete before lane' },
      { status: 500 }
      );
  }
}

export const PATCH = withAuth(requirePermission('lanes:edit')(handlePATCH));
export const DELETE = withAuth(requirePermission('lanes:delete')(handleDELETE));
