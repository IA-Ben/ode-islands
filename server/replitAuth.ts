import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
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
      secure: true,
      sameSite: 'lax',
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
  // Check if this is the initial admin user setup
  const isAdminEmail = claims["email"] === "ben@immersiv.es";
  
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
    isAdmin: isAdminEmail, // Set as admin if it's ben@immersiv.es
  });
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

  // Support multiple domains and create strategies for each
  const domains = process.env.REPLIT_DOMAINS!.split(",");
  
  // Also add common deployment domain patterns
  const additionalDomains = [
    'theodeislands-ben673.replit.app',
    'ode-island-ben673.replit.app'
  ];
  
  const allDomains = [...domains, ...additionalDomains];

  for (const domain of allDomains) {
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

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // Dynamically detect which domain strategy to use based on the request
    const requestHost = req.hostname.toLowerCase();
    console.log('Login request from host:', requestHost);
    
    // Find matching strategy or fall back to primary domain
    let strategyDomain = domains[0]; // fallback
    if (allDomains.includes(requestHost)) {
      strategyDomain = requestHost;
    }
    
    console.log('Using authentication strategy for domain:', strategyDomain);
    
    passport.authenticate(`replitauth:${strategyDomain}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    // Dynamically detect which domain strategy to use based on the request
    const requestHost = req.hostname.toLowerCase();
    console.log('Callback request from host:', requestHost);
    
    // Find matching strategy or fall back to primary domain
    let strategyDomain = domains[0]; // fallback
    if (allDomains.includes(requestHost)) {
      strategyDomain = requestHost;
    }
    
    console.log('Using callback strategy for domain:', strategyDomain);
    
    passport.authenticate(`replitauth:${strategyDomain}`, {
      successReturnToOrRedirect: "/cms",
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

// CMS-specific middleware to check admin access
export const isAdmin: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  
  if (!req.isAuthenticated() || !user.claims?.sub) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const dbUser = await storage.getUser(user.claims.sub);
    if (!dbUser?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  } catch (error) {
    res.status(500).json({ message: "Error checking admin status" });
  }
};