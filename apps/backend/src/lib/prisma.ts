import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { config } from '../config/env';

/**
 * Prisma client singleton with PostgreSQL driver adapter (Prisma 7).
 *
 * In development, we attach the instance to the global object to avoid
 * creating multiple instances due to hot module reloading (tsx watch).
 *
 * In production, a single instance is created and exported.
 */

const pool = new Pool({ connectionString: config.databaseUrl });
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: config.isDevelopment ? ['query', 'error', 'warn'] : ['error'],
  });

if (config.isDevelopment) {
  globalForPrisma.prisma = prisma;
}

