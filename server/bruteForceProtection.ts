import { RateLimiterMemory } from 'rate-limiter-flexible';
import { AuditLogger } from './auditLogger';

/**
 * Brute Force Protection - Login Rate Limiting
 *
 * Prevents password guessing attacks by limiting login attempts.
 *
 * Security Properties:
 * - 5 failed login attempts per 15 minutes
 * - 1-hour block after limit exceeded
 * - Per-identifier tracking (email/username)
 * - Audit logging of rate limit violations
 *
 * Use Cases:
 * - Prevent password guessing/brute force
 * - Mitigate credential stuffing attacks
 * - Security compliance (CWE-307: Improper Restriction of Excessive Authentication Attempts)
 */

const LOGIN_ATTEMPTS = 5;
const WINDOW_DURATION = 15 * 60; // 15 minutes in seconds
const BLOCK_DURATION = 60 * 60;  // 1 hour in seconds

// In-memory rate limiter (PHASE 2: Use Redis for production multi-instance deployments)
const loginLimiter = new RateLimiterMemory({
  points: LOGIN_ATTEMPTS,
  duration: WINDOW_DURATION,
  blockDuration: BLOCK_DURATION,
});

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts?: number;
  retryAfter?: number; // seconds until unblocked
  message?: string;
}

/**
 * Check if login attempt is allowed for this identifier
 *
 * @param identifier - Email or username attempting login
 * @param ipAddress - IP address for audit logging
 * @returns RateLimitResult
 */
export async function checkLoginRateLimit(
  identifier: string,
  ipAddress?: string
): Promise<RateLimitResult> {
  try {
    const rateLimiterRes = await loginLimiter.consume(identifier);

    return {
      allowed: true,
      remainingAttempts: rateLimiterRes.remainingPoints,
    };
  } catch (error: any) {
    // Rate limit exceeded
    const retryAfter = Math.round(error.msBeforeNext / 1000);

    // Log rate limit violation
    await AuditLogger.log({
      userId: null, // Unauthenticated event
      action: 'delete', // Using 'delete' action type for security events (PHASE 2: Schema needs custom action types)
      severity: 'warning',
      entityType: 'authentication',
      entityId: identifier,
      description: `Login rate limit exceeded for ${identifier}`,
      metadata: {
        event: 'login_rate_limit_exceeded',
        identifier,
        retryAfter,
        consumedPoints: error.consumedPoints,
        limit: LOGIN_ATTEMPTS,
        windowDuration: WINDOW_DURATION,
        blockDuration: BLOCK_DURATION,
      },
      ipAddress,
    });

    console.log(
      `🚫 Rate limit exceeded for ${identifier}:`,
      `${error.consumedPoints} attempts in ${WINDOW_DURATION}s window.`,
      `Retry after ${retryAfter}s`
    );

    return {
      allowed: false,
      retryAfter,
      message: `Too many login attempts. Please try again in ${Math.ceil(retryAfter / 60)} minutes.`,
    };
  }
}

/**
 * Reset rate limit for identifier (call after successful login)
 *
 * @param identifier - Email or username
 */
export async function resetLoginRateLimit(identifier: string): Promise<void> {
  try {
    await loginLimiter.delete(identifier);
    console.log(`✅ Reset login rate limit for ${identifier}`);
  } catch (error) {
    console.error('Failed to reset login rate limit:', error);
  }
}

/**
 * Get current rate limit status (for debugging/monitoring)
 *
 * @param identifier - Email or username
 * @returns Current limit status or null
 */
export async function getLoginRateLimitStatus(
  identifier: string
): Promise<{ consumedPoints: number; remainingPoints: number; msBeforeNext: number } | null> {
  try {
    const res = await loginLimiter.get(identifier);
    if (!res) return null;

    return {
      consumedPoints: res.consumedPoints,
      remainingPoints: res.remainingPoints,
      msBeforeNext: res.msBeforeNext || 0,
    };
  } catch (error) {
    console.error('Failed to get rate limit status:', error);
    return null;
  }
}

/**
 * Express middleware for login rate limiting
 * Apply to login endpoints
 */
export async function loginRateLimitMiddleware(
  identifier: string,
  req: any
): Promise<RateLimitResult> {
  const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                    (req.headers['x-real-ip'] as string) ||
                    req.socket.remoteAddress;

  return await checkLoginRateLimit(identifier, ipAddress);
}
