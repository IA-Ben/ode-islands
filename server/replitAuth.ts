import { Issuer } from 'openid-client';
import passport from 'passport';
import { Strategy as OpenIDConnectStrategy } from 'passport-openidconnect';
import expressSession from 'express-session';
import type { Express, RequestHandler } from 'express';
import connectPgSimple from 'connect-pg-simple';
import memoize from 'memoizee';
import { storage } from './storage';

// Check for required environment variables
if (!process.env.REPLIT_DOMAINS && process.env.NODE_ENV === 'production') {
  console.warn('Environment variable REPLIT_DOMAINS not provided, using localhost');
}

if (!process.env.REPL_ID && process.env.NODE_ENV === 'production') {
  console.warn('Environment variable REPL_ID not provided, authentication may not work correctly');
}

// Memoize the OIDC configuration discovery
const getOidcConfig = memoize(
  async () => {
    const issuerUrl = process.env.ISSUER_URL ?? 'https://replit.com/oidc';
    
    try {
      // Use Issuer.discover but we'll extract metadata manually to avoid issues
      const issuer = await Issuer.discover(issuerUrl);
      return issuer;
    } catch (error) {
      console.error('Failed to discover OIDC configuration:', error);
      throw error;
    }
  },
  { maxAge: 3600 * 1000, promise: true } // Cache for 1 hour
);

// Get session configuration
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const PgStore = connectPgSimple(expressSession);
  const sessionStore = new PgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: 'sessions',
  });
  
  return expressSession({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'fallback-secret-dev',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
      sameSite: 'lax',
    },
  });
}

// Update user session with tokens
function updateUserSession(
  user: any,
  tokens: any
) {
  // Handle both tokenSet.claims() and direct claims
  user.claims = typeof tokens.claims === 'function' ? tokens.claims() : (tokens.claims || tokens);
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = tokens.expires_at || tokens.exp || user.claims?.exp || Math.floor(Date.now() / 1000) + 3600;
}

// Upsert user to database
async function upsertUser(claims: any) {
  // Ensure claims exist and have required fields
  const userId = claims?.sub || claims?.id;
  if (!userId) {
    console.error('No user ID found in claims:', claims);
    throw new Error('No user ID found in authentication claims');
  }

  // Extract user data from claims
  const userData = {
    id: String(userId),
    email: claims?.email || '',
    firstName: claims?.first_name || claims?.given_name || '',
    lastName: claims?.last_name || claims?.family_name || '',
    profileImageUrl: claims?.profile_image_url || claims?.picture || '',
  };

  await storage.upsertUser(userData);
  
  // Check if user is admin
  const user = await storage.getUser(userData.id);
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
  const isAdmin = user?.isAdmin ?? adminEmails.includes(userData.email);

  return { ...userData, isAdmin };
}

