import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";

// Re-export auth middleware
export { isAuthenticated, isAdmin };

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.user as any).claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

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
      const userId = (req.user as any)?.claims?.sub;
      
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