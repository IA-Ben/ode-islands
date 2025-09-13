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

  // Add JSON body parsing middleware (exclude Next.js API routes)
  // Next.js API routes handle their own body parsing, so exclude them from Express middleware
  server.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      // Skip Express body parsing for Next.js API routes
      return next();
    }
    // Apply Express body parsing for non-API routes only
    express.json()(req, res, next);
  });
  
  server.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      // Skip Express URL encoding for Next.js API routes
      return next();
    }
    express.urlencoded({ extended: true })(req, res, next);
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