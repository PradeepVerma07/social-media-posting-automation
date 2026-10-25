import './server/src/utils/dnsResolver';
import fs from 'fs';
import path from 'path';
import express from 'express';
import { createServer } from 'http';
import { app } from './server/src/app';
import { mySQLSyncService } from './server/src/db/mysqlSync';

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const possibleDistPaths = [
    path.resolve(process.cwd(), 'dist'),
    path.resolve(process.cwd(), 'server', 'dist', 'public'),
    path.resolve(process.cwd(), 'public_html'),
  ];
  const distPath = possibleDistPaths.find(p => fs.existsSync(path.join(p, 'index.html'))) || possibleDistPaths[0];
  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));
  const isProd = process.env.NODE_ENV === 'production' || hasDist;

  if (!isProd) {
    try {
      // In dev, attach Vite middleware so frontend & backend run together on port 3000
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch {
      // Fallback to static serving if vite middleware fails
      if (hasDist) {
        app.use(express.static(distPath));
        app.get('*', (req, res) => {
          res.sendFile(path.join(distPath, 'index.html'));
        });
      }
    }
  } else {
    // In production, serve built SPA
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = createServer(app);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`CI360 Automation Hub running on http://0.0.0.0:${PORT}`);
  });

  // Start MySQL Sync Service if configured
  mySQLSyncService.start().catch(err => {
    console.warn('MySQL Sync Service initialization warning:', err.message);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
