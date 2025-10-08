import { Request, Response } from 'express';
import { AuditLogger } from './auditLogger';

/**
 * Session Rotation for Privilege Escalation Prevention
 *
 * Rotates session ID when user's privileges change to prevent session fixation attacks.
 *
 * Security Properties:
 * - New session ID generated on privilege change
 * - Old session data preserved
 * - Audit logging of rotation events
 * - Prevents session fixation attacks
 *
 * Use Cases:
 * - User granted admin privileges
 * - User admin privileges revoked
 * - Any privilege level change
 */

export interface SessionRotationResult {
  success: boolean;
  oldSessionId?: string;
  newSessionId?: string;
  error?: string;
}

/**
 * Rotate session ID while preserving session data
 *
 * @param req - Express request with session
 * @param reason - Reason for rotation (e.g., 'privilege_escalation')
 * @returns Promise<SessionRotationResult>
 */
export async function rotateSession(
  req: Request,
  reason: string = 'privilege_escalation'
): Promise<SessionRotationResult> {
  try {
    const session = (req as any).session;

    if (!session) {
      return {
        success: false,
        error: 'No session found'
      };
    }

    const oldSessionId = session.id;
    const userId = session.userId;
    const isAdmin = session.isAdmin;
    const fingerprint = session.fingerprint;

    // Regenerate session (creates new session ID)
    await new Promise<void>((resolve, reject) => {
      session.regenerate((err: any) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    // Restore session data with new session ID
    (req as any).session.userId = userId;
    (req as any).session.isAdmin = isAdmin;
    (req as any).session.fingerprint = fingerprint;

    const newSessionId = (req as any).session.id;

    // Log rotation event
    await AuditLogger.log({
      action: 'session_rotated',
      severity: 'info',
      userId,
      metadata: {
        oldSessionId: oldSessionId?.substring(0, 8) + '...',
        newSessionId: newSessionId?.substring(0, 8) + '...',
        reason,
        isAdmin
      }
    });

    console.log(
      `🔄 Session rotated for user ${userId}:`,
      `${oldSessionId?.substring(0, 8)}... → ${newSessionId?.substring(0, 8)}...`,
      `(reason: ${reason})`
    );

    return {
      success: true,
      oldSessionId,
      newSessionId
    };

  } catch (error) {
    console.error('Session rotation error:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Rotate session if privilege level changes
 *
 * @param req - Express request
 * @param newIsAdmin - New admin status
 * @returns Promise<SessionRotationResult>
 */
export async function rotateSessionOnPrivilegeChange(
  req: Request,
  newIsAdmin: boolean
): Promise<SessionRotationResult> {
  const currentIsAdmin = (req as any).session?.isAdmin || false;

  // Only rotate if privilege level actually changed
  if (currentIsAdmin === newIsAdmin) {
    return {
      success: true,
      oldSessionId: (req as any).session?.id,
      newSessionId: (req as any).session?.id
    };
  }

  const reason = newIsAdmin ? 'admin_granted' : 'admin_revoked';

  return rotateSession(req, reason);
}

/**
 * Express middleware to rotate session on privilege change
 * Use this after updating user privileges in the database
 */
export function sessionRotationMiddleware(
  checkPrivilegeChange: (req: Request) => Promise<{ changed: boolean; newIsAdmin: boolean }>
) {
  return async (req: Request, res: Response, next: Function) => {
    try {
      const { changed, newIsAdmin } = await checkPrivilegeChange(req);

      if (changed) {
        const result = await rotateSessionOnPrivilegeChange(req, newIsAdmin);

        if (!result.success) {
          console.error('Failed to rotate session:', result.error);
          // Don't fail the request, just log the error
        }
      }

      next();
    } catch (error) {
      console.error('Session rotation middleware error:', error);
      next(); // Continue even if rotation fails
    }
  };
}
