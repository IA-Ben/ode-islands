import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '../../../../server/simplifiedAuth';
import { storage } from '../../../../server/storage';
import { db } from '../../../../server/db';
import { users } from '../../../../shared/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Extract JWT from cookie
    const authCookie = request.cookies.get('auth-session');
    
    if (!authCookie) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Verify JWT token with RS256
    let payload;
    try {
      payload = verifyJWT(authCookie.value);
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired session' },
        { status: 401 }
      );
    }
    
    // Fetch full user data from database
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);
    
    if (userResult.length === 0) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }
    
    const user = userResult[0];
    
    // Fetch user permissions
    let permissions: string[] = [];
    try {
      permissions = await storage.getUserPermissions(payload.userId);
    } catch (error) {
      console.error('Error fetching user permissions:', error);
    }
    
    // Return user data with permissions
    return NextResponse.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      isAdmin: user.isAdmin ?? false,
      permissions
    });
  } catch (error) {
    console.error('Error in /api/me:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
