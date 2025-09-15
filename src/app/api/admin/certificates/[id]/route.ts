// SECURITY: Legacy admin API route - DISABLED
// All admin operations now go through unified Express routes

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    error: 'This admin endpoint has been deprecated for security reasons.',
    message: 'Please use the unified Express admin API.',
    redirectTo: '/api/cms'
  }, { status: 410 });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    error: 'This admin endpoint has been deprecated for security reasons.',
    message: 'Please use the unified Express admin API.',
    redirectTo: '/api/cms'
  }, { status: 410 });
}

export async function PUT(request: NextRequest) {
  return NextResponse.json({ 
    error: 'This admin endpoint has been deprecated for security reasons.',
    message: 'Please use the unified Express admin API.',
    redirectTo: '/api/cms'
  }, { status: 410 });
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json({ 
    error: 'This admin endpoint has been deprecated for security reasons.',
    message: 'Please use the unified Express admin API.',
    redirectTo: '/api/cms'
  }, { status: 410 });
}
