import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../server/db';
import { liveEvents } from '../../../../../../shared/schema';
import { eq } from 'drizzle-orm';

// Get venue information for a specific event (public endpoint)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    
    // Get the event with venue information (no auth required for public venue info)
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
        endTime: liveEvents.endTime,
        isActive: liveEvents.isActive
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
    
    // Check if venue information is available
    const hasVenueInfo = !!(eventData.venueName || eventData.venueAddress);
    
    return NextResponse.json({
      success: true,
      hasVenueInfo,
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
        endTime: eventData.endTime,
        isActive: eventData.isActive
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