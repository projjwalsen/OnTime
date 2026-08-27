import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env';
import apiRouter from './routes/index';
import { errorResponse } from './utils/response';

/**
 * Creates and configures the Express application.
 *
 * Architecture:
 *   Request
 *     ↓ Helmet (security headers)
 *     ↓ CORS
 *     ↓ Morgan (request logging)
 *     ↓ JSON body parser
 *     ↓ [Authentication middleware — future]
 *     ↓ [Role / Organisation Access — future]
 *     ↓ Route handlers
 *       ↓ Controllers
 *         ↓ Services
 *           ↓ Repositories / Prisma
 *             ↓ PostgreSQL
 */
export function createApp(): Application {
  const app = express();

  // ── Security headers ──────────────────────────────────────
  app.use(helmet());

  // ── CORS ─────────────────────────────────────────────────
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // ── Request logging (dev only) ────────────────────────────
  if (config.isDevelopment) {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // ── Body parsing ──────────────────────────────────────────
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ── API Routes ────────────────────────────────────────────
  app.use('/api', apiRouter);

  // ── 404 handler ───────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    errorResponse(res, 'Route not found', 404);
  });

  // ── Global error handler ──────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Error]', err.message, err.stack);
    errorResponse(res, config.isDevelopment ? err.message : 'Internal server error', 500);
  });

  return app;
}
