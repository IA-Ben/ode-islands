import { NextRequest } from 'next/server';
import { respondOkCompat } from '../../../lib/apiHelpers';

// GET /api/csrf-token - Get CSRF token for secure requests
export async function GET(request: NextRequest) {
  // Generate a simple CSRF token based on session
  const sessionCookie = request.cookies.get('connect.sid');
  const timestamp = Date.now();
  
  // Create a simple token (in production, this should be more secure)
  const csrfToken = Buffer.from(`${sessionCookie?.value || 'anonymous'}-${timestamp}`).toString('base64');
  
  // Use helper for consistent response format with backward compatibility
  // Note: Pass raw token value so legacy key gets string, not object
  return respondOkCompat(csrfToken, {
    legacyKey: 'csrfToken', 
    message: 'CSRF token generated successfully',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache', 
      'Expires': '0'
    }
  });
}