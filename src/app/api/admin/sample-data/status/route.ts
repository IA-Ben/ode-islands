import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '../../../../../../server/db';
import { liveEvents } from '../../../../../../shared/schema';
import { withAuth } from '../../../../../../server/auth';

async function handleGET(request: NextRequest) {
  try {
    // Session is already validated by withAuth middleware
    // Check if sample data exists by looking for the marker event
    const existingSampleEvents = await db
      .select()
      .from(liveEvents)
      .where(eq(liveEvents.title, "The Ode Islands: Immersive Journey"))
      .limit(1);

    const sampleDataExists = existingSampleEvents.length > 0;

    return NextResponse.json({
      sampleDataExists,
      eventCount: existingSampleEvents.length
    });

  } catch (error) {
    console.error('Error checking sample data status:', error);
    
    return NextResponse.json(
      { message: 'Failed to check sample data status' },
      { status: 500 }
    );
  }
}

// Wrap with JWT auth middleware (admin only)
export const GET = withAuth(handleGET, { requireAdmin: true });
