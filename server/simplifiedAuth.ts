import * as client from "openid-client";
import type { Express, Request, Response, NextFunction } from "express";
import memoize from "memoizee";
import session from "express-session";
import connectPg from "connect-pg-simple";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import cookieParser from "cookie-parser";
import { storage } from "./storage";
import { db } from "./db";
import { sessions } from "../shared/schema";
import { eq } from "drizzle-orm";

// PKCE state and code verifier storage (in-memory)
const pkceStore = new Map<string, { codeVerifier: string; returnTo?: string }>();

// Get OIDC configuration
const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

// Get session middleware (for compatibility, not used for auth)
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 7 days
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: sessionTtl,
    },
  });
}

// JWT utilities for RS256
function signJWT(payload: any): string {
  const privateKey = process.env.JWT_PRIVATE_KEY!;
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: '7d'
  });
}

export function verifyJWT(token: string): any {
  const publicKey = process.env.JWT_PUBLIC_KEY!;
  return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
}

// Generate session ID
function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Create session in database
async function createSession(userId: string, sessionId: string): Promise<void> {
  const expire = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  await db.insert(sessions).values({
    sid: sessionId,
    sess: { userId } as any,
    expire
  }).onConflictDoUpdate({
    target: sessions.sid,
    set: {
      sess: { userId } as any,
      expire
    }
  });
}

// isAuthenticated middleware for Express routes
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  const authCookie = req.cookies['auth-session'];
  
  if (!authCookie) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const payload = verifyJWT(authCookie);
    (req as any).user = {
      userId: payload.userId,
      isAdmin: payload.isAdmin,
      sessionId: payload.sessionId
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

// Setup auth routes
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  
  // Add cookie parser middleware
  app.use(cookieParser());
  
  // Keep session middleware for backward compatibility
  app.use(getSession());
  
  const config = await getOidcConfig();
  
  // Get the first domain from REPLIT_DOMAINS
  const domain = process.env.REPLIT_DOMAINS!.split(",")[0];
  const redirectUri = `https://${domain}/api/auth/callback/replit`;
  
  // Login route - initiate PKCE flow
  app.get('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const state = crypto.randomBytes(16).toString('hex');
      const codeVerifier = client.randomPKCECodeVerifier();
      const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
      
      // Store PKCE data and return URL
      const returnTo = (req.query.returnTo as string) || '/event';
      pkceStore.set(state, { codeVerifier, returnTo });
      
      // Clean up old states (older than 10 minutes)
      setTimeout(() => pkceStore.delete(state), 10 * 60 * 1000);
      
      const authorizationUrl = client.buildAuthorizationUrl(config, {
        redirect_uri: redirectUri,
        scope: 'openid email profile',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        state
      });
      
      res.redirect(authorizationUrl.href);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });
  
  // OAuth callback route - complete PKCE flow and create JWT
  app.get('/api/auth/callback/replit', async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query;
      
      if (!code || !state) {
        return res.status(400).json({ error: 'Invalid callback parameters' });
      }
      
      // Retrieve PKCE data
      const pkceData = pkceStore.get(state as string);
      if (!pkceData) {
        return res.status(400).json({ error: 'Invalid or expired state' });
      }
      
      const { codeVerifier, returnTo } = pkceData;
      pkceStore.delete(state as string);
      
      // Exchange code for tokens
      const callbackParams = new URLSearchParams({
        code: code as string,
        state: state as string
      });
      
      const tokens = await client.authorizationCodeGrant(config, new URL(redirectUri), {
        pkceCodeVerifier: codeVerifier,
        expectedState: state as string
      }, callbackParams);
      
      const claims = tokens.claims();
      
      if (!claims) {
        throw new Error('No claims returned from OAuth');
      }
      
      // Upsert user in database
      await storage.upsertUser({
        id: String(claims.sub),
        email: String(claims.email || ''),
        firstName: String(claims.first_name || ''),
        lastName: String(claims.last_name || ''),
        profileImageUrl: String(claims.profile_image_url || ''),
      });
      
      // Get user to check admin status
      const userId = String(claims.sub);
      const user = await storage.getUser(userId);
      const isAdmin = user?.isAdmin ?? false;
      
      // Create session in database
      const sessionId = generateSessionId();
      await createSession(userId, sessionId);
      
      // Create JWT token with RS256
      const jwtToken = signJWT({
        userId,
        isAdmin,
        sessionId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
      });
      
      // Set JWT cookie
      res.cookie('auth-session', jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });
      
      // Redirect to post-login page
      const postLoginUrl = `/auth/post-login?returnTo=${encodeURIComponent(returnTo || '/event')}`;
      res.redirect(postLoginUrl);
    } catch (error) {
      console.error('Callback error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  });
  
  // Logout route - clear JWT and session
  app.post('/api/auth/logout', async (req: Request, res: Response) => {
    const authCookie = req.cookies['auth-session'];
    
    if (authCookie) {
      try {
        const payload = verifyJWT(authCookie);
        
        // Delete session from database
        await db.delete(sessions).where(eq(sessions.sid, payload.sessionId));
      } catch (error) {
        // Token invalid or expired, that's okay
      }
    }
    
    // Clear cookie
    res.clearCookie('auth-session');
    
    res.json({ success: true, message: 'Logged out successfully' });
  });
  
  // Legacy /api/login redirect for backward compatibility
  app.get('/api/login', (req: Request, res: Response) => {
    const returnTo = (req.query.returnTo as string) || '/event';
    res.redirect(`/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
  });
  
  // Legacy /api/callback redirect for backward compatibility
  app.get('/api/callback', (req: Request, res: Response) => {
    const queryString = new URLSearchParams(req.query as any).toString();
    res.redirect(`/api/auth/callback/replit?${queryString}`);
  });
}
