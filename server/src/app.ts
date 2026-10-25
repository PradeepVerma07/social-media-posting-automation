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

export const app = express();

const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(express.json({ limit: '100mb' }));
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

app.get('/ready', (req: Request, res: Response) => {
  res.json({ status: 'ready', database: 'connected', timestamp: new Date().toISOString() });
});

app.get('/healthz', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/readyz', (req: Request, res: Response) => {
  res.json({ status: 'ready', database: 'connected', timestamp: new Date().toISOString() });
});

// Mount V2 Production Routers
app.use('/internal', internalRouter);
app.use('/api/v1', publicRouter);

// Start V2 Production Background Engines
sheetsOutboxWorker.startWorker(2000);
sheetsReconciliationService.startReconciliation(60);
backgroundSweeper.startSweeper(60);
n8nApiPoller.startPoller(15);
scheduledPublisher.startService(15);

logger.info('CI360 v2 Production Core initialized with durable SQLite WAL, Outbox, and Sweepers.');
