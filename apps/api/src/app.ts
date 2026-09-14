import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env, isTest } from './config/env.js';
import { logger } from './lib/logger.js';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { prisma } from './lib/prisma.js';

/**
 * The app is built here and started in `server.ts`, so tests can mount it with
 * supertest without binding a port.
 */
export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );
  app.use(express.json({ limit: '256kb' }));

  if (!isTest) app.use(pinoHttp({ logger }));

  /** Liveness plus a real database round-trip, for deploy health checks. */
  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', database: 'up', uptime: process.uptime() });
    } catch {
      res.status(503).json({ status: 'degraded', database: 'down' });
    }
  });

  app.use('/api', apiRouter);

  // Order matters: unmatched routes first, then the error handler last.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
