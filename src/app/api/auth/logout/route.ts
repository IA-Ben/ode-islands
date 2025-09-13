import { NextRequest } from 'next/server';
import { createLogoutResponse, getSessionFromHeaders } from '../../../../../server/auth';

export async function POST(request: NextRequest) {
  try {
    // Get session to invalidate server-side session
    const session = await getSessionFromHeaders(request);
    
    // Clear the auth session cookie and invalidate server session
    return await createLogoutResponse(session.sessionId);
  } catch (error) {
    console.error('Logout error:', error instanceof Error ? error.message : String(error));
    return await createLogoutResponse(); // Still clear the session even if there's an error
  }
}