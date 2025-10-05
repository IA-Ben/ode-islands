import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler, Request } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Extend Express Request interface for Passport
declare global {
  namespace Express {
    interface User {
      claims?: any;
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
    }
    interface Request {
      user?: User;
      isAuthenticated(): boolean;
      logout(callback: (err?: any) => void): void;
    }
  }
}

// Enforce required environment variables for production security
if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS is required for authentication");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true, // PRODUCTION FIX: Ensure sessions table exists
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
      sameSite: 'lax', // Enhanced CSRF protection while allowing cross-site navigation
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  // Enhanced user reconciliation to prevent ID conflicts
  // First check if a user with this email already exists
  const existingUserByEmail = await storage.getUserByEmail(claims["email"]);
  
  if (existingUserByEmail && existingUserByEmail.id !== claims["sub"]) {
    // User exists with different ID - need to handle migration
    console.log(`User migration needed: existing ID ${existingUserByEmail.id} -> OIDC ID ${claims["sub"]}`);
    
    // Update the existing user record with OIDC sub as the primary ID
    await storage.migrateUserToOIDC(existingUserByEmail.id, {
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
      isAdmin: existingUserByEmail.isAdmin, // Preserve admin status
    });
  } else {
    // Normal upsert operation
    await storage.upsertUser({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"],
      lastName: claims["last_name"],
      profileImageUrl: claims["profile_image_url"],
    });
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb: (err: any, id?: any) => void) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb: (err: any, user?: any) => void) => cb(null, user));

  app.get("/api/login", (req: any, res, next) => {
    // Save returnTo URL if provided
    if (req.query.returnTo) {
      req.session.returnTo = req.query.returnTo as string;
    }
    
    // Map localhost to the actual Replit domain for authentication strategy
    let hostname = req.hostname;
    if (hostname === '127.0.0.1' || hostname === 'localhost') {
      // Use the first domain from REPLIT_DOMAINS as the default
      hostname = process.env.REPLIT_DOMAINS!.split(",")[0];
    }
    
    console.log(`Authentication attempt for hostname: ${hostname}`);
    
    passport.authenticate(`replitauth:${hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    // Map localhost to the actual Replit domain for authentication strategy
    let hostname = req.hostname;
    if (hostname === '127.0.0.1' || hostname === 'localhost') {
      // Use the first domain from REPLIT_DOMAINS as the default
      hostname = process.env.REPLIT_DOMAINS!.split(",")[0];
    }
    
    console.log(`Authentication callback for hostname: ${hostname}`);
    
    passport.authenticate(`replitauth:${hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};