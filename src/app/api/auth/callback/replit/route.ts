import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Redirect to the passport callback route with query parameters
  const searchParams = request.nextUrl.searchParams;
  const callbackUrl = new URL('/api/callback', request.url);
  
  // Forward all query parameters to the passport callback
  searchParams.forEach((value, key) => {
    callbackUrl.searchParams.set(key, value);
  });
  
  return NextResponse.redirect(callbackUrl.toString());
}