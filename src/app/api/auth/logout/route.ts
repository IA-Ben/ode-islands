// SECURITY: Legacy authentication route - DISABLED  
// All authentication now goes through unified Replit Auth system

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'This authentication endpoint has been deprecated for security reasons.',
      message: 'Please use the unified OAuth logout system.',
      redirectTo: '/api/logout'
    },
    { status: 410 } // 410 Gone - Permanently removed
  );
}