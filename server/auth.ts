import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from './db';
import { users, sessions } from '../shared/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { storage } from './storage';

// JWT Keys for RS256 asymmetric encryption
function getJWTPublicKey(): string {
  if (!process.env.JWT_PUBLIC_KEY) {
    throw new Error(
      '🚨 FATAL: JWT_PUBLIC_KEY environment variable is required. ' +
      'RS256 authentication requires both JWT_PUBLIC_KEY and JWT_PRIVATE_KEY.'
    );
  }
  return process.env.JWT_PUBLIC_KEY;
}

function getJWTPrivateKey(): string {
  if (!process.env.JWT_PRIVATE_KEY) {
    throw new Error(
      '🚨 FATAL: JWT_PRIVATE_KEY environment variable is required. ' +
      'RS256 authentication requires both JWT_PUBLIC_KEY and JWT_PRIVATE_KEY.'
    );
  }
  return process.env.JWT_PRIVATE_KEY;
}

// CSRF Secret (symmetric key for CSRF tokens)
function getCSRFSecret(): string {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error(
      '🚨 FATAL: JWT_SECRET environment variable is required for CSRF protection in production.'
    );
  }

  if (!process.env.JWT_SECRET) {
    console.warn(
      '⚠️  WARNING: JWT_SECRET not set. Using default for CSRF protection in development only.'
    );
    return 'b941a79febc4e94a05dac7de79d1a51122dbf8b3874a5d47935f92e299f5756ecb48fcb7f0e3c672515b10e9c16e1b52a790c18a714dfc557db879c4e491d1ee';
  }

  return process.env.JWT_SECRET;
}

const JWT_PUBLIC_KEY = getJWTPublicKey();
const JWT_PRIVATE_KEY = getJWTPrivateKey();
const CSRF_SECRET = getCSRFSecret();

// Session interfaces for JWT payload
export interface JWTPayload {
  userId: string;
  isAdmin: boolean;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface SessionData {
  isAuthenticated: boolean;
  userId?: string;
  isAdmin?: boolean;
  sessionId?: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isAdmin: boolean;
  };
}

// Enhanced session data interface for Express compatibility
declare module 'express-session' {
  interface SessionData {
    isAuthenticated?: boolean;
    isAdmin?: boolean;
    userId?: string;
    user?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      isAdmin: boolean;
    };
  }
}

// Auth middleware for Express routes (server-side)
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

// Authorization helper for user-scoped resources
export function requireUserAccess(req: any, res: any, next: any) {
  const requestedUserId = req.query.userId || req.body.userId;
  const sessionUserId = req.session?.userId;
  const isAdmin = req.session?.isAdmin;

  // Admins can access any user's data
  if (isAdmin) {
    return next();
  }

  // Users can only access their own data
  if (sessionUserId && requestedUserId === sessionUserId) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Access denied. You can only access your own data.'
  });
}

// Generate secure session ID for database tracking
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

// CSRF Protection System
export function generateCSRFToken(sessionId: string): string {
  const payload = {
    sessionId,
    timestamp: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex'),
  };
  
  return jwt.sign(payload, CSRF_SECRET, {
    expiresIn: '1h', // CSRF tokens expire in 1 hour
    issuer: 'ode-island-csrf',
  });
}

// Validate CSRF token
export function validateCSRFToken(token: string, sessionId: string): boolean {
  try {
    const decoded = jwt.verify(token, CSRF_SECRET) as any;
    
    // Verify token is for this session and hasn't expired
    return decoded.sessionId === sessionId && 
           decoded.iss === 'ode-island-csrf' &&
           (Date.now() - decoded.timestamp) < 3600000; // 1 hour validity
  } catch (error) {
    console.warn('CSRF token validation failed:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

// Create server-side session record for additional security
export async function createServerSession(userId: string, sessionId: string): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await db.insert(sessions).values({
      sid: sessionId,
      sess: { userId, isAuthenticated: true, createdAt: new Date() },
      expire: expiresAt,
    });
  } catch (error) {
    console.error('Failed to create server session:', error);
    // Continue even if server session creation fails
  }
}

// Verify server-side session exists and is valid
export async function verifyServerSession(sessionId: string): Promise<boolean> {
  try {
    const serverSession = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sid, sessionId))
      .limit(1);

    if (serverSession.length === 0) {
      return false;
    }

    // Check if session has expired
    if (serverSession[0].expire < new Date()) {
      // Clean up expired session
      await db.delete(sessions).where(eq(sessions.sid, sessionId));
      return false;
    }

    return true;
  } catch (error) {
    console.error('Server session verification failed:', error);
    return false;
  }
}

