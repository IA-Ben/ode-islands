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
    // Allow Express API routes (auth, cms, content, scheduler) to have body parsing
    if (req.path.startsWith('/api/auth/') || 
        req.path.startsWith('/api/cms/') || 
        req.path.startsWith('/api/content/') || 
        req.path.startsWith('/api/scheduler/')) {
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
        req.path.startsWith('/api/scheduler/')) {
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

  // Import and setup authentication routes
  const { registerRoutes, isAuthenticated, isAdmin } = await import('./server/routes.ts');
  await registerRoutes(server);

  // Initialize WebSocket server
  const { webSocketManager } = await import('./server/websocket.ts');

  // Note: CMS page now handles authentication on the client side

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