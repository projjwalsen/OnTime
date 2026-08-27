import { PrismaClient } from '@prisma/client';
import { config } from '../config/env';

/**
 * Prisma client singleton.
 *
 * In development, we attach the instance to the global object to avoid
 * creating multiple instances due to hot module reloading (tsx watch).
 *
 * In production, a single instance is created and exported.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.isDevelopment ? ['query', 'error', 'warn'] : ['error'],
  });

if (config.isDevelopment) {
  globalForPrisma.prisma = prisma;
}
