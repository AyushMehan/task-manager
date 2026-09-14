import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env, isProduction } from '../config/env.js';
import { logger } from './logger.js';

/**
 * Single Prisma entry point for the whole API. Every import of the client and
 * its generated types goes through this module, so the rest of the codebase is
 * insulated from where the client is generated.
 *
 * Prisma 7 connects through a driver adapter rather than a `url` in the schema
 * — `prisma.config.ts` covers the CLI, this covers the runtime.
 */
export { Prisma };
export type { Task, Category, User } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({ adapter, log: ['warn', 'error'] });
}

export const prisma = globalForPrisma.prisma ?? createClient();

// `tsx watch` re-imports modules on every save; without this each reload would
// open a fresh connection pool until Postgres refuses new connections.
if (!isProduction) globalForPrisma.prisma = prisma;

export async function disconnectPrisma() {
  await prisma.$disconnect();
  logger.debug('Prisma disconnected');
}
