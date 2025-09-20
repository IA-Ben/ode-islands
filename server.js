const express = require('express');
const next = require('next');
const http = require('http');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = process.env.PORT || 5000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const server = express();

  // Trust proxy for production deployments (required for secure cookies behind proxy)
  server.set('trust proxy', 1);

  // Add basic security headers
  server.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (!dev) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  // Add cookie parser for CSRF token validation
  const cookieParser = require('cookie-parser');
  server.use(cookieParser());

  // Add rate limiting for authentication endpoints (only mutating operations)
  const rateLimit = require('express-rate-limit');
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // increased limit for mutating operations only
    message: {
      status: 'error',
      message: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Only apply to mutating HTTP methods, not GET requests
    skip: (req) => req.method === 'GET'
  });

  // Apply rate limiting to all auth endpoints (covers both Express and Next.js auth routes)
  server.use('/api/auth/', authLimiter);
  server.use('/api/dev-login', authLimiter);

  // Body parsing middleware - Express handles unified auth/admin routes, Next.js handles the rest
  server.use((req, res, next) => {
    // Express routes that need body parsing (handled by unifiedRoutes.ts):
    // - /api/auth/* (login, logout, user info)
    // - /api/csrf-token
    // - /api/admin/* (admin user/theme management)  
    // - /api/cms/* (content management)
    // - /api/content/* (content availability)
    // - /api/scheduler/* (content scheduling)
    // - /api/dev-login (development only)
    
    const expressApiPaths = [
      '/api/auth/',
      '/api/admin/', 
      '/api/cms/',
      '/api/content/',
      '/api/scheduler/',
      '/api/csrf-token',
      '/api/dev-login'
    ];
    
    const isExpressRoute = expressApiPaths.some(path => 
      req.path === path || req.path.startsWith(path)
    );
    
    if (isExpressRoute) {
      // Apply Express body parsing for unified Express routes
      express.json()(req, res, next);
    } else if (req.path.startsWith('/api/')) {
      // Skip body parsing for Next.js App Router API routes (they handle their own)
      return next();
    } else {
      // Apply body parsing for non-API routes
      express.json()(req, res, next);
    }
  });
  
  server.use((req, res, next) => {
    // URL encoding middleware with same logic
    const expressApiPaths = [
      '/api/auth/',
      '/api/admin/', 
      '/api/cms/',
      '/api/content/',
      '/api/scheduler/',
      '/api/csrf-token',
      '/api/dev-login'
    ];
    
    const isExpressRoute = expressApiPaths.some(path => 
      req.path === path || req.path.startsWith(path)
    );
    
    if (isExpressRoute) {
      express.urlencoded({ extended: true })(req, res, next);
    } else if (req.path.startsWith('/api/')) {
      return next();
    } else {
      express.urlencoded({ extended: true })(req, res, next);
    }
  });

  // Setup session middleware required for simple authentication
  const session = require('express-session');
  const connectPg = require('connect-pg-simple');

  // Enforce required SESSION_SECRET
  const SESSION_SECRET = process.env.SESSION_SECRET;
  if (!SESSION_SECRET) {
    console.error('FATAL: SESSION_SECRET environment variable is required');
    process.exit(1);
  }

  // Enforce DATABASE_URL in production environment
  if (!dev && !process.env.DATABASE_URL) {
    console.error('FATAL: DATABASE_URL environment variable is required in production');
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

  server.use(session({
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

  // Simple auth has been removed - using unified Replit OAuth system instead

  // Import and setup unified authentication routes
  const { registerUnifiedRoutes, isAuthenticated, isAdmin } = await import('./server/unifiedRoutes.ts');
  await registerUnifiedRoutes(server);

  // Initialize WebSocket server
  const { webSocketManager } = await import('./server/websocket.ts');

  // Note: CMS page now handles authentication on the client side

  // Add dedicated health check endpoints for fast deployment health check response
  const healthHandler = (req, res) => {
    try {
      const healthData = { status: 'ok', timestamp: new Date().toISOString() };
      
      // For HEAD requests, just send status code
      if (req.method === 'HEAD') {
        res.status(200).end();
      } else {
        res.status(200).json(healthData);
      }
    } catch (error) {
      console.error('Health check error:', error);
      res.status(503).json({ status: 'error', message: 'Service unavailable' });
    }
  };
  
  server.get('/health', healthHandler);
  server.head('/health', healthHandler);
  server.get('/healthz', healthHandler);
  server.head('/healthz', healthHandler);
  
  // Simple root endpoint health check - prioritize health checks over complex detection
  server.get('/', (req, res, next) => {
    // Simple health check detection - if no query params and basic request, respond as health check
    if (Object.keys(req.query).length === 0 && !req.get('Accept')?.includes('text/html')) {
      return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    }
    
    // Otherwise, let Next.js handle the request
    return handle(req, res);
  });

  // Global error handler for Express routes
  server.use((err, req, res, next) => {
    console.error('Express error:', err);
    
    // Don't send error details in production
    const errorMessage = dev ? err.message : 'Internal server error';
    
    if (!res.headersSent) {
      res.status(err.status || 500).json({
        status: 'error',
        message: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Handle Next.js requests (except API routes which are handled by Express)
  server.use((req, res) => {
    return handle(req, res);
  });

  // Create HTTP server and initialize WebSocket
  const httpServer = http.createServer(server);
  webSocketManager.initialize(httpServer);

  // Initialize Content Scheduler
  const { schedulerManager } = await import('./server/schedulerManager.ts');
  await schedulerManager.initialize();

  // Seed admin users from ADMIN_EMAILS environment variable
  const { storage } = await import('./server/storage.ts');
  await storage.seedAdminUsers();

  httpServer.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket server ready on ws://${hostname}:${port}/ws`);
    console.log(`> Content scheduler initialized and running`);
  });

  // Graceful shutdown handling
  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    await schedulerManager.shutdown();
    httpServer.close(() => {
      console.log('Server shut down');
      process.exit(0);
    });
  });

  process.on('SIGINT', async () => {
    console.log('Received SIGINT, shutting down gracefully...');
    await schedulerManager.shutdown();
    httpServer.close(() => {
      console.log('Server shut down');
      process.exit(0);
    });
  });
});