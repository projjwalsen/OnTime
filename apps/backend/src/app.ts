import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs';
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
 *     ↓ Static Media (/uploads & /api/v1/uploads)
 *     ↓ Morgan (request logging)
 *     ↓ JSON body parser
 *     ↓ API Routes (/api/v1/...)
 *       ↓ Controllers
 *         ↓ Services
 *           ↓ Repositories / Prisma
 *             ↓ PostgreSQL
 */
export function createApp(): Application {
  const app = express();

  // ── Ensure Local Upload Directory Exists ──────────────────
  try {
    if (!fs.existsSync(config.uploadDir)) {
      fs.mkdirSync(config.uploadDir, { recursive: true });
    }
  } catch (err) {
    console.warn('[Server] Could not initialize upload directory:', err);
  }

  // ── Security headers ──────────────────────────────────────
  // Allow cross-origin resource policy so images can be rendered in browser frontends
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // ── CORS ─────────────────────────────────────────────────
  app.use(cors());

  // ── Static Media Files (Ubuntu Server Disk Storage) ───────
  // Serve at /uploads and /api/v1/uploads for seamless reverse-proxy & direct access
  app.use(
    '/uploads',
    express.static(config.uploadDir, {
      maxAge: '30d',
      immutable: true,
    }),
  );
  app.use(
    '/api/v1/uploads',
    express.static(config.uploadDir, {
      maxAge: '30d',
      immutable: true,
    }),
  );

  // ── Request logging (dev only) ────────────────────────────
  if (config.isDevelopment) {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // ── Body parsing (large file / payload limits) ────────────
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
