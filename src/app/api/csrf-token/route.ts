// SECURITY: Legacy CSRF endpoint - DISABLED
// Use the unified Express /api/csrf-token endpoint instead

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'This CSRF endpoint has been deprecated for security reasons.',
      message: 'Please use the unified Express endpoint at /api/csrf-token',
      redirectTo: '/api/csrf-token'
    },
    { status: 410 } // 410 Gone - Permanently removed
  );
}