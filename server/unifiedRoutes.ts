import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { withAdminAuthAndCSRF, withCSRFProtection, validateCSRFToken } from "./auth";

// Re-export unified auth middleware
export { isAuthenticated };

// Database-backed admin middleware that works with Replit Auth
export async function isAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = req.user;
  const userId = user?.claims?.sub;

  if (!userId) {
    return res.status(401).json({ error: 'Invalid user session' });
  }

  try {
    // Check admin status from database
    const dbUser = await storage.getUser(userId);
    
    if (!dbUser) {
      return res.status(401).json({ error: 'User not found in database' });
    }

    if (!dbUser.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    return next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({ error: 'Failed to verify admin status' });
  }
}

// CSRF-protected admin middleware
export function isAdminWithCSRF(req: any, res: any, next: any) {
  // For mutating operations, check CSRF token
  const protectedMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  
  if (protectedMethods.includes(req.method)) {
    const csrfToken = req.headers['x-csrf-token'] || req.cookies['csrf-token'];
    
    if (!csrfToken) {
      return res.status(403).json({ error: 'CSRF token required for this operation' });
    }
    
    // Validate CSRF token against session
    // CRITICAL FIX: Use req.sessionID (Express standard) to match token generation
    const sessionId = req.sessionID;
    if (!sessionId || !validateCSRFToken(csrfToken, sessionId)) {
      return res.status(403).json({ error: 'Invalid or expired CSRF token' });
    }
  }
  
  // Then check admin privileges
  return isAdmin(req, res, next);
}

