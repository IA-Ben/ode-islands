import { NextRequest, NextResponse } from 'next/server';
import { stackServerApp } from '../src/stack/server';
import { db } from './db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

export interface SessionData {
  isAuthenticated: boolean;
  userId?: string;
  isAdmin?: boolean;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isAdmin: boolean;
    profileImageUrl?: string;
  };
}

/**
 * Get session from Neon Auth
 */
export async function getSessionFromHeaders(request: NextRequest): Promise<SessionData> {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return { isAuthenticated: false };
    }

    // Sync user to database and check admin status
    const dbUser = await syncUserToDatabase(user);

    return {
      isAuthenticated: true,
      userId: user.id,
      isAdmin: dbUser.isAdmin ?? false,
      user: {
        id: user.id,
        email: user.primaryEmail ?? '',
        firstName: user.displayName?.split(' ')[0] ?? '',
        lastName: user.displayName?.split(' ').slice(1).join(' ') ?? '',
        isAdmin: dbUser.isAdmin ?? false,
        profileImageUrl: user.profileImageUrl ?? undefined,
      }
    };
  } catch (error) {
    console.error('Session validation error:', error);
    return { isAuthenticated: false };
  }
}

/**
 * Check if email should have admin access
 */
function shouldBeAdmin(email: string): boolean {
  // Auto-admin for @immersiv.es domain
  if (email.endsWith('@immersiv.es')) {
    return true;
  }

  // Check ADMIN_EMAILS environment variable
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
  return adminEmails.includes(email);
}

/**
 * Sync Neon Auth user to local database
 */
async function syncUserToDatabase(stackUser: any) {
  try {
    const email = stackUser.primaryEmail ?? '';
    const isAdmin = shouldBeAdmin(email);

    const userData = {
      id: stackUser.id,
      email,
      firstName: stackUser.displayName?.split(' ')[0] ?? '',
      lastName: stackUser.displayName?.split(' ').slice(1).join(' ') ?? '',
      profileImageUrl: stackUser.profileImageUrl ?? null,
      isAdmin, // Set admin status based on email
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    };

    // Upsert user
    await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          isAdmin: userData.isAdmin, // Update admin status on each login
          lastLoginAt: userData.lastLoginAt,
          updatedAt: userData.updatedAt,
        },
      });

    // Get user with admin status
    const dbUsers = await db
      .select()
      .from(users)
      .where(eq(users.id, stackUser.id))
      .limit(1);

    if (dbUsers.length === 0) {
      throw new Error('User not found after sync');
    }

    console.log(`✅ Synced user ${email} (isAdmin: ${isAdmin})`);
    return dbUsers[0];
  } catch (error) {
    console.error('Failed to sync user to database:', error);
    throw error;
  }
}

/**
 * Get server user for Server Components
 */
export async function getServerUser() {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return null;
    }

    const dbUser = await syncUserToDatabase(user);

    return {
      id: user.id,
      email: user.primaryEmail ?? '',
      firstName: user.displayName?.split(' ')[0] ?? '',
      lastName: user.displayName?.split(' ').slice(1).join(' ') ?? '',
      isAdmin: dbUser.isAdmin ?? false,
      profileImageUrl: user.profileImageUrl ?? undefined,
      permissions: dbUser.isAdmin ? ['*'] : [],
    };
  } catch (error) {
    console.error('Failed to get server user:', error);
    return null;
  }
}

/**
 * Auth middleware for Next.js API routes
 */
export function withAuth(
  handler: (request: NextRequest, context: { params?: any }) => Promise<NextResponse>,
  options: { requireAdmin?: boolean } = {}
) {
  return async (request: NextRequest, context: { params?: any }) => {
    const session = await getSessionFromHeaders(request);

    if (!session.isAuthenticated) {
      return NextResponse.json(
        { success: false, message: 'Authentication required. Please log in.' },
        { status: 401 }
      );
    }

    if (options.requireAdmin && !session.isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Admin access required.' },
        { status: 403 }
      );
    }

    // Add session data to request
    (request as any).session = session;

    return handler(request, context);
  };
}

/**
 * User-scoped authorization middleware
 */
export function withUserAuth(
  handler: (request: NextRequest, context: { params?: any }) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: { params?: any }) => {
    const session = await getSessionFromHeaders(request);

    if (!session.isAuthenticated) {
      return NextResponse.json(
        { success: false, message: 'Authentication required. Please log in.' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const queryUserId = url.searchParams.get('userId');
    let bodyUserId;

    if (request.method !== 'GET') {
      try {
        const body = await request.json();
        bodyUserId = body.userId;
        (request as any).parsedBody = body;
      } catch (error) {
        // Body might not be JSON
      }
    }

    const requestedUserId = queryUserId || bodyUserId;

    // Admins can access any user's data
    if (session.isAdmin) {
      (request as any).session = session;
      return handler(request, context);
    }

    // Users can only access their own data
    if (requestedUserId && requestedUserId !== session.userId) {
      return NextResponse.json(
        { success: false, message: 'Access denied. You can only access your own data.' },
        { status: 403 }
      );
    }

    (request as any).session = session;
    return handler(request, context);
  };
}

/**
 * Express middleware for backward compatibility
 */
export function requireAuth(req: any, res: any, next: any) {
  if (req.session?.isAuthenticated && req.session?.userId) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: 'Authentication required. Please log in.'
  });
}

export function requireAdmin(req: any, res: any, next: any) {
  if (req.session?.isAuthenticated && req.session?.isAdmin) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Admin access required.'
  });
}
