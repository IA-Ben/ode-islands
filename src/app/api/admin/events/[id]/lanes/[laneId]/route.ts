import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { eventLanes } from '@/shared/schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
  params: { id: string; laneId: string };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { laneId } = params;

    const [lane] = await db
      .select()
      .from(eventLanes)
      .where(eq(eventLanes.id, laneId))
      .limit(1);

    if (!lane) {
      return NextResponse.json({ error: 'Lane not found' }, { status: 404 });
    }

    return NextResponse.json({ lane });
  } catch (error) {
    console.error('Error fetching lane:', error);
    return NextResponse.json({ error: 'Failed to fetch lane' }, { status: 500 });
  }
}