export async function registerUnifiedRoutes(app: Express): Promise<Server> {
  // Enforce required SESSION_SECRET
  const SESSION_SECRET = process.env.SESSION_SECRET;
  if (!SESSION_SECRET) {
    console.error('FATAL: SESSION_SECRET environment variable is required');
    process.exit(1);
  }

  // Setup Replit Auth (this includes session management)
  await setupAuth(app);

  // Unified CSRF token endpoint tied to Express session
  app.get('/api/csrf-token', (req: any, res) => {
    if (!req.session) {
      return res.status(401).json({ success: false, message: 'No session' });
    }

    // CRITICAL FIX: Use the same JWT-based CSRF system as validation
    const { generateCSRFToken } = require('./auth');
    const sessionId = req.sessionID;
    
    // Generate JWT-based CSRF token that matches validation
    const csrfToken = generateCSRFToken(sessionId);

    // Set CSRF token in cookie for client access
    res.cookie('csrf-token', csrfToken, {
      httpOnly: false, // Client needs to read this
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
    });

    res.json({ success: true, csrfToken });
  });

  // Auth status endpoint for checking authentication state
  app.get('/api/auth/status', (req: any, res) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
      res.json({ authenticated: true });
    } else {
      res.status(401).json({ authenticated: false });
    }
  });

  // Unified auth routes that work with Replit Auth
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user!.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        // User might not exist in database yet, create from claims
        const userData = {
          id: userId,
          email: req.user.claims.email,
          firstName: req.user.claims.first_name,
          lastName: req.user.claims.last_name,
          profileImageUrl: req.user.claims.profile_image_url,
        };
        
        const newUser = await storage.upsertUser(userData);
        return res.json(newUser);
      }
      
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

  app.post("/api/cms/chapters", isAdminWithCSRF, async (req, res) => {
    try {
      const { id, cards } = req.body;
      const userId = req.user!.claims.sub; // Get actual user ID from Replit Auth
      
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

  // Admin User Management API Routes - all require admin access with CSRF protection
  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id", isAdminWithCSRF, async (req, res) => {
    try {
      const userId = req.params.id;
      const updates = req.body;
      const updatedUser = await storage.updateUser(userId, updates);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/admin/users/:id", isAdminWithCSRF, async (req, res) => {
    try {
      const userId = req.params.id;
      await storage.deleteUser(userId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Admin Theme Management API Routes - all require admin access with CSRF protection
  app.get("/api/admin/theme", isAdmin, async (req, res) => {
    try {
      // For now, return the default theme or read from a config file
      const fs = await import('fs/promises');
      const path = await import('path');
      const themePath = path.join(process.cwd(), 'src/config/theme.json');
      
      try {
        const themeData = await fs.readFile(themePath, 'utf-8');
        const theme = JSON.parse(themeData);
        res.json(theme);
      } catch (fileError) {
        // If theme file doesn't exist, return default theme
        const defaultTheme = {
          brand: { primary: '#1e293b', secondary: '#334155', accent: '#3b82f6' },
          fonts: { primary: 'Manrope', secondary: 'Inter' },
          colors: { background: '#000000', foreground: '#ffffff', text: '#e2e8f0', muted: '#64748b' }
        };
        res.json(defaultTheme);
      }
    } catch (error) {
      console.error("Error loading theme:", error);
      res.status(500).json({ message: "Failed to load theme" });
    }
  });

  app.post("/api/admin/theme", isAdminWithCSRF, async (req, res) => {
    try {
      const themeConfig = req.body;
      const userId = req.user!.claims.sub;
      
      // Save theme to file
      const fs = await import('fs/promises');
      const path = await import('path');
      const themePath = path.join(process.cwd(), 'src/config/theme.json');
      
      // Ensure config directory exists
      await fs.mkdir(path.dirname(themePath), { recursive: true });
      
      // Create backup of current theme
      try {
        const currentTheme = await fs.readFile(themePath, 'utf-8');
        await storage.createContentBackup(
          `theme-backup-${Date.now()}.json`,
          currentTheme,
          userId
        );
      } catch (backupError) {
        // Theme file might not exist yet, continue without backup
        console.log('No existing theme to backup');
      }
      
      // Save new theme configuration
      await fs.writeFile(themePath, JSON.stringify(themeConfig, null, 2));
      
      res.json({ message: "Theme saved successfully" });
    } catch (error) {
      console.error("Error saving theme:", error);
      res.status(500).json({ message: "Failed to save theme" });
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
  app.post("/api/scheduler/schedules", isAdminWithCSRF, async (req, res) => {
    try {
      const userId = req.user!.claims.sub; // Get actual user ID from Replit Auth
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
  app.put("/api/scheduler/schedules/:id", isAdminWithCSRF, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const updateData = {
        ...req.body,
        lastModifiedBy: userId
      };

      await schedulerManager.updateSchedule(req.params.id, updateData);
      res.json({ success: true, message: "Schedule updated successfully" });
    } catch (error) {
      console.error("Error updating schedule:", error);
      res.status(500).json({ success: false, message: "Failed to update schedule" });
    }
  });

  // Delete a schedule
  app.delete("/api/scheduler/schedules/:id", isAdminWithCSRF, async (req, res) => {
    try {
      await schedulerManager.deleteSchedule(req.params.id);
      res.json({ success: true, message: "Schedule deleted successfully" });
    } catch (error) {
      console.error("Error deleting schedule:", error);
      res.status(500).json({ success: false, message: "Failed to delete schedule" });
    }
  });

  // Admin Theme Management API Routes
  app.get("/api/admin/theme", isAdmin, async (req, res) => {
    try {
      // Default theme configuration
      const defaultTheme = {
        brand: {
          primary: '#1e293b',
          secondary: '#334155',
          accent: '#3b82f6'
        },
        fonts: {
          primary: 'Manrope',
          secondary: 'Inter'
        },
        colors: {
          background: '#000000',
          foreground: '#ffffff',
          text: '#e2e8f0',
          muted: '#64748b'
        }
      };

      // For now, return default theme. In a full implementation, 
      // this would load from database or file system
      res.json(defaultTheme);
    } catch (error) {
      console.error("Error fetching theme:", error);
      res.status(500).json({ message: "Failed to fetch theme" });
    }
  });

  app.post("/api/admin/theme", isAdminWithCSRF, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;
      const themeConfig = req.body;
      
      // In a full implementation, this would save to database or file system
      // For now, just simulate success
      console.log('Theme updated by admin:', userId, themeConfig);
      
      res.json({ success: true, message: "Theme saved successfully" });
    } catch (error) {
      console.error("Error saving theme:", error);
      res.status(500).json({ message: "Failed to save theme" });
    }
  });

  // Admin User Management API Routes
  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id", isAdminWithCSRF, async (req, res) => {
    try {
      const userId = req.params.id;
      const updates = req.body;
      const adminUserId = req.user!.claims.sub;

      // Prevent admins from modifying their own admin status
      if (userId === adminUserId && 'isAdmin' in updates) {
        return res.status(400).json({ message: "Cannot modify your own admin status" });
      }

      await storage.updateUser(userId, updates);
      res.json({ success: true, message: "User updated successfully" });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/admin/users/:id", isAdminWithCSRF, async (req, res) => {
    try {
      const userId = req.params.id;
      const adminUserId = req.user!.claims.sub;

      // Prevent admins from deleting themselves
      if (userId === adminUserId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      await storage.deleteUser(userId);
      res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Content Availability API Routes - for user-facing content access
  const { contentSchedules, userContentAccess } = await import('../shared/schema');
  const { eq, and, lte, gte, sql } = await import('drizzle-orm');
  const { db } = await import('./db');

  // Check if specific content is available for current user
  app.get("/api/content/availability", isAuthenticated, async (req, res) => {
    try {
      const { contentType, contentId } = req.query;
      const userId = req.user!.claims.sub;

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
  app.get("/api/content/available", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.claims.sub;

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

  const httpServer = createServer(app);
  return httpServer;
}