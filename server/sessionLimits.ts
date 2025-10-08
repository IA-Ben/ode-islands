import { db } from './db';
import { sessions } from '../shared/schema';
import { eq, desc, and, gt } from 'drizzle-orm';
import { AuditLogger } from './auditLogger';

/**
 * Concurrent Session Limits
 *
 * Enforces maximum number of concurrent sessions per user to prevent
 * account sharing and resource exhaustion.
 *
 * Security Properties:
 * - Maximum 5 active sessions per user
 * - Oldest sessions automatically removed
 * - Audit logging of limit enforcement
 * - Per-user tracking (not global)
 *
 * Use Cases:
 * - Prevent account sharing
 * - Limit resource usage per user
 * - Security compliance (concurrent session limits)
 */

export const MAX_SESSIONS_PER_USER = 5;

export interface SessionLimitResult {
  allowed: boolean;
  currentSessionCount: number;
  removedSessions?: string[];
  message?: string;
}

/**
 * Get active sessions for a user
 *
 * @param userId - User ID
 * @returns Array of active session records
 */
export async function getActiveSessions(userId: string) {
  try {
    // Get all non-expired sessions for this user
    const now = new Date();

    const userSessions = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.sess, userId), // Note: This might need adjustment based on your schema
          gt(sessions.expire, now)
        )
      )
      .orderBy(desc(sessions.expire));

    return userSessions;
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    return [];
  }
}

/**
 * Enforce session limit for a user
 *
 * If user has >= MAX_SESSIONS_PER_USER, remove oldest sessions
 *
 * @param userId - User ID
 * @returns SessionLimitResult
 */
export async function enforceSessionLimit(userId: string): Promise<SessionLimitResult> {
  try {
    // Get all active sessions, ordered by expiry (newest first)
    const now = new Date();

    // Query sessions from the 'session' JSON column
    // Note: This is PostgreSQL-specific JSONB query
    const activeSessions = await db.execute(`
      SELECT sid, sess, expire
      FROM sessions
      WHERE (sess->>'userId')::text = $1
        AND expire > $2
      ORDER BY expire DESC
    `, [userId, now]);

    const sessionCount = activeSessions.rows.length;

    if (sessionCount < MAX_SESSIONS_PER_USER) {
      return {
        allowed: true,
        currentSessionCount: sessionCount
      };
    }

    // Remove oldest sessions (keep only MAX_SESSIONS_PER_USER - 1, making room for new one)
    const sessionsToKeep = MAX_SESSIONS_PER_USER - 1;
    const sessionsToRemove = activeSessions.rows.slice(sessionsToKeep);

    const removedSessionIds: string[] = [];

    for (const session of sessionsToRemove) {
      const sid = session.sid as string;

      await db
        .delete(sessions)
        .where(eq(sessions.sid, sid));

      removedSessionIds.push(sid);
    }

    // Log enforcement
    await AuditLogger.log({
      action: 'session_limit_enforced',
      severity: 'info',
      userId,
      metadata: {
        removedSessionIds: removedSessionIds.map(id => id.substring(0, 8) + '...'),
        totalSessionsBefore: sessionCount,
        totalSessionsAfter: sessionsToKeep,
        limit: MAX_SESSIONS_PER_USER
      }
    });

    console.log(
      `🔒 Session limit enforced for user ${userId}:`,
      `Removed ${removedSessionIds.length} oldest session(s)`,
      `(${sessionCount} → ${sessionsToKeep})`
    );

    return {
      allowed: true,
      currentSessionCount: sessionsToKeep,
      removedSessions: removedSessionIds,
      message: `Removed ${removedSessionIds.length} oldest session(s) to enforce limit`
    };

  } catch (error) {
    console.error('Error enforcing session limit:', error);

    return {
      allowed: true, // Don't block login if enforcement fails
      currentSessionCount: 0,
      message: 'Failed to enforce session limit'
    };
  }
}

/**
 * Check if user would exceed session limit
 *
 * @param userId - User ID
 * @returns true if user is at or above limit
 */
export async function isAtSessionLimit(userId: string): Promise<boolean> {
  try {
    const now = new Date();

    const result = await db.execute(`
      SELECT COUNT(*) as count
      FROM sessions
      WHERE (sess->>'userId')::text = $1
        AND expire > $2
    `, [userId, now]);

    const count = parseInt(result.rows[0]?.count as string || '0');

    return count >= MAX_SESSIONS_PER_USER;
  } catch (error) {
    console.error('Error checking session limit:', error);
    return false; // Don't block on error
  }
}

/**
 * Get session count for user
 *
 * @param userId - User ID
 * @returns Number of active sessions
 */
export async function getSessionCount(userId: string): Promise<number> {
  try {
    const now = new Date();

    const result = await db.execute(`
      SELECT COUNT(*) as count
      FROM sessions
      WHERE (sess->>'userId')::text = $1
        AND expire > $2
    `, [userId, now]);

    return parseInt(result.rows[0]?.count as string || '0');
  } catch (error) {
    console.error('Error getting session count:', error);
    return 0;
  }
}

/**
 * Express middleware to enforce session limits
 * Call this after successful authentication/login
 */
export async function enforceSessionLimitMiddleware(userId: string): Promise<void> {
  try {
    await enforceSessionLimit(userId);
  } catch (error) {
    console.error('Session limit enforcement middleware error:', error);
    // Don't throw - allow login to proceed even if limit enforcement fails
  }
}
