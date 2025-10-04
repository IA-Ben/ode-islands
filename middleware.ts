import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // TEMP: Authentication disabled for development
  // All routes are accessible without authentication
  // TODO: Re-enable authentication before production deployment
  return NextResponse.next();
  
  /* DISABLED FOR DEVELOPMENT - RE-ENABLE BEFORE PRODUCTION
  const { pathname } = request.nextUrl;

  // Only protect /admin/* routes
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Get session cookie to check authentication
  const sessionCookie = request.cookies.get('connect.sid');
  
  if (!sessionCookie) {
    // Not authenticated - redirect to login
    const loginUrl = new URL('/api/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // For authenticated users, we need to check admin status via API
  // Since middleware runs on the edge, we make a request to our auth endpoint
  try {
    const authCheckUrl = new URL('/api/auth/user', request.url);
    const authResponse = await fetch(authCheckUrl, {
      headers: {
        'Cookie': request.headers.get('cookie') || '',
      },
    });

    if (!authResponse.ok) {
      // Auth check failed - redirect to login
      const loginUrl = new URL('/api/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    const userData = await authResponse.json();
    
    if (!userData.isAdmin) {
      // Authenticated but not admin - return 403
      return new NextResponse('Admin access required', {
        status: 403,
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    // User is admin - allow access
    return NextResponse.next();
    
  } catch (error) {
    console.error('Middleware auth check failed:', error);
    // On error, redirect to login for safety
    const loginUrl = new URL('/api/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  */
}

export const config = {
  matcher: [
    // Protect all /admin routes
    '/admin/:path*',
  ],
};