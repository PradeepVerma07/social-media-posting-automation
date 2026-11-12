import './utils/dnsResolver';
import path from 'path';
import fs from 'fs';
import express, { Request, Response, NextFunction } from 'express';
import { internalRouter } from './routes/internalRoutes';
import { publicRouter } from './routes/publicRoutes';
import { sheetsOutboxWorker } from './services/sheetsOutboxWorker';
import { sheetsReconciliationService } from './services/sheetsReconciliation';
import { backgroundSweeper } from './services/sweeper';
import { n8nApiPoller } from './services/n8nApiPoller';
import { scheduledPublisher } from './services/scheduledPublisher';
import { logger } from './logging/logger';
import { authRouter, authenticate, authorize } from './services/access';
import { enterpriseRouter } from './routes/enterpriseRoutes';
import { db } from './db/sqlite';
import { aiStudioRouter } from './routes/aiStudioRoutes';
import { videoDashboardRouter, videoMachineRouter } from './routes/antigravityVideoRoutes';

export const app = express();

const uploadsDir = path.resolve(process.env.UPLOADS_DIRECTORY || path.join(process.env.DATA_DIRECTORY || process.cwd(), 'uploads'));
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(express.json({ limit: '70mb', verify: (req, _res, buffer) => { (req as Request).rawBody = buffer; } }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Serve uploaded media (images & videos) statically
app.use('/uploads', express.static(uploadsDir));

// Security & CORS headers
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Health Checks (v1 & v2 paths)
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', uptimeSeconds: Math.floor(process.uptime()), timestamp: new Date().toISOString() });
});

const readiness = (_req: Request, res: Response) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({ status: 'ready', database: 'connected', timestamp: new Date().toISOString() });
  } catch { res.status(503).json({ status: 'not_ready', database: 'unavailable' }); }
};
app.get('/ready', readiness);

app.get('/healthz', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/readyz', readiness);

// Mount V2 Production Routers
app.use('/internal', internalRouter);
app.use('/api/v1/auth', authRouter);
// Machine routes authenticate only their explicit paths; all dashboard routes still use sessions.
app.use('/api/v1/automation/videos', videoMachineRouter);
app.use('/api/v1', authenticate, authorize);
app.use('/api/v1/automation/videos', videoDashboardRouter);
app.use('/api/v1/ai/studio', aiStudioRouter);
app.use('/api/v1', enterpriseRouter);
app.use('/api/v1', publicRouter);

// Start V2 Production Background Engines
if (process.env.ENABLE_BACKGROUND_WORKERS === 'true') {
  if (process.env.ENABLE_SHEETS_SYNC === 'true') {
    sheetsOutboxWorker.startWorker(2000);
    sheetsReconciliationService.startReconciliation(60);
  }
  backgroundSweeper.startSweeper(60);
  if (process.env.N8N_API_KEY) n8nApiPoller.startPoller(15);
  scheduledPublisher.startService(15);
}

logger.info({ backgroundWorkers: process.env.ENABLE_BACKGROUND_WORKERS === 'true' }, 'Webtrionix 360 initialized');
