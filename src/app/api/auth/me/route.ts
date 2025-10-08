import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromHeaders } from '../../../../../server/auth';

/**
 * GET /api/auth/me
 * Returns current authenticated user with admin status and permissions
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromHeaders(request);

    if (!session.isAuthenticated || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Return user data with admin status and permissions
    const userData = {
      id: session.user.id,
      email: session.user.email,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      profileImageUrl: session.user.profileImageUrl,
      isAdmin: session.user.isAdmin,
      permissions: session.user.isAdmin
        ? ['*', 'system:admin', 'content:view', 'content:edit', 'content:delete', 'content:publish']
        : ['content:view']
    };

    return NextResponse.json({
      success: true,
      ...userData
    });

  } catch (error) {
    console.error('Failed to get current user:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve user data' },
      { status: 500 }
    );
  }
}
