import { NextRequest, NextResponse } from 'next/server';
import { withSessionAuth } from '../../../../../server/sessionAuth';

// GET /api/auth/user - Get current user information
export const GET = withSessionAuth(async (request: NextRequest) => {
  const session = (request as any).session;
  
  // Return user data in the format expected by useAuth and middleware
  return NextResponse.json({
    id: session.userId,
    email: session.user?.email || '',
    firstName: session.user?.firstName || '',
    lastName: session.user?.lastName || '',
    profileImageUrl: session.user?.profileImageUrl,
    isAdmin: session.isAdmin || false
  });
});