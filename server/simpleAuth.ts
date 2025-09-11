import express from 'express';
import session from 'express-session';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

export function setupSimpleAuth(app: express.Application) {
  // Login endpoint
  app.post('/api/auth/login', (req, res) => {
    const { password } = req.body;
    
    if (password === ADMIN_PASSWORD) {
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