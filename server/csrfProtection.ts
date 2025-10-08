/**
 * CSRF Protection Implementation
 *
 * Provides secure Cross-Site Request Forgery protection using HMAC-signed tokens.
 * Tokens are tied to the user's session and expire after 1 hour.
 */

import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { AuditLogger } from './auditLogger';

const CSRF_SECRET = process.env.CSRF_SECRET;

if (!CSRF_SECRET) {
  throw new Error('CSRF_SECRET environment variable is required');
}

if (CSRF_SECRET.length < 32) {
  throw new Error('CSRF_SECRET must be at least 32 characters');
}

/**
 * Generate CSRF token tied to session
 */
export function generateCSRFToken(sessionId: string): string {
  const timestamp = Date.now().toString();
  const random = randomBytes(16).toString('hex');
  const payload = `${sessionId}:${timestamp}:${random}`;

  const signature = createHmac('sha256', CSRF_SECRET)
    .update(payload)
    .digest('hex');

  return `${payload}:${signature}`;
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(req: Request, res: Response, next: NextFunction) {
  // Skip validation for safe HTTP methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const sessionId = (req as any).sessionID || (req as any).session?.id;

  if (!sessionId) {
    return res.status(401).json({
      success: false,
      message: 'No session found',
      code: 'NO_SESSION'
    });
  }

  // Get token from header or body
  const token = req.headers['x-csrf-token'] || (req.body as any)?.csrfToken;

  if (!token || typeof token !== 'string') {
    AuditLogger.log({
      userId: (req as any).user?.userId || 'unknown',
      action: 'csrf_token_missing',
      entityType: 'security',
      entityId: sessionId,
      severity: 'warning',
      metadata: {
        method: req.method,
        path: req.path,
        ip: req.ip
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.status(403).json({
      success: false,
      message: 'CSRF token required',
      code: 'CSRF_MISSING'
    });
  }

  try {
    const parts = token.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid token format');
    }

    const [tokenSessionId, timestamp, random, signature] = parts;

    // Verify session match
    if (tokenSessionId !== sessionId) {
      throw new Error('Session mismatch');
    }

    // Verify token age (max 1 hour)
    const tokenAge = Date.now() - parseInt(timestamp);
    if (tokenAge > 3600000) {
      throw new Error('Token expired');
    }

    if (tokenAge < 0) {
      throw new Error('Token timestamp is in the future');
    }

    // Verify signature using timing-safe comparison
    const payload = `${tokenSessionId}:${timestamp}:${random}`;
    const expectedSignature = createHmac('sha256', CSRF_SECRET)
      .update(payload)
      .digest('hex');

    // Convert to buffers for timing-safe comparison
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const actualBuffer = Buffer.from(signature, 'hex');

    if (expectedBuffer.length !== actualBuffer.length) {
      throw new Error('Invalid signature length');
    }

    if (!timingSafeEqual(expectedBuffer, actualBuffer)) {
      throw new Error('Invalid signature');
    }

    // Token is valid
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error('CSRF validation failed:', errorMessage);

    // Log potential CSRF attack
    AuditLogger.log({
      userId: (req as any).user?.userId || 'unknown',
      action: 'csrf_validation_failed',
      entityType: 'security',
      entityId: sessionId,
      severity: 'error',
      metadata: {
        error: errorMessage,
        method: req.method,
        path: req.path,
        ip: req.ip
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    return res.status(403).json({
      success: false,
      message: 'CSRF validation failed',
      code: 'CSRF_INVALID'
    });
  }
}

/**
 * Middleware to set CSRF token in response cookie
 */
export function setCSRFToken(req: Request, res: Response, next: NextFunction) {
  const sessionId = (req as any).sessionID || (req as any).session?.id;

  if (!sessionId) {
    return next();
  }

  // Generate and set CSRF token
  const csrfToken = generateCSRFToken(sessionId);

  res.cookie('csrf-token', csrfToken, {
    httpOnly: false, // Client needs to read this for requests
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', // CRITICAL: Prevent cross-site requests
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  // Also make it available in response locals for templates
  res.locals.csrfToken = csrfToken;

  next();
}

/**
 * Combined middleware: validates CSRF and regenerates token
 */
export function withCSRF(req: Request, res: Response, next: NextFunction) {
  validateCSRFToken(req, res, (err?: any) => {
    if (err) return;

    // After successful validation, regenerate token for next request
    setCSRFToken(req, res, next);
  });
}