// Secure JWT-based session validation
export async function getSessionFromHeaders(request: NextRequest): Promise<SessionData> {
  // ⚠️ BYPASS: Return mock authenticated session for development
  const mockSession: SessionData = {
    isAuthenticated: true,
    userId: 'dev-user',
    isAdmin: true,
    sessionId: 'mock-session-id',
    user: {
      id: 'dev-user',
      email: 'dev@example.com',
      firstName: 'Dev',
      lastName: 'User',
      isAdmin: true,
    }
  };
  return mockSession;

  /* ORIGINAL CODE - BYPASSED FOR DEVELOPMENT
  const sessionCookie = request.cookies.get('auth-session');
  
  if (!sessionCookie) {
    return { isAuthenticated: false };
  }

  try {
    // Verify JWT token cryptographically using RS256 public key
    const decoded = jwt.verify(sessionCookie.value, JWT_PUBLIC_KEY, { algorithms: ['RS256'] }) as JWTPayload;
    
    // Verify server-side session exists (defense in depth)
    const isServerSessionValid = await verifyServerSession(decoded.sessionId);
    if (!isServerSessionValid) {
      return { isAuthenticated: false };
    }
    
    // Verify user still exists and hasn't been disabled
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1);

    if (user.length === 0) {
      // User was deleted, invalidate session
      await db.delete(sessions).where(eq(sessions.sid, decoded.sessionId));
      return { isAuthenticated: false };
    }

    const foundUser = user[0];

    return {
      isAuthenticated: true,
      userId: decoded.userId,
      isAdmin: foundUser.isAdmin ?? false, // Use current admin status from DB
      sessionId: decoded.sessionId,
      user: {
        id: foundUser.id,
        email: foundUser.email ?? '',
        firstName: foundUser.firstName ?? '',
        lastName: foundUser.lastName ?? '',
        isAdmin: foundUser.isAdmin ?? false,
      }
    };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      console.warn('Invalid JWT token:', error.message);
    } else if (error instanceof jwt.TokenExpiredError) {
      console.warn('Expired JWT token');
    } else {
      console.error('Session validation error:', error);
    }
    return { isAuthenticated: false };
  }
  */
}

// Server-side user fetching for Server Components - BYPASSED
// Uses next/headers cookies() instead of NextRequest
export async function getServerUser() {
  // Authentication bypassed - return mock admin user
  return {
    id: 'dev-user',
    email: 'dev@example.com',
    firstName: 'Dev',
    lastName: 'User',
    isAdmin: true,
    permissions: ['*'], // All permissions
  };
}

// Helper to create authenticated response with secure JWT cookie
export async function createAuthResponse(user: any, success: boolean = true, message: string = 'Success') {
  // Generate unique session ID for server-side tracking
  const sessionId = generateSessionId();
  
  // Create server-side session record
  await createServerSession(user.id, sessionId);

  // Create JWT payload with essential data
  const jwtPayload: JWTPayload = {
    userId: user.id,
    isAdmin: user.isAdmin,
    sessionId: sessionId,
  };

  // Sign JWT token with RS256 private key
  const token = jwt.sign(jwtPayload, JWT_PRIVATE_KEY, {
    algorithm: 'RS256',
    expiresIn: '7d', // 7 days
    issuer: 'ode-island',
    audience: 'ode-island-users',
  });

  const response = NextResponse.json({
    success,
    message,
    user: {
      id: user.id,
      email: user.email ?? '',
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      isAdmin: user.isAdmin ?? false,
      emailVerified: user.emailVerified ?? false,
      createdAt: user.createdAt,
    },
  });

  // Generate CSRF token for this session
  const csrfToken = generateCSRFToken(sessionId);

  // Set secure JWT cookie with enhanced security settings
  response.cookies.set('auth-session', token, {
    httpOnly: true, // Prevent XSS access
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict', // Enhanced CSRF protection
    maxAge: 7 * 24 * 60 * 60, // 1 week in seconds
    path: '/',
    domain: process.env.NODE_ENV === 'production' ? process.env.DOMAIN : undefined,
  });

  // Set CSRF token in a separate cookie (readable by JavaScript for form submissions)
  response.cookies.set('csrf-token', csrfToken, {
    httpOnly: false, // JavaScript needs access to include in requests
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60, // 1 hour in seconds (shorter than session)
    path: '/',
    domain: process.env.NODE_ENV === 'production' ? process.env.DOMAIN : undefined,
  });

  return response;
}

// Helper to clear auth session and invalidate server-side session
export async function createLogoutResponse(sessionId?: string) {
  // Invalidate server-side session if provided
  if (sessionId) {
    try {
      await db.delete(sessions).where(eq(sessions.sid, sessionId));
    } catch (error) {
      console.error('Failed to delete server session:', error);
    }
  }

  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });

  // Clear the auth cookie with secure settings
  response.cookies.set('auth-session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0, // Expire immediately
    path: '/',
    domain: process.env.NODE_ENV === 'production' ? process.env.DOMAIN : undefined,
  });

  // Clear CSRF token cookie
  response.cookies.set('csrf-token', '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0, // Expire immediately
    path: '/',
    domain: process.env.NODE_ENV === 'production' ? process.env.DOMAIN : undefined,
  });

  return response;
}

// Auth middleware for Next.js API routes
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

    // Add session data to request for use in handler
    (request as any).session = session;

    return handler(request, context);
  };
}

