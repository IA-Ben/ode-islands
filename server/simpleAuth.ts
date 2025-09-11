import express from 'express';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

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
  app.post('/api/auth/login', loginLimiter, (req, res) => {
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
      req.session.isAuthenticated = true;
      res.json({ success: true, message: 'Login successful' });
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

  // Get user endpoint - fixed schema mismatch
  app.get('/api/auth/user', (req, res) => {
    if (req.session.isAuthenticated) {
      res.json({ 
        id: 'admin',
        email: 'admin@theodeislands.com',
        firstName: 'Admin', // Fixed: was first_name
        lastName: 'User',   // Fixed: was last_name
        isAdmin: true       // Fixed: was is_admin
      });
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
  }
}