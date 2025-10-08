// SECURITY: Legacy authentication route - DISABLED
// All authentication now goes through Stack Auth (OAuth)

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'This authentication endpoint has been deprecated for security reasons.',
      message: 'Please use the unified OAuth authentication system.',
      redirectTo: '/api/login'
    },
    { status: 410 } // 410 Gone - Permanently removed
  );
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'This authentication endpoint has been deprecated for security reasons.',
      message: 'Please use the unified OAuth authentication system.',
      redirectTo: '/api/login'
    },
    { status: 410 } // 410 Gone - Permanently removed
  );
}