import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../server/auth';
import { requirePermission } from '../../../../../server/rbac';
import { db } from '../../../../../server/db';
import { eventLanes } from '../../../../../shared/schema';
import { eq, and } from 'drizzle-orm';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    let query = db.select().from(eventLanes).$dynamic();

    if (eventId) {
      query = query.where(eq(eventLanes.eventId, eventId));
    }

    const lanes = await query;

    return NextResponse.json({ lanes });
  } catch (error) {
    console.error('Error fetching event lanes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event lanes' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(requirePermission('cards:view')(handleGET));