// Main authentication setup
export async function setupAuth(app: Express) {
  // Trust proxy for production deployments
  app.set('trust proxy', 1);
  
  // Setup sessions
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  try {
    // Get OIDC configuration
    const config = await getOidcConfig();

    // Get domains from environment
    const replitDomains = process.env.REPLIT_DOMAINS?.split(',').filter(d => d.trim()) || [];
    // Always include localhost for development
    const domains = [...replitDomains];
    if (process.env.NODE_ENV !== 'production') {
      domains.push('localhost:5000');
    }
    console.log('Registering strategies for domains:', domains);
    
    // Register a strategy for each domain
    for (const domain of domains) {
      const strategyName = `replitauth:${domain}`;
      console.log(`Registering strategy: ${strategyName}`);
      const isLocalhost = domain.startsWith('localhost');
      const protocol = (process.env.NODE_ENV === 'production' && !isLocalhost) ? 'https' : 'http';
      const callbackURL = `${protocol}://${domain}/api/callback`;

      // Use passport-openidconnect with discovered metadata for better compatibility
      const strategy = new OpenIDConnectStrategy(
        {
          issuer: config.metadata.issuer,
          authorizationURL: config.metadata.authorization_endpoint,
          tokenURL: config.metadata.token_endpoint,
          userInfoURL: config.metadata.userinfo_endpoint,
          clientID: process.env.REPL_ID || 'test-client',
          clientSecret: '', // Empty secret for public clients
          callbackURL,
          scope: 'openid email profile offline_access',
          skipUserProfile: false,
          // Additional options to help avoid Cloudflare issues
          passReqToCallback: false,
        },
        async (issuer: string, profile: any, idToken: string | undefined, accessToken: string, refreshToken: string | undefined, params: any, done: any) => {
          try {
            // Extract claims from ID token or profile
            const claims = profile._json || {};
            const userId = claims.sub || claims.id;
            if (!userId) {
              return done(new Error('No user ID found'), null);
            }

            // Upsert user and get admin status
            const userWithAdmin = await upsertUser(claims);

            // Create session user object
            const sessionUser = {
              ...userWithAdmin,
              claims,
              access_token: accessToken,
              refresh_token: refreshToken,
              expires_at: claims.exp || Math.floor(Date.now() / 1000) + 3600,
            };

            done(null, sessionUser);
          } catch (error) {
            console.error('Authentication error:', error);
            done(error, null);
          }
        }
      );
      
      passport.use(strategyName, strategy);
    }

    // Serialize/deserialize user for sessions
    passport.serializeUser((user: Express.User, cb) => cb(null, user));
    passport.deserializeUser((user: Express.User, cb) => cb(null, user));

    // Login route
    app.get('/api/login', (req, res, next) => {
      const host = req.headers.host || 'localhost:5000';
      const strategyName = `replitauth:${host}`;
      
      console.log(`Attempting authentication with strategy: ${strategyName}`);
      
      // Use specific options for passport-openidconnect
      passport.authenticate(strategyName, {
        prompt: 'login consent',
        scope: 'openid email profile offline_access',
      })(req, res, next);
    });

    // OAuth callback route
    app.get('/api/callback', (req, res, next) => {
      const host = req.headers.host || 'localhost:5000';
      const strategyName = `replitauth:${host}`;
      
      console.log(`Callback authentication with strategy: ${strategyName}`);
      
      passport.authenticate(strategyName, {
        successReturnToOrRedirect: '/auth/post-login',
        failureRedirect: '/auth/login?error=authentication_failed',
      })(req, res, next);
    });

    // Logout route (POST)
    app.post('/api/logout', (req, res) => {
      req.logout((err) => {
        if (err) {
          console.error('Logout error:', err);
          return res.status(500).json({ error: 'Logout failed' });
        }

        // Destroy session
        req.session.destroy((destroyErr) => {
          if (destroyErr) {
            console.error('Session destruction error:', destroyErr);
          }
          res.clearCookie('connect.sid');
          res.json({ success: true, message: 'Logged out successfully' });
        });
      });
    });

    // Logout route (GET) with OIDC end session
    app.get('/api/logout', async (req, res) => {
      const hostname = req.hostname || req.headers.host?.split(':')[0] || 'localhost';
      
      req.logout((err) => {
        if (err) {
          console.error('Logout error:', err);
        }

        // Destroy session
        req.session.destroy(async (destroyErr) => {
          if (destroyErr) {
            console.error('Session destruction error:', destroyErr);
          }
          res.clearCookie('connect.sid');
          
          // Redirect to OIDC end session endpoint
          try {
            const issuer = await getOidcConfig();
            // Create a client for logout
            const client = new issuer.Client({
              client_id: process.env.REPL_ID || 'test-client',
              redirect_uris: [`${req.protocol}://${req.headers.host || hostname}/api/callback`],
              response_types: ['code'],
            });
            
            // Use endSessionUrl method
            const endSessionUrl = client.endSessionUrl({
              post_logout_redirect_uri: `${req.protocol}://${req.headers.host || hostname}`,
            });
            
            res.redirect(endSessionUrl);
          } catch (error) {
            console.error('Failed to build end session URL:', error);
            res.redirect('/');
          }
        });
      });
    });

    // User info endpoint (supports both /api/me and /api/auth/user)
    const userInfoHandler = (req: any, res: any) => {
      if (req.isAuthenticated() && req.user) {
        const user = req.user as any;
        res.json({
          success: true,
          user: {
            id: user.id || user.claims?.sub,
            email: user.email || user.claims?.email,
            firstName: user.firstName || user.claims?.first_name,
            lastName: user.lastName || user.claims?.last_name,
            profileImageUrl: user.profileImageUrl || user.claims?.profile_image_url,
            isAdmin: user.isAdmin || false,
          },
        });
      } else {
        res.status(401).json({ success: false, message: 'Not authenticated' });
      }
    };

    app.get('/api/me', userInfoHandler);
    app.get('/api/auth/user', userInfoHandler);

    console.log('> Replit Auth initialized successfully');
  } catch (error) {
    console.error('Failed to setup authentication:', error);
    throw error;
  }
}

// Middleware to check if user is authenticated with token refresh
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  // Try to refresh token if expired
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const issuer = await getOidcConfig();
    const client = new issuer.Client({
      client_id: process.env.REPL_ID || 'test-client',
      redirect_uris: [`https://${req.hostname}/api/callback`],
      response_types: ['code'],
    });
    const tokenSet = await client.refresh(refreshToken);
    updateUserSession(user, tokenSet);
    return next();
  } catch (error) {
    console.error('Token refresh failed:', error);
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

// Legacy middleware for compatibility
export const requireAuth = isAuthenticated;

// Admin check middleware
export const requireAdmin: RequestHandler = async (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const user = req.user as any;
  if (user?.isAdmin) {
    return next();
  }

  return res.status(403).json({ message: 'Admin access required' });
};