import * as signature from 'cookie-signature';
import { db } from './db';
import { users, sessions } from '../shared/schema';
import { eq } from 'drizzle-orm';

export interface ValidatedSession {
  isAuthenticated: boolean;
  userId?: string;
  isAdmin?: boolean;
  sessionId?: string;
}

/**
 * Unified session validation utility for both WebSocket and API routes
 * Validates Express session cookies and returns user information
 */
export async function validateExpressSession(cookies: { [key: string]: string }): Promise<ValidatedSession> {
  try {
    const sessionCookie = cookies['connect.sid'];

    if (!sessionCookie) {
      return { isAuthenticated: false };
    }

    // Parse and verify the Express session cookie signature
    let sessionId = sessionCookie;
    
    // Properly unsign the cookie using SESSION_SECRET
    if (sessionId.startsWith('s:')) {
      sessionId = sessionId.substring(2); // Remove 's:' prefix
      const unsigned = signature.unsign(sessionId, process.env.SESSION_SECRET!);
      
      if (unsigned === false) {
        console.log('Invalid session cookie signature');
        return { isAuthenticated: false };
      }
      
      sessionId = unsigned;
    }

    // Verify server-side session exists in Express session store
    const serverSession = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sid, sessionId))
      .limit(1);

    if (serverSession.length === 0) {
      return { isAuthenticated: false };
    }

    // Check if session has expired
    if (serverSession[0].expire < new Date()) {
      // Clean up expired session
      await db.delete(sessions).where(eq(sessions.sid, sessionId));
      return { isAuthenticated: false };
    }

    // Get user info from session data
    const sessionData = serverSession[0].sess as any;
    let userId = null;

    // Extract user ID from session (could be in different formats depending on Passport setup)
    if (sessionData.passport && sessionData.passport.user) {
      // If user info is stored in passport.user
      const passportUser = sessionData.passport.user;
      if (typeof passportUser === 'string') {
        userId = passportUser;
      } else if (passportUser.claims && passportUser.claims.sub) {
        userId = passportUser.claims.sub;
      } else if (passportUser.id) {
        userId = passportUser.id;
      }
    } else if (sessionData.userId) {
      // Direct userId in session
      userId = sessionData.userId;
    }

    if (!userId) {
      return { isAuthenticated: false };
    }

    // Verify user exists in database and get current info
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      return { isAuthenticated: false };
    }

    return {
      isAuthenticated: true,
      userId,
      isAdmin: user[0].isAdmin ?? false,
      sessionId
    };

  } catch (error) {
    console.error('Session validation error:', error);
    return { isAuthenticated: false };
  }
}

/**
 * Parse cookies from a cookie header string
 */
export function parseCookies(cookieHeader: string): { [key: string]: string } {
  const cookies: { [key: string]: string } = {};
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  });

  return cookies;
}