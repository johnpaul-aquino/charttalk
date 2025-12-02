/**
 * Prisma Client Singleton
 *
 * Provides a singleton instance of the Prisma client for database access.
 * Handles connection pooling and prevents multiple instances in development.
 *
 * Prisma 7 requires a driver adapter for all database connections.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

// Declare global type to store prisma client
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Create Prisma client with PostgreSQL adapter
 */
function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.warn('[Prisma] DATABASE_URL not configured - database features disabled');
    // Return a mock client that will fail gracefully
    return new Proxy({} as PrismaClient, {
      get: (target, prop) => {
        if (prop === '$connect' || prop === '$disconnect') {
          return async () => {};
        }
        throw new Error(
          'Database not configured. Set DATABASE_URL environment variable.'
        );
      },
    });
  }

  // Create the PostgreSQL adapter
  const adapter = new PrismaPg({ connectionString });

  // Create Prisma client with adapter
  const client = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

  return client;
}

/**
 * Get the singleton Prisma client instance
 *
 * In development, we store the client in a global variable to prevent
 * creating multiple instances during hot reloading.
 */
export function getPrismaClient(): PrismaClient {
  if (process.env.NODE_ENV === 'production') {
    return createPrismaClient();
  }

  // In development, use global to maintain singleton across hot reloads
  if (!global.__prisma) {
    global.__prisma = createPrismaClient();
  }

  return global.__prisma;
}

/**
 * Disconnect the Prisma client
 */
export async function disconnectPrisma(): Promise<void> {
  if (global.__prisma) {
    await global.__prisma.$disconnect();
    global.__prisma = undefined;
  }
}

/**
 * Default export of the singleton client
 */
export const prisma = getPrismaClient();
