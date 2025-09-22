// SECURITY: Legacy authentication route - DISABLED  
// All authentication now goes through unified Replit Auth system

import { NextRequest, NextResponse } from 'next/server';

// Redirect all legacy logout requests to proper OAuth endpoint
export async function POST(request: NextRequest) {
  return NextResponse.redirect(new URL('/api/logout', request.url));
}

export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/api/logout', request.url));
}