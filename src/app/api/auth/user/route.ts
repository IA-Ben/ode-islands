import { NextRequest, NextResponse } from 'next/server';
import { withSessionAuth } from '../../../../../server/sessionAuth';
import { storage } from '../../../../../server/storage';

// GET /api/auth/user - Get current user information with permissions
export const GET = withSessionAuth(async (request: NextRequest) => {
  const session = (request as any).session;
  
  let permissions: string[] = [];
  try {
    if (session.userId) {
      permissions = await storage.getUserPermissions(session.userId);
    }
  } catch (error) {
    console.error('Error fetching user permissions:', error);
  }
  
  // Return user data in the format expected by useAuth and middleware
  return NextResponse.json({
    id: session.userId,
    email: session.user?.email || '',
    firstName: session.user?.firstName || '',
    lastName: session.user?.lastName || '',
    profileImageUrl: session.user?.profileImageUrl,
    isAdmin: session.isAdmin || false,
    permissions
  });
});