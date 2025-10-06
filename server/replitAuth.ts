import express from 'express';
import passport from 'passport';
import { Strategy as OpenIDConnectStrategy } from 'passport-openidconnect';
import { Issuer } from 'openid-client';
import expressSession from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import memoize from 'memoizee';
import { storage } from './storage';
import { db } from './db';
import { sessions } from '../shared/schema';
import { eq } from 'drizzle-orm';

const PgStore = connectPgSimple(expressSession);

// Memoize the discovery function to avoid repeated calls
const getOpenIDIssuer = memoize(
  async () => {
    const issuer = await Issuer.discover(
      process.env.AUTH_ISSUER_URL || 'https://replit.com/oidc'
    );
    return issuer;
  },
  { promise: true, maxAge: 1000 * 60 * 60 } // Cache for 1 hour
);

// User serialization for passport sessions
passport.serializeUser((user: any, done) => {
  // Serialize the entire user object for simpler retrieval
  done(null, {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    profileImageUrl: user.profileImageUrl,
    isAdmin: user.isAdmin,
  });
});

passport.deserializeUser(async (sessionUser: any, done) => {
  try {
    // Try to get fresh user data from database
    const user = await storage.getUser(sessionUser.id);
    if (user) {
      // Update admin status from database
      done(null, {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        isAdmin: user.isAdmin,
      });
    } else {
      // If user not found in DB, use session data
      done(null, sessionUser);
    }
  } catch (error) {
    console.warn('Error deserializing user, using session data:', error);
    // Fall back to session data if DB lookup fails
    done(null, sessionUser);
  }
});

