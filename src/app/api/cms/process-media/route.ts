import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // SECURITY MEASURE: This endpoint is disabled due to critical security vulnerabilities
  // See SECURITY_NOTICE.md for details
  return NextResponse.json(
    { 
      error: 'Media processing endpoint temporarily disabled', 
      message: 'This feature requires proper authentication and security implementation. Please use the existing transcoder system: npm run transcode && npm run upload' 
    }, 
    { status: 503 }
  );
}

// All processing functions have been removed for security reasons
// The existing transcoder system in resources/transcoder should be used instead