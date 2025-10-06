import { NextRequest, NextResponse } from 'next/server';
import { withSessionAuth } from '../../../../../server/sessionAuth';
import { storage } from '../../../../../server/storage';
import { createAuthResponse } from '../../../../../server/auth';
import { db } from '../../../../../server/db';
import { users } from '../../../../../shared/schema';
import { eq } from 'drizzle-orm';

// GET /api/auth/user - Get current user information with permissions
// This endpoint bridges Passport sessions to JWT cookies
export const GET = withSessionAuth(async (request: NextRequest) => {
  const session = (request as any).session;
  
  // Fetch full user data from database
  const userResult = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
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
    permissions = await storage.getUserPermissions(session.userId);
  } catch (error) {
    console.error('Error fetching user permissions:', error);
  }
  
  // Create JWT auth-session cookie using createAuthResponse
  // This bridges the Passport session to JWT for use by getServerUser()
  const authResponse = await createAuthResponse(user, true, 'User authenticated');
  
  // Extract response body
  const authBody = await authResponse.json();
  
  // Create final response with permissions included
  const finalResponse = NextResponse.json({
    ...authBody.user,
    permissions
  });
  
  // Copy Set-Cookie headers from createAuthResponse to final response
  const cookies = authResponse.headers.getSetCookie();
  for (const cookie of cookies) {
    finalResponse.headers.append('Set-Cookie', cookie);
  }
  
  return finalResponse;
});