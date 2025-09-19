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

  // Add JSON body parsing middleware (include Express API routes, exclude only Next.js App Router routes)
  // Express routes need body parsing, but Next.js App Router routes handle their own
  server.use((req, res, next) => {
    // Allow Express API routes (auth, cms, content, scheduler, csrf-token) to have body parsing
    if (req.path.startsWith('/api/auth/') || 
        req.path.startsWith('/api/cms/') || 
        req.path.startsWith('/api/content/') || 
        req.path.startsWith('/api/scheduler/') ||
        req.path === '/api/csrf-token') {
      // Apply Express body parsing for Express API routes
      express.json()(req, res, next);
    } else if (req.path.startsWith('/api/')) {
      // Skip Express body parsing for Next.js App Router API routes
      return next();
    } else {
      // Apply Express body parsing for non-API routes
      express.json()(req, res, next);
    }
  });
  
  server.use((req, res, next) => {
    // Allow Express API routes to have URL encoding
    if (req.path.startsWith('/api/auth/') || 
        req.path.startsWith('/api/cms/') || 
        req.path.startsWith('/api/content/') || 
        req.path.startsWith('/api/scheduler/') ||
        req.path === '/api/csrf-token') {
      // Apply Express URL encoding for Express API routes
      express.urlencoded({ extended: true })(req, res, next);
    } else if (req.path.startsWith('/api/')) {
      // Skip Express URL encoding for Next.js App Router API routes
      return next();
    } else {
      // Apply Express URL encoding for non-API routes
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
  server.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });
  
  server.get('/healthz', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });
  
  // Simple root endpoint health check - prioritize health checks over complex detection
  server.get('/', (req, res, next) => {
    // Simple health check detection - if no query params and basic request, respond as health check
    if (Object.keys(req.query).length === 0 && !req.get('Accept')?.includes('text/html')) {
      return res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    }
    
    // Otherwise, let Next.js handle the request
    return handle(req, res);
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