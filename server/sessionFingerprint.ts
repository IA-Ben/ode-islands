import crypto from 'crypto';
import { Request } from 'express';
import { AuditLogger } from './auditLogger';

/**
 * Session Fingerprinting for Hijacking Prevention
 *
 * Binds sessions to client fingerprints (IP + User-Agent) to detect
 * and prevent session hijacking attempts.
 *
 * Security Properties:
 * - SHA-256 hash of IP:UserAgent
 * - Stored with session in database
 * - Validated on every authenticated request
 * - Audit logging on mismatch
 * - Automatic session invalidation on hijack detection
 */

export interface FingerprintValidationResult {
  valid: boolean;
  reason?: string;
  currentFingerprint?: string;
  storedFingerprint?: string;
}

/**
 * Generate a fingerprint for the current request
 *
 * @param req - Express request object
 * @returns SHA-256 hash of IP:UserAgent
 */
export function generateFingerprint(req: Request): string {
  // Extract IP address (handle proxy headers)
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    'unknown';

  // Extract User-Agent
  const userAgent = req.headers['user-agent'] || 'unknown';

  // Create deterministic fingerprint
  const fingerprintString = `${ip}:${userAgent}`;

  return crypto
    .createHash('sha256')
    .update(fingerprintString)
    .digest('hex');
}

/**
 * Validate fingerprint against stored value
 *
 * @param req - Express request object
 * @param storedFingerprint - Fingerprint stored with session
 * @returns Validation result with details
 */
export function validateFingerprint(
  req: Request,
  storedFingerprint: string
): FingerprintValidationResult {
  const currentFingerprint = generateFingerprint(req);

  if (currentFingerprint === storedFingerprint) {
    return { valid: true };
  }

  return {
    valid: false,
    reason: 'Fingerprint mismatch - possible session hijacking',
    currentFingerprint,
    storedFingerprint
  };
}

/**
 * Validate fingerprint and handle hijacking detection
 *
 * @param req - Express request object
 * @param storedFingerprint - Fingerprint stored with session
 * @param userId - User ID for audit logging
 * @returns true if valid, false if hijacking detected
 */
export async function validateFingerprintWithLogging(
  req: Request,
  storedFingerprint: string,
  userId: string
): Promise<boolean> {
  const validation = validateFingerprint(req, storedFingerprint);

  if (!validation.valid) {
    // Log potential session hijacking
    await AuditLogger.log({
      action: 'session_hijack_detected',
      severity: 'critical',
      userId,
      ipAddress: extractIP(req),
      userAgent: req.headers['user-agent'],
      metadata: {
        reason: validation.reason,
        currentFingerprint: validation.currentFingerprint,
        storedFingerprint: validation.storedFingerprint
      }
    });

    console.warn(
      `🚨 Session hijacking detected for user ${userId}`,
      `Current: ${validation.currentFingerprint?.substring(0, 16)}...`,
      `Stored: ${validation.storedFingerprint?.substring(0, 16)}...`
    );

    return false;
  }

  return true;
}

/**
 * Extract IP address from request (handles proxies)
 *
 * @param req - Express request object
 * @returns IP address string
 */
export function extractIP(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

/**
 * Store fingerprint with session
 *
 * @param req - Express request object with session
 * @returns Generated fingerprint
 */
export function storeFingerprintInSession(req: any): string {
  const fingerprint = generateFingerprint(req);

  if (req.session) {
    req.session.fingerprint = fingerprint;
  }

  return fingerprint;
}

/**
 * Get stored fingerprint from session
 *
 * @param req - Express request object with session
 * @returns Stored fingerprint or null
 */
export function getFingerprintFromSession(req: any): string | null {
  return req.session?.fingerprint || null;
}
