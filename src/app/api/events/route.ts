import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { liveEvents } from '../../../../shared/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { withAuth, withAuthAndCSRF } from '../../../../server/auth';

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const upcoming = searchParams.get('upcoming');

    // Build query conditions
    const conditions = [];
    if (isActive) conditions.push(eq(liveEvents.isActive, isActive === 'true'));
    if (upcoming === 'true') {
      conditions.push(gte(liveEvents.startTime, new Date()));
    }

    // Get events
    const events = await db
      .select()
      .from(liveEvents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(liveEvents.startTime));

    return NextResponse.json({
      success: true,
      events: events,
    });

  } catch (error) {
    console.error('Events fetch error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body = (request as any).parsedBody || await request.json();
    const { title, description, startTime, endTime, settings, createdBy } = body;

    // Validate required fields
    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, message: 'Title, start time, and end time are required' },
        { status: 400 }
      );
    }

    // Validate date range
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (start >= end) {
      return NextResponse.json(
        { success: false, message: 'End time must be after start time' },
        { status: 400 }
      );
    }

    // Create new event
    const newEvent = await db
      .insert(liveEvents)
      .values({
        title,
        description,
        startTime: start,
        endTime: end,
        settings: settings ? JSON.stringify(settings) : null,
        createdBy,
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: 'Event created successfully',
      event: newEvent[0],
    });

  } catch (error) {
    console.error('Event creation error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to create event' },
      { status: 500 }
    );
  }
}

// Apply authentication middleware
export const GET = withAuth(handleGET); // Events can be viewed by authenticated users
export const POST = withAuthAndCSRF(handlePOST, { requireAdmin: true }); // Only admins can create events + CSRF protection