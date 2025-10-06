import { NextRequest, NextResponse } from 'next/server';
import { validateExpressSession, parseCookies, ValidatedSession } from './sessionValidator';

/**
 * Session-based authentication middleware for Next.js API routes
 * Uses Express session validation instead of JWT tokens
 */
export function withSessionAuth(
  handler: (request: NextRequest, context: { params?: any }) => Promise<NextResponse>,
  options: { requireAdmin?: boolean } = {}
) {
  return async (request: NextRequest, context: { params?: any }) => {
    // Parse cookies from request headers
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = parseCookies(cookieHeader);
    
    // Validate Express session
    const session = await validateExpressSession(cookies);

    if (!session.isAuthenticated) {
      return NextResponse.json(
        { success: false, message: 'Authentication required. Please log in.' },
        { status: 401 }
      );
    }

    if (options.requireAdmin && !session.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin access required.' },
        { status: 403 }
      );
    }

    // Add session data to request for use in handler
    (request as any).session = session;

    return handler(request, context);
  };
}

/**
 * User-scoped authentication middleware for Next.js API routes
 * Users can only access their own data, admins can access any data
 */
export function withUserSessionAuth(
  handler: (request: NextRequest, context: { params?: any }) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: { params?: any }) => {
    // Parse cookies from request headers
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = parseCookies(cookieHeader);
    
    // Validate Express session
    const session = await validateExpressSession(cookies);

    if (!session.isAuthenticated) {
      return NextResponse.json(
        { success: false, message: 'Authentication required. Please log in.' },
        { status: 401 }
      );
    }

    // Extract user ID from request (query params or body)
    const url = new URL(request.url);
    const queryUserId = url.searchParams.get('userId');
    let bodyUserId;

    if (request.method !== 'GET') {
      try {
        const body = await request.json();
        bodyUserId = body.userId;
        // Re-create the request with parsed body for handler
        (request as any).parsedBody = body;
      } catch (error) {
        // Body might not be JSON, that's okay
      }
    }

    const requestedUserId = queryUserId || bodyUserId;

    // Admins can access any user's data
    if (session.isAdmin) {
      (request as any).session = session;
      return handler(request, context);
    }

    // Users can only access their own data
    if (requestedUserId && requestedUserId !== session.userId) {
      return NextResponse.json(
        { success: false, message: 'Access denied. You can only access your own data.' },
        { status: 403 }
      );
    }

    (request as any).session = session;
    return handler(request, context);
  };
}

/**
 * Admin authentication middleware for Next.js API routes
 */
export function withAdminSessionAuth(
  handler: (request: NextRequest, context: { params?: any }) => Promise<NextResponse>
) {
  return withSessionAuth(handler, { requireAdmin: true });
}