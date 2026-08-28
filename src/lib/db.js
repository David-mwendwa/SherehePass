import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * The Prisma client, as a module-level singleton.
 *
 * In development Next.js hot-reloads modules on every edit, and a fresh
 * PrismaClient per reload opens a fresh connection pool that the old module
 * never closes. Postgres runs out of connections within a few dozen saves. The
 * client is therefore parked on `globalThis`, which survives module reload,
 * and only really constructed once. In production modules are loaded once
 * anyway, so the global is skipped and nothing leaks into the shared object.
 *
 * Prisma 7 connects through a driver adapter rather than reading a URL out of
 * the schema, so the connection string is read here — see prisma.config.js for
 * the CLI's half of the same arrangement.
 */
function createClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env and point it at a Postgres instance.'
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    log:
      process.env.NODE_ENV === 'development'
        ? ['warn', 'error']
        : ['error'],
  });
}

const globalForPrisma = globalThis;

export const db = globalForPrisma.__sherehePrisma ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__sherehePrisma = db;
}
