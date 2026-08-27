import 'dotenv/config';
import http from 'http';
import { createApp } from './app';
import { config } from './config/env';
import { prisma } from './lib/prisma';

/**
 * Server entry point.
 *
 * The HTTP server starts immediately to serve the health check endpoint.
 * The database connection is established asynchronously after server start.
 * If the database is unavailable, the server logs an error but continues running.
 * Business routes requiring DB access will fail gracefully until the DB is available.
 */

const app = createApp();
const server = http.createServer(app);

function connectDatabase(): void {
  console.info('[Server] Connecting to database...');
  prisma
    .$connect()
    .then(() => {
      console.info('[Server] Database connected successfully.');
    })
    .catch((err: unknown) => {
      console.error('[Server] Database connection failed:', err);
      console.warn(
        '[Server] Running without database connection. Health endpoint is still available.',
      );
      console.warn('[Server] Please configure DATABASE_URL in apps/backend/.env');
    });
}

function shutdown(signal: string): void {
  console.info(`\n[Server] ${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.info('[Server] HTTP server closed.');
    prisma
      .$disconnect()
      .then(() => {
        console.info('[Server] Database disconnected.');
        process.exit(0);
      })
      .catch(() => {
        process.exit(0);
      });
  });
}

server.listen(config.port, () => {
  console.info(`[Server] OnTime API running on port ${config.port}`);
  console.info(`[Server] Environment: ${config.nodeEnv}`);
  console.info(`[Server] Health check: http://localhost:${config.port}/api/v1/health`);
  connectDatabase();
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});
process.on('SIGINT', () => {
  shutdown('SIGINT');
});