// Setup authentication middleware
export async function setupAuth(app: express.Application) {
  // Session configuration
  const sessionConfig: expressSession.SessionOptions = {
    store: new PgStore({
      conString: process.env.DATABASE_URL,
      tableName: 'sessions',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'fallback-secret-for-dev',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'lax',
    },
  };

  // Initialize session and passport
  app.use(expressSession(sessionConfig));
  app.use(passport.initialize());
  app.use(passport.session());

  // Get OpenID issuer
  const issuer = await getOpenIDIssuer();
  
  // Get the first domain from REPLIT_DOMAINS
  const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? `https://${domain}`
    : `http://${domain}`;

  // Create OpenID Connect strategy with openid-client v5
  const client = new issuer.Client({
    client_id: process.env.REPL_ID || process.env.REPLIT_CLIENT_ID || 'test-client',
    redirect_uris: [`${baseUrl}/api/callback`],
    response_types: ['code'],
  });

  // Configure passport strategy
  passport.use(
    'openidconnect',
    new OpenIDConnectStrategy(
      {
        issuer: issuer.metadata.issuer,
        authorizationURL: issuer.metadata.authorization_endpoint,
        tokenURL: issuer.metadata.token_endpoint,
        userInfoURL: issuer.metadata.userinfo_endpoint,
        clientID: process.env.REPL_ID || process.env.REPLIT_CLIENT_ID || 'test-client',
        clientSecret: undefined, // No client secret for public clients
        callbackURL: `${baseUrl}/api/callback`,
        scope: 'openid email profile',
        skipUserProfile: false,
        passReqToCallback: false,
      },
      async (
        issuer: string,
        profile: any,
        idToken: string | undefined,
        accessToken: string,
        refreshToken: string | undefined,
        params: any,
        done: any
      ) => {
        try {
          // Parse profile data from either ID token or userinfo
          let userInfo = profile;
          
          // If profile is not properly parsed, try to decode ID token
          if (!userInfo.id && idToken) {
            try {
              const parts = idToken.split('.');
              if (parts.length === 3) {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                userInfo = {
                  id: payload.sub,
                  email: payload.email,
                  firstName: payload.given_name || payload.first_name || '',
                  lastName: payload.family_name || payload.last_name || '',
                  profileImageUrl: payload.picture || payload.profile_image_url || '',
                  ...payload,
                };
              }
            } catch (e) {
              console.error('Failed to decode ID token:', e);
            }
          }

          // Ensure we have a user ID
          const userId = userInfo.id || userInfo.sub || profile._json?.sub;
          if (!userId) {
            return done(new Error('No user ID found in profile'), null);
          }

          // Upsert user in database
          const userData = {
            id: String(userId),
            email: String(userInfo.email || profile._json?.email || ''),
            firstName: String(userInfo.firstName || userInfo.given_name || profile._json?.given_name || ''),
            lastName: String(userInfo.lastName || userInfo.family_name || profile._json?.family_name || ''),
            profileImageUrl: String(userInfo.profileImageUrl || userInfo.picture || profile._json?.picture || ''),
          };

          await storage.upsertUser(userData);

          // Check if user is admin
          const user = await storage.getUser(userData.id);
          const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
          const isAdmin = user?.isAdmin ?? adminEmails.includes(userData.email);

          // Return user object for passport
          return done(null, {
            id: userData.id,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            isAdmin,
            accessToken,
            refreshToken,
          });
        } catch (error) {
          console.error('Authentication error:', error);
          return done(error, null);
        }
      }
    )
  );

  // Authentication routes
  app.get('/api/login', (req, res, next) => {
    // Generate PKCE parameters for added security
    const state = require('crypto').randomBytes(16).toString('hex');
    
    // Store state in session for CSRF protection
    req.session.oauthState = state;
    
    passport.authenticate('openidconnect', {
      state,
    })(req, res, next);
  });

  app.get('/api/callback',
    (req, res, next) => {
      // Validate state for CSRF protection
      if (req.query.state !== req.session.oauthState) {
        return res.status(400).json({ error: 'Invalid state parameter' });
      }
      delete req.session.oauthState;
      next();
    },
    passport.authenticate('openidconnect', { 
      failureRedirect: '/auth/login?error=authentication_failed',
      successRedirect: '/auth/post-login',
    })
  );

  app.post('/api/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      
      // Destroy session
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
        }
        
        // Clear session cookie
        res.clearCookie('connect.sid');
        res.json({ success: true, message: 'Logged out successfully' });
      });
    });
  });

  app.get('/api/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
      }
      
      // Destroy session
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
        }
        
        // Clear session cookie
        res.clearCookie('connect.sid');
        res.redirect('/');
      });
    });
  });

  // User info endpoint that works with passport sessions
  app.get('/api/me', (req, res) => {
    if (req.isAuthenticated() && req.user) {
      res.json({
        success: true,
        user: {
          id: (req.user as any).id,
          email: (req.user as any).email,
          firstName: (req.user as any).firstName,
          lastName: (req.user as any).lastName,
          profileImageUrl: (req.user as any).profileImageUrl,
          isAdmin: (req.user as any).isAdmin,
        },
      });
    } else {
      res.status(401).json({ success: false, message: 'Not authenticated' });
    }
  });

  // Also support the existing /api/auth/user endpoint
  app.get('/api/auth/user', (req, res) => {
    if (req.isAuthenticated() && req.user) {
      res.json({
        success: true,
        user: {
          id: (req.user as any).id,
          email: (req.user as any).email,
          firstName: (req.user as any).firstName,
          lastName: (req.user as any).lastName,
          profileImageUrl: (req.user as any).profileImageUrl,
          isAdmin: (req.user as any).isAdmin,
        },
      });
    } else {
      res.status(401).json({ success: false, message: 'Not authenticated' });
    }
  });

  console.log('> Replit Auth with passport initialized');
}

// Export middleware functions for protecting routes
export const requireAuth = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ success: false, message: 'Authentication required' });
};

export const requireAdmin = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && (req.user as any)?.isAdmin) {
    return next();
  }
  res.status(403).json({ success: false, message: 'Admin access required' });
};