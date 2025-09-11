import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupSimpleAuth } from "./simpleAuth";
import session from 'express-session';
import connectPg from 'connect-pg-simple';

// Simple auth middleware
function isAuthenticated(req: any, res: any, next: any) {
  if (req.session.isAuthenticated) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
}

function isAdmin(req: any, res: any, next: any) {
  if (req.session.isAuthenticated) {
    next();
  } else {
    res.status(401).json({ error: 'Admin access required' });
  }
}

// Re-export auth middleware
export { isAuthenticated, isAdmin };

export async function registerRoutes(app: Express): Promise<Server> {
  // Enforce required SESSION_SECRET
  const SESSION_SECRET = process.env.SESSION_SECRET;
  if (!SESSION_SECRET) {
    console.error('FATAL: SESSION_SECRET environment variable is required');
    process.exit(1);
  }

  // Setup session middleware
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: 7 * 24 * 60 * 60, // 1 week in seconds
    tableName: "sessions",
  });

  app.use(session({
    secret: SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax', // CSRF protection
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    },
  }));

  // Setup simple auth routes
  setupSimpleAuth(app);

  // Note: /api/auth/user endpoint is now in simpleAuth.ts with correct camelCase schema

  // CMS API Routes - all require admin access
  app.get("/api/cms/chapters", isAdmin, async (req, res) => {
    try {
      // For now, read from the static JSON file
      const fs = await import('fs/promises');
      const path = await import('path');
      const dataPath = path.join(process.cwd(), 'src/app/data/ode-islands.json');
      const data = await fs.readFile(dataPath, 'utf-8');
      const chapters = JSON.parse(data);
      res.json(chapters);
    } catch (error) {
      console.error("Error fetching chapters:", error);
      res.status(500).json({ message: "Failed to fetch chapters" });
    }
  });

  app.post("/api/cms/chapters", isAdmin, async (req, res) => {
    try {
      const { id, cards } = req.body;
      const userId = 'admin'; // Simple auth user ID
      
      // Read current data
      const fs = await import('fs/promises');
      const path = await import('path');
      const dataPath = path.join(process.cwd(), 'src/app/data/ode-islands.json');
      const data = await fs.readFile(dataPath, 'utf-8');
      const chapters = JSON.parse(data);
      
      // Update chapter
      chapters[id] = cards;
      
      // Create backup before saving
      await storage.createContentBackup(
        `ode-islands-${Date.now()}.json`,
        data,
        userId
      );
      
      // Save updated data
      await fs.writeFile(dataPath, JSON.stringify(chapters, null, 2));
      
      res.json({ message: "Chapter saved successfully" });
    } catch (error) {
      console.error("Error saving chapter:", error);
      res.status(500).json({ message: "Failed to save chapter" });
    }
  });

  app.get("/api/cms/media", isAdmin, async (req, res) => {
    try {
      const assets = await storage.getMediaAssets();
      res.json(assets);
    } catch (error) {
      console.error("Error fetching media:", error);
      res.status(500).json({ message: "Failed to fetch media" });
    }
  });

  app.get("/api/cms/backups", isAdmin, async (req, res) => {
    try {
      const backups = await storage.getContentBackups(20);
      res.json(backups);
    } catch (error) {
      console.error("Error fetching backups:", error);
      res.status(500).json({ message: "Failed to fetch backups" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}