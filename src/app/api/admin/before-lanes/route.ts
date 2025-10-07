import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { beforeLanes, cardAssignments } from '../../../../../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { withAuth } from '../../../../../server/auth';
import { requirePermission } from '../../../../../server/rbac';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    let query = db
      .select()
      .from(beforeLanes)
      .orderBy(beforeLanes.order, desc(beforeLanes.createdAt))
      .$dynamic();

    if (eventId) {
      query = query.where(eq(beforeLanes.eventId, eventId));
    }

    const lanes = await query;

    return NextResponse.json({ success: true, lanes });
  } catch (error) {
    console.error('Error fetching before lanes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch before lanes' },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventId, laneKey, title, description, iconName, order, isActive } = body;

    if (!laneKey || !title) {
      return NextResponse.json(
        { success: false, error: 'Lane key and title are required' },
        { status: 400 }
      );
    }

    // Check for duplicate lane key in same event
    const existing = await db
      .select()
      .from(beforeLanes)
      .where(
        and(
          eq(beforeLanes.eventId, eventId),
          eq(beforeLanes.laneKey, laneKey)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Lane with this key already exists for this event' },
        { status: 409 }
      );
    }

    const [lane] = await db
      .insert(beforeLanes)
      .values({
        eventId,
        laneKey,
        title,
        description,
        iconName,
        order: order || 0,
        isActive: isActive !== undefined ? isActive : true,
      })
      .returning();

    return NextResponse.json({ success: true, lane });
  } catch (error) {
    console.error('Error creating before lane:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create before lane' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(requirePermission('lanes:view')(handleGET));
export const POST = withAuth(requirePermission('lanes:create')(handlePOST));
