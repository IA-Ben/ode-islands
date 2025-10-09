import { NextRequest } from 'next/server';
import { GET as getMeHandler } from '../me/route';

/**
 * GET /api/auth/user
 * Alias for /api/auth/me for backward compatibility
 * Returns current authenticated user with admin status and permissions
 */
export async function GET(request: NextRequest) {
  return getMeHandler(request);
}
