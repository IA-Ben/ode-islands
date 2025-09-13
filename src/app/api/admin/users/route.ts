import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../server/db';
import { users } from '../../../../../shared/schema';
import { desc } from 'drizzle-orm';
import { withAuth } from '../../../../../server/auth';

async function handleGET(request: NextRequest) {
  try {
    // Fetch all users for admin view (excluding sensitive fields)
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        isAdmin: users.isAdmin,
        emailVerified: users.emailVerified,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return NextResponse.json({
      success: true,
      users: allUsers
    });

  } catch (error) {
    console.error('Admin users fetch error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, message: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// Apply admin authentication middleware
export const GET = withAuth(handleGET, { requireAdmin: true });