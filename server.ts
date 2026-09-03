import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { InMemoryDataStore } from './src/domain/adapters/in-memory-store.ts';
import { createApiRouter } from './src/server/api-router.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body parsing with strict limits
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Security Headers baseline
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Shared domain data store
  const dataStore = new InMemoryDataStore();
  const apiRouter = createApiRouter(dataStore);

  // Top-level Health endpoints (per Section G1)
  app.get('/healthz', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), mode: 'demo-synthetic' });
  });

  app.get('/readyz', (req, res) => {
    res.status(200).json({ status: 'ready', dependencies: { store: 'in-memory-ready' } });
  });

  // Mount API Router under /api/v1
  app.use('/api/v1', apiRouter);
  // Also alias under /api for convenience
  app.use('/api', apiRouter);

  // Vite middleware in dev, static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TRUSTSHIELD AI] Server running at http://0.0.0.0:${PORT}`);
    console.log(`[TRUSTSHIELD AI] API ready at http://0.0.0.0:${PORT}/api/v1`);
  });
}

startServer().catch((err) => {
  console.error('[TRUSTSHIELD AI] Fatal server startup error:', err);
  process.exit(1);
});
