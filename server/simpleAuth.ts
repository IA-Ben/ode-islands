import express from 'express';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { db } from './db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Enforce required environment variables
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  console.error('FATAL: ADMIN_PASSWORD environment variable is required');
  process.exit(1);
}

// Rate limiting for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { success: false, message: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export function setupSimpleAuth(app: express.Application) {
  // Login endpoint with rate limiting and timing-safe comparison
  app.post('/api/auth/login', loginLimiter, async (req, res) => {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }
    
    // Timing-safe password comparison
    const providedBuffer = Buffer.from(password);
    const expectedBuffer = Buffer.from(ADMIN_PASSWORD!);
    
    // Ensure buffers are same length to prevent timing attacks
    let isValid = providedBuffer.length === expectedBuffer.length;
    if (isValid) {
      isValid = crypto.timingSafeEqual(providedBuffer, expectedBuffer);
    }
    
    if (isValid) {
      try {
        // Find admin user in database - look for first admin user
        const adminUsers = await db.select().from(users).where(eq(users.isAdmin, true)).limit(1);
        
        if (adminUsers.length > 0) {
          const adminUser = adminUsers[0];
          req.session.isAuthenticated = true;
          req.session.userId = adminUser.id;
          req.session.isAdmin = true;
          res.json({ success: true, message: 'Login successful' });
        } else {
          // No admin user found - create one
          const newAdmin = await db.insert(users).values({
            email: 'admin@theodeislands.com',
            firstName: 'Admin',
            lastName: 'User',
            isAdmin: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          }).returning();
          
          req.session.isAuthenticated = true;
          req.session.userId = newAdmin[0].id;
          req.session.isAdmin = true;
          res.json({ success: true, message: 'Login successful - admin user created' });
        }
      } catch (error) {
        console.error('Database error during login:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
      }
    } else {
      res.status(401).json({ success: false, message: 'Invalid password' });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Logout failed' });
      }
      res.json({ success: true, message: 'Logout successful' });
    });
  });

  // Auth status endpoint
  app.get('/api/auth/status', (req, res) => {
    if (req.session.isAuthenticated) {
      res.json({ authenticated: true });
    } else {
      res.status(401).json({ authenticated: false });
    }
  });

  // Get user endpoint - now fetches real user data from database
  app.get('/api/auth/user', async (req, res) => {
    if (req.session.isAuthenticated && req.session.userId) {
      try {
        // Fetch real user data from database
        const [user] = await db.select().from(users).where(eq(users.id, req.session.userId));
        
        if (user) {
          res.json({
            id: user.id,
            email: user.email || '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            isAdmin: user.isAdmin || false,
            profileImageUrl: user.profileImageUrl || undefined,
            emailVerified: user.emailVerified || false,
            createdAt: user.createdAt
          });
        } else {
          // User not found in database - invalid session
          req.session.destroy((err) => {
            if (err) console.error('Session destroy error:', err);
          });
          res.status(401).json({ error: 'User not found' });
        }
      } catch (error) {
        console.error('Database error fetching user:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    } else {
      res.status(401).json({ error: 'Authentication required' });
    }
  });

  // Auth middleware for protected routes
  app.use('/api/cms', (req, res, next) => {
    if (req.session.isAuthenticated) {
      next();
    } else {
      res.status(401).json({ error: 'Authentication required' });
    }
  });
}

// Type declaration for session
declare module 'express-session' {
  interface SessionData {
    isAuthenticated?: boolean;
    userId?: string;
    isAdmin?: boolean;
  }
}