import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromHeaders } from '../../../../../../../server/auth';
import { db } from '../../../../../../../server/db';
import { liveEvents } from '../../../../../../../shared/schema';
import { eq } from 'drizzle-orm';

// Get venue information for a specific event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    
    // Get user session and verify admin access
    const session = await getSessionFromHeaders(request);
    if (!session.isAuthenticated || !session.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin privileges required' },
        { status: 403 }
      );
    }
    
    // Get the event with venue information
    const event = await db
      .select({
        id: liveEvents.id,
        title: liveEvents.title,
        venueName: liveEvents.venueName,
        venueAddress: liveEvents.venueAddress,
        venueLatitude: liveEvents.venueLatitude,
        venueLongitude: liveEvents.venueLongitude,
        venueDetails: liveEvents.venueDetails,
        startTime: liveEvents.startTime,
        endTime: liveEvents.endTime
      })
      .from(liveEvents)
      .where(eq(liveEvents.id, eventId))
      .limit(1);
    
    if (event.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Event not found' },
        { status: 404 }
      );
    }
    
    const eventData = event[0];
    
    // Parse venue details from JSON
    const venueDetails = eventData.venueDetails ? 
      (typeof eventData.venueDetails === 'string' ? 
        JSON.parse(eventData.venueDetails) : eventData.venueDetails) : {};
    
    return NextResponse.json({
      success: true,
      venue: {
        eventId: eventData.id,
        eventTitle: eventData.title,
        venueName: eventData.venueName,
        venueAddress: eventData.venueAddress,
        venueLatitude: eventData.venueLatitude ? parseFloat(eventData.venueLatitude) : null,
        venueLongitude: eventData.venueLongitude ? parseFloat(eventData.venueLongitude) : null,
        venueDetails: {
          section: venueDetails.section || null,
          gate: venueDetails.gate || null,
          doorsOpenTime: venueDetails.doorsOpenTime || null,
          accessNotes: venueDetails.accessNotes || null,
          parkingInfo: venueDetails.parkingInfo || null,
          transportInfo: venueDetails.transportInfo || null,
          ...venueDetails
        },
        startTime: eventData.startTime,
        endTime: eventData.endTime
      }
    });
    
  } catch (error) {
    console.error('Error fetching venue information:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch venue information' },
      { status: 500 }
    );
  }
}

// Update venue information for a specific event
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const data = await request.json();
    
    // Get user session and verify admin access
    const session = await getSessionFromHeaders(request);
    if (!session.isAuthenticated || !session.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin privileges required' },
        { status: 403 }
      );
    }
    
    const {
      venueName,
      venueAddress,
      venueLatitude,
      venueLongitude,
      venueDetails
    } = data;
    
    // Validate coordinate data if provided
    if ((venueLatitude !== null && venueLatitude !== undefined) && 
        (typeof venueLatitude !== 'number' || venueLatitude < -90 || venueLatitude > 90)) {
      return NextResponse.json(
        { success: false, message: 'Invalid latitude value. Must be between -90 and 90.' },
        { status: 400 }
      );
    }
    
    if ((venueLongitude !== null && venueLongitude !== undefined) && 
        (typeof venueLongitude !== 'number' || venueLongitude < -180 || venueLongitude > 180)) {
      return NextResponse.json(
        { success: false, message: 'Invalid longitude value. Must be between -180 and 180.' },
        { status: 400 }
      );
    }
    
    // Check if event exists
    const existingEvent = await db
      .select({ id: liveEvents.id })
      .from(liveEvents)
      .where(eq(liveEvents.id, eventId))
      .limit(1);
    
    if (existingEvent.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Event not found' },
        { status: 404 }
      );
    }
    
    // Update the event with venue information
    const updatedEvent = await db
      .update(liveEvents)
      .set({
        venueName: venueName || null,
        venueAddress: venueAddress || null,
        venueLatitude: (venueLatitude !== null && venueLatitude !== undefined) ? 
          venueLatitude.toString() : null,
        venueLongitude: (venueLongitude !== null && venueLongitude !== undefined) ? 
          venueLongitude.toString() : null,
        venueDetails: venueDetails || null
      })
      .where(eq(liveEvents.id, eventId))
      .returning({
        id: liveEvents.id,
        title: liveEvents.title,
        venueName: liveEvents.venueName,
        venueAddress: liveEvents.venueAddress,
        venueLatitude: liveEvents.venueLatitude,
        venueLongitude: liveEvents.venueLongitude,
        venueDetails: liveEvents.venueDetails
      });
    
    if (updatedEvent.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Failed to update venue information' },
        { status: 500 }
      );
    }
    
    const eventData = updatedEvent[0];
    
    return NextResponse.json({
      success: true,
      message: 'Venue information updated successfully',
      venue: {
        eventId: eventData.id,
        eventTitle: eventData.title,
        venueName: eventData.venueName,
        venueAddress: eventData.venueAddress,
        venueLatitude: eventData.venueLatitude ? parseFloat(eventData.venueLatitude) : null,
        venueLongitude: eventData.venueLongitude ? parseFloat(eventData.venueLongitude) : null,
        venueDetails: eventData.venueDetails
      }
    });
    
  } catch (error) {
    console.error('Error updating venue information:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update venue information' },
      { status: 500 }
    );
  }
}