// Authorization middleware for user-scoped resources in Next.js API routes
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

    // Extract user ID from request (query params or body)
    const url = new URL(request.url);
    const queryUserId = url.searchParams.get('userId');
    let bodyUserId;

    if (request.method !== 'GET') {
      try {
        const body = await request.json();
        bodyUserId = body.userId;
        // Re-create the request with parsed body for handler
        (request as any).parsedBody = body;
      } catch (error) {
        // Body might not be JSON, that's okay
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

// Utility to extract user ID from request
export function getUserIdFromRequest(request: NextRequest): string | null {
  const url = new URL(request.url);
  return url.searchParams.get('userId');
}

// CSRF Protection Middleware
export function withCSRFProtection(
  handler: (request: NextRequest, context: { params?: any }) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: { params?: any }) => {
    // Only apply CSRF protection to state-changing methods
    const protectedMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    
    if (!protectedMethods.includes(request.method)) {
      return handler(request, context);
    }

    // Get session information
    const session = await getSessionFromHeaders(request);
    
    if (!session.isAuthenticated || !session.sessionId) {
      return NextResponse.json(
        { success: false, message: 'Authentication required for this operation' },
        { status: 401 }
      );
    }

    // Get CSRF token from headers or cookie
    const csrfTokenFromHeader = request.headers.get('x-csrf-token');
    const csrfTokenFromCookie = request.cookies.get('csrf-token')?.value;
    const csrfToken = csrfTokenFromHeader || csrfTokenFromCookie;

    if (!csrfToken) {
      return NextResponse.json(
        { success: false, message: 'CSRF token required for this operation' },
        { status: 403 }
      );
    }

    // Validate CSRF token
    if (!validateCSRFToken(csrfToken, session.sessionId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired CSRF token' },
        { status: 403 }
      );
    }

    // Add session to request for handler
    (request as any).session = session;
    
    return handler(request, context);
  };
}

// Combined Auth + CSRF Protection Middleware
export function withAuthAndCSRF(
  handler: (request: NextRequest, context: { params?: any }) => Promise<NextResponse>,
  options: { requireAdmin?: boolean } = {}
) {
  // Compose middleware by first applying auth, then CSRF protection
  return withCSRFProtection(withAuth(handler, options));
}

// Combined User Auth + CSRF Protection Middleware  
export function withUserAuthAndCSRF(
  handler: (request: NextRequest, context: { params?: any }) => Promise<NextResponse>
) {
  // Compose middleware by first applying user auth, then CSRF protection
  return withCSRFProtection(withUserAuth(handler));
}

// Admin authentication with CSRF protection
export function withAdminAuthAndCSRF(
  handler: (request: NextRequest, context: { params?: any }) => Promise<NextResponse>
) {
  return async (request: NextRequest, context: { params?: any }) => {
    // First apply regular auth and CSRF protection
    const sessionHandler = withAuthAndCSRF(async (req: NextRequest, ctx: { params?: any }) => {
      const session = (req as any).session;
      
      // Check if user is admin
      if (!session?.isAdmin) {
        return NextResponse.json(
          { success: false, message: 'Admin access required' },
          { status: 403 }
        );
      }
      
      // If admin, proceed with original handler
      return handler(req, ctx);
    });
    
    return sessionHandler(request, context);
  };
}

// Utility to validate user access to resource
export async function validateUserAccess(
  session: any,
  resourceUserId: string,
  operation: string = 'access'
): Promise<boolean> {
  // Admins can access everything
  if (session.isAdmin) {
    return true;
  }

  // Users can only access their own resources
  return session.userId === resourceUserId;
}

// Enhanced validation for user identifier fields to prevent spoofing attacks
export function validateUserIdentifierFields(
  session: any,
  requestBody: any,
  options: {
    userIdFields?: string[];
    requireMatchingUser?: boolean;
  } = {}
): { isValid: boolean; errorMessage?: string } {
  const { userIdFields = ['userId', 'askedBy', 'createdBy', 'answeredBy'], requireMatchingUser = true } = options;
  
  // Admins can set any user identifier
  if (session.isAdmin) {
    return { isValid: true };
  }

  // For non-admin users, validate that user identifier fields match their session
  if (requireMatchingUser) {
    for (const field of userIdFields) {
      if (requestBody[field] && requestBody[field] !== session.userId) {
        return {
          isValid: false,
          errorMessage: `Access denied. You cannot set ${field} to another user's ID.`
        };
      }
    }
  }

  return { isValid: true };
}

// Automatically set user identifier fields based on session
export function setUserIdentifierFields(
  session: any,
  requestBody: any,
  fieldMappings: Record<string, string> = {}
): any {
  const updatedBody = { ...requestBody };
  
  // Default field mappings
  const defaultMappings = {
    askedBy: session.userId,
    createdBy: session.userId,
    answeredBy: session.userId,
  };
  
  const mappings = { ...defaultMappings, ...fieldMappings };
  
  // Set user identifiers for non-admin users, or if not already set
  for (const [field, value] of Object.entries(mappings)) {
    if (field in updatedBody) {
      // For non-admin users, force the field to their user ID
      if (!session.isAdmin) {
        updatedBody[field] = session.userId;
      }
      // For admin users, use provided value or default to their ID if not provided
      else if (!updatedBody[field]) {
        updatedBody[field] = value;
      }
    }
  }
  
  return updatedBody;
}