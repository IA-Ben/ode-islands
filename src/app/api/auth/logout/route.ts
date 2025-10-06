import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '../../../../server/jwtUtils';
import { db } from '../../../../server/db';
import { sessions } from '../../../../shared/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Get auth cookie
    const authCookie = request.cookies.get('auth-session');
    
    if (authCookie) {
      try {
        // Verify and get session ID
        const payload = verifyJWT(authCookie.value);
        
        // Delete session from database
        if (payload.sessionId) {
          await db.delete(sessions).where(eq(sessions.sid, payload.sessionId));
        }
      } catch (error) {
        // Token invalid or expired, that's okay - we'll clear it anyway
        console.log('Token verification failed during logout:', error);
      }
    }
    
    // Create response
    const response = new NextResponse(null, { status: 204 });
    
    // Clear auth cookie
    response.cookies.set('auth-session', '', {
      httpOnly: true,
      secure: false, // Development setting
      sameSite: 'lax',
      maxAge: 0, // Immediately expire
      path: '/'
    });
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Support GET for backward compatibility
  return POST(request);
}