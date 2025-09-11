const express = require('express');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = process.env.PORT || 5000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const server = express();

  // Add JSON body parsing middleware
  server.use(express.json());
  server.use(express.urlencoded({ extended: true }));

  // Import and setup authentication routes
  const { registerRoutes, isAuthenticated, isAdmin } = await import('./server/routes.ts');
  await registerRoutes(server);

  // Protect CMS routes - require admin authentication
  server.use('/cms', isAdmin, (req, res, next) => {
    next();
  });

  // Handle Next.js requests (except API routes which are handled by Express)
  server.use((req, res) => {
    return handle(req, res);
  });

  server.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});