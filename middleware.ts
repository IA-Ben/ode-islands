import { NextRequest, NextResponse } from 'next/server';

/**
 * Secure Next.js middleware for route protection (Edge Runtime Compatible)
 *
 * CRITICAL SECURITY NOTES:
 * - Middleware runs in Edge Runtime (not Node.js)
 * - Cannot use database/Drizzle (process.env, pg connections unavailable)
 * - Cookie checks only - DB validation happens in page/API route handlers
 * - This is first line of defense, pages do full auth check
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin/* routes
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  try {
    // EDGE-COMPATIBLE: Check for Stack Auth session cookie
    // Stack Auth uses cookies like 'stack-auth-session' or '__Secure-stack-auth-session'
    const cookies = request.cookies;
    const stackAuthCookie = cookies.get('stack-auth-session') ||
                           cookies.get('__Secure-stack-auth-session') ||
                           cookies.get('connect.sid'); // Fallback for Express sessions

    if (!stackAuthCookie) {
      // No authentication cookie - redirect to login
      const loginUrl = new URL('/signin', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Cookie exists - allow through to page/API handler
    // IMPORTANT: Full authentication + admin check happens in the page's Server Component
    // or API route handler where we have access to database/Stack Auth SDK
    return NextResponse.next();

  } catch (error) {
    console.error('Middleware cookie check failed:', error);
    // On error, redirect to login for safety
    const loginUrl = new URL('/signin', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
}

/**
 * SECURITY NOTE:
 *
 * This middleware provides BASIC cookie-based routing:
 * - If no cookie → redirect to /signin
 * - If cookie exists → allow through to page handler
 *
 * The ACTUAL security enforcement happens in:
 * 1. Page Server Components - use getServerUser() to validate admin status
 * 2. API Routes - use withAdminAuth() wrapper to enforce permissions
 * 3. Server Actions - use getServerUser() before any mutations
 *
 * This two-layer approach is necessary because:
 * - Middleware: Edge Runtime (fast, but no DB access)
 * - Pages/API: Node Runtime (slower, but full Stack Auth + DB validation)
 */

export const config = {
  matcher: [
    // Protect all /admin routes
    '/admin/:path*',
  ],
};