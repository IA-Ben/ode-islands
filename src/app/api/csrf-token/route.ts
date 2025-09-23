import { NextRequest, NextResponse } from 'next/server';

// GET /api/csrf-token - Get CSRF token for secure requests
export async function GET(request: NextRequest) {
  // Generate a simple CSRF token based on session
  const sessionCookie = request.cookies.get('connect.sid');
  const timestamp = Date.now();
  
  // Create a simple token (in production, this should be more secure)
  const csrfToken = Buffer.from(`${sessionCookie?.value || 'anonymous'}-${timestamp}`).toString('base64');
  
  return NextResponse.json({
    success: true,
    csrfToken
  });
}