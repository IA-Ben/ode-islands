import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupSimpleAuth } from "./simpleAuth";
import { db } from "./db";
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

  // Setup session middleware with fallback store
  let sessionStore;
  if (process.env.DATABASE_URL) {
    // Use PostgreSQL store if DATABASE_URL is available
    const pgStore = connectPg(session);
    sessionStore = new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      ttl: 7 * 24 * 60 * 60, // 1 week in seconds
      tableName: "sessions",
    });
    console.log('Using PostgreSQL session store');
  } else {
    // Fallback to memory store (note: sessions won't persist across restarts)
    console.log('Using memory session store (sessions won\'t persist across restarts)');
    sessionStore = new session.MemoryStore();
  }

  app.use(session({
    secret: SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: 'auto', // Automatically set secure based on connection type
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

  // Content Scheduler API Routes - all require admin access
  const { schedulerManager } = await import('./schedulerManager');

  // Get all schedules with optional filtering
  app.get("/api/scheduler/schedules", isAdmin, async (req, res) => {
    try {
      const { status, contentType, fromDate, toDate, limit } = req.query;
      
      const filters: any = {};
      if (status) filters.status = status as string;
      if (contentType) filters.contentType = contentType as string;
      if (fromDate) filters.fromDate = new Date(fromDate as string);
      if (toDate) filters.toDate = new Date(toDate as string);
      if (limit) filters.limit = parseInt(limit as string);

      const schedules = await schedulerManager.getSchedules(filters);
      res.json({ success: true, schedules });
    } catch (error) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ success: false, message: "Failed to fetch schedules" });
    }
  });

  // Get a specific schedule
  app.get("/api/scheduler/schedules/:id", isAdmin, async (req, res) => {
    try {
      const schedule = await schedulerManager.getSchedule(req.params.id);
      if (!schedule) {
        return res.status(404).json({ success: false, message: "Schedule not found" });
      }
      res.json({ success: true, schedule });
    } catch (error) {
      console.error("Error fetching schedule:", error);
      res.status(500).json({ success: false, message: "Failed to fetch schedule" });
    }
  });

  // Create a new schedule
  app.post("/api/scheduler/schedules", isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId || 'admin'; // Get from session
      const scheduleData = {
        ...req.body,
        createdBy: userId
      };

      const scheduleId = await schedulerManager.createSchedule(scheduleData);
      res.json({ success: true, scheduleId, message: "Schedule created successfully" });
    } catch (error) {
      console.error("Error creating schedule:", error);
      res.status(500).json({ success: false, message: "Failed to create schedule" });
    }
  });

  // Update a schedule
  app.put("/api/scheduler/schedules/:id", isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId || 'admin';
      const updateData = {
        ...req.body,
        createdBy: userId // Reuse as lastModifiedBy
      };

      await schedulerManager.updateSchedule(req.params.id, updateData);
      res.json({ success: true, message: "Schedule updated successfully" });
    } catch (error) {
      console.error("Error updating schedule:", error);
      res.status(500).json({ success: false, message: "Failed to update schedule" });
    }
  });

  // Delete a schedule
  app.delete("/api/scheduler/schedules/:id", isAdmin, async (req, res) => {
    try {
      await schedulerManager.deleteSchedule(req.params.id);
      res.json({ success: true, message: "Schedule deleted successfully" });
    } catch (error) {
      console.error("Error deleting schedule:", error);
      res.status(500).json({ success: false, message: "Failed to delete schedule" });
    }
  });

  // Manually trigger a schedule
  app.post("/api/scheduler/schedules/:id/trigger", isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId || 'admin';
      await schedulerManager.triggerScheduleNow(req.params.id, userId);
      res.json({ success: true, message: "Schedule triggered successfully" });
    } catch (error) {
      console.error("Error triggering schedule:", error);
      res.status(500).json({ success: false, message: "Failed to trigger schedule" });
    }
  });

  // Get jobs for a specific schedule
  app.get("/api/scheduler/schedules/:id/jobs", isAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const jobs = await schedulerManager.getScheduleJobs(req.params.id, limit);
      res.json({ success: true, jobs });
    } catch (error) {
      console.error("Error fetching schedule jobs:", error);
      res.status(500).json({ success: false, message: "Failed to fetch jobs" });
    }
  });

  // Get recent jobs across all schedules
  app.get("/api/scheduler/jobs", isAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const jobs = await schedulerManager.getRecentJobs(limit);
      res.json({ success: true, jobs });
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ success: false, message: "Failed to fetch jobs" });
    }
  });

  // Get scheduler status and metrics
  app.get("/api/scheduler/status", isAdmin, async (req, res) => {
    try {
      const status = schedulerManager.getSchedulerStatus();
      res.json({ success: true, status });
    } catch (error) {
      console.error("Error fetching scheduler status:", error);
      res.status(500).json({ success: false, message: "Failed to fetch status" });
    }
  });

  // Create a quick release (utility endpoint)
  app.post("/api/scheduler/quick-release", isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId || 'admin';
      const { title, contentType, contentId, releaseTime, targetAudience } = req.body;

      const scheduleId = await schedulerManager.createQuickRelease({
        title,
        contentType,
        contentId,
        releaseTime: new Date(releaseTime),
        targetAudience,
        createdBy: userId
      });

      res.json({ success: true, scheduleId, message: "Quick release scheduled successfully" });
    } catch (error) {
      console.error("Error creating quick release:", error);
      res.status(500).json({ success: false, message: "Failed to create quick release" });
    }
  });

  // Content Availability API Routes - for user-facing content access
  const { contentSchedules, userContentAccess } = await import('../shared/schema');
  const { eq, and, lte, gte, sql } = await import('drizzle-orm');

  // Check if specific content is available for current user
  app.get("/api/content/availability", async (req, res) => {
    try {
      const { contentType, contentId } = req.query;
      const userId = req.session.userId;

      if (!userId) {
        return res.json({
          isAvailable: false,
          reason: 'Authentication required'
        });
      }

      // Check if user has access to this content
      const accessRecord = await db
        .select()
        .from(userContentAccess)
        .where(
          and(
            eq(userContentAccess.userId, userId),
            eq(userContentAccess.contentType, contentType as string),
            eq(userContentAccess.contentId, contentId as string),
            eq(userContentAccess.isActive, true)
          )
        )
        .limit(1);

      if (accessRecord.length > 0) {
        return res.json({
          isAvailable: true,
          accessGrantedAt: accessRecord[0].accessGrantedAt,
          personalizedData: accessRecord[0].personalizedData
        });
      }

      // Check if content is scheduled for future release
      const now = new Date();
      const futureSchedule = await db
        .select()
        .from(contentSchedules)
        .where(
          and(
            eq(contentSchedules.contentType, contentType as string),
            eq(contentSchedules.contentId, contentId as string),
            eq(contentSchedules.status, 'active'),
            gte(contentSchedules.nextExecutionAt, now)
          )
        )
        .limit(1);

      if (futureSchedule.length > 0) {
        return res.json({
          isAvailable: false,
          reason: 'Scheduled for future release',
          scheduledFor: futureSchedule[0].nextExecutionAt
        });
      }

      res.json({
        isAvailable: false,
        reason: 'Content not found or not available'
      });
    } catch (error) {
      console.error("Error checking content availability:", error);
      res.status(500).json({ 
        isAvailable: false, 
        reason: 'Service error' 
      });
    }
  });

  // Get all available content for current user
  app.get("/api/content/available", async (req, res) => {
    try {
      const userId = req.session.userId;

      if (!userId) {
        return res.json({ availableContent: [] });
      }

      const availableContent = await db
        .select()
        .from(userContentAccess)
        .where(
          and(
            eq(userContentAccess.userId, userId),
            eq(userContentAccess.isActive, true)
          )
        )
        .orderBy(userContentAccess.accessGrantedAt);

      res.json({ availableContent });
    } catch (error) {
      console.error("Error fetching available content:", error);
      res.status(500).json({ availableContent: [] });
    }
  });

  // Get upcoming scheduled content for current user
  app.get("/api/content/upcoming", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const now = new Date();

      const upcomingContent = await db
        .select({
          contentType: contentSchedules.contentType,
          contentId: contentSchedules.contentId,
          title: contentSchedules.title,
          description: contentSchedules.description,
          scheduledFor: contentSchedules.nextExecutionAt
        })
        .from(contentSchedules)
        .where(
          and(
            eq(contentSchedules.status, 'active'),
            gte(contentSchedules.nextExecutionAt, now)
          )
        )
        .orderBy(contentSchedules.nextExecutionAt)
        .limit(limit);

      res.json({ upcomingContent });
    } catch (error) {
      console.error("Error fetching upcoming content:", error);
      res.status(500).json({ upcomingContent: [] });
    }
  });

  // Check content access conditions
  app.get("/api/content/conditions", async (req, res) => {
    try {
      const { contentType, contentId } = req.query;
      const userId = req.session.userId;

      if (!userId) {
        return res.json({
          canAccess: false,
          missingConditions: [{ type: 'authentication', description: 'User must be logged in' }]
        });
      }

      // For now, return basic implementation
      // In a real system, this would check complex conditions
      res.json({
        canAccess: true,
        missingConditions: []
      });
    } catch (error) {
      console.error("Error checking content conditions:", error);
      res.status(500).json({
        canAccess: false,
        missingConditions: [{ type: 'error', description: 'Service unavailable' }]
      });
    }
  });

  // Mark content as accessed
  app.post("/api/content/accessed", async (req, res) => {
    try {
      const { contentType, contentId } = req.body;
      const userId = req.session.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Update access tracking
      await db
        .update(userContentAccess)
        .set({
          lastAccessedAt: new Date(),
          totalAccessCount: sql`${userContentAccess.totalAccessCount} + 1`,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(userContentAccess.userId, userId),
            eq(userContentAccess.contentType, contentType),
            eq(userContentAccess.contentId, contentId)
          )
        );

      res.json({ success: true });
    } catch (error) {
      console.error("Error marking content as accessed:", error);
      res.status(500).json({ error: 'Failed to track access' });
    }
  });

  // Get user content analytics
  app.get("/api/content/analytics", async (req, res) => {
    try {
      const userId = req.session.userId;

      if (!userId) {
        return res.json({
          totalAccessed: 0,
          recentlyAccessed: [],
          upcomingCount: 0
        });
      }

      // Get total accessed content count
      const accessedContent = await db
        .select()
        .from(userContentAccess)
        .where(
          and(
            eq(userContentAccess.userId, userId),
            eq(userContentAccess.isActive, true)
          )
        );

      // Get recent access history
      const recentlyAccessed = await db
        .select({
          contentType: userContentAccess.contentType,
          contentId: userContentAccess.contentId,
          accessedAt: userContentAccess.lastAccessedAt
        })
        .from(userContentAccess)
        .where(
          and(
            eq(userContentAccess.userId, userId),
            eq(userContentAccess.isActive, true)
          )
        )
        .orderBy(userContentAccess.lastAccessedAt)
        .limit(10);

      // Get upcoming content count
      const now = new Date();
      const upcomingContent = await db
        .select()
        .from(contentSchedules)
        .where(
          and(
            eq(contentSchedules.status, 'active'),
            gte(contentSchedules.nextExecutionAt, now)
          )
        );

      res.json({
        totalAccessed: accessedContent.length,
        recentlyAccessed: recentlyAccessed.filter(item => item.accessedAt),
        upcomingCount: upcomingContent.length
      });
    } catch (error) {
      console.error("Error fetching content analytics:", error);
      res.status(500).json({
        totalAccessed: 0,
        recentlyAccessed: [],
        upcomingCount: 0
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}