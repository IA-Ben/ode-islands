import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '../../../../../../server/db';
import { liveEvents } from '../../../../../../shared/schema';
import { validateExpressSession } from '../../../../../../server/sessionValidator';

export async function GET(request: NextRequest) {
  try {
    // Parse cookies from request
    const cookies: { [key: string]: string } = {};
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      cookieHeader.split(';').forEach(cookie => {
        const [name, ...rest] = cookie.trim().split('=');
        if (name && rest.length > 0) {
          cookies[name] = rest.join('=');
        }
      });
    }

    // Validate session directly using sessionValidator
    const session = await validateExpressSession(cookies);
    
    if (!session.isAuthenticated || !session.userId) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    if (!session.isAdmin) {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

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