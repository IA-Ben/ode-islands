import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromHeaders, generateCSRFToken } from '../../../../server/auth';

export async function GET(request: NextRequest) {
  try {
    // Get current session
    const session = await getSessionFromHeaders(request);

    if (!session.isAuthenticated || !session.sessionId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required to generate CSRF token' },
        { status: 401 }
      );
    }

    // Generate fresh CSRF token
    const csrfToken = generateCSRFToken(session.sessionId);

    const response = NextResponse.json({
      success: true,
      csrfToken: csrfToken,
    });

    // Also set the CSRF token as a cookie for convenience
    response.cookies.set('csrf-token', csrfToken, {
      httpOnly: false, // JavaScript needs access to include in requests
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60, // 1 hour in seconds
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? process.env.DOMAIN : undefined,
    });

    return response;

  } catch (error) {
    console.error('CSRF token generation error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}