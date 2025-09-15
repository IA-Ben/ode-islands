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

async function handlePATCH(request: NextRequest) {
  try {
    const body = (request as any).parsedBody || await request.json();
    const { eventId, isActive } = body;
    const session = (request as any).session;

    // Validate required fields
    if (!eventId) {
      return NextResponse.json(
        { success: false, message: 'Event ID is required' },
        { status: 400 }
      );
    }

    // Check if event exists and verify ownership/admin permissions
    const existingEvent = await db
      .select()
      .from(liveEvents)
      .where(eq(liveEvents.id, eventId))
      .limit(1);

    if (existingEvent.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Event not found' },
        { status: 404 }
      );
    }

    // SECURITY: Allow event updates only by admins or event creators
    const event = existingEvent[0];
    const canUpdate = session.isAdmin || event.createdBy === session.userId;
    
    if (!canUpdate) {
      return NextResponse.json(
        { success: false, message: 'Access denied. Only administrators or event creators can modify events.' },
        { status: 403 }
      );
    }

    // Prepare update data - only update fields that are provided
    const updateData: any = {};
    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
    }

    // Update the event
    const updatedEvent = await db
      .update(liveEvents)
      .set(updateData)
      .where(eq(liveEvents.id, eventId))
      .returning();

    return NextResponse.json({
      success: true,
      message: `Event ${isActive ? 'activated' : 'deactivated'} successfully`,
      event: updatedEvent[0],
    });

  } catch (error) {
    console.error('Event update error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to update event' },
      { status: 500 }
    );
  }
}

// Apply authentication middleware
export const GET = withAuth(handleGET); // Events can be viewed by authenticated users
export const POST = withAuthAndCSRF(handlePOST, { requireAdmin: true }); // Only admins can create events + CSRF protection
export const PATCH = withAuthAndCSRF(handlePATCH, { requireAdmin: true }); // Only admins can update events + CSRF protection