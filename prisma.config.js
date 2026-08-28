// Prisma 7 moved the connection URL out of schema.prisma and into this file.
// The schema now declares only the provider; the CLI (migrate, studio, db push)
// reads its connection from here, and the runtime client gets its own adapter
// in src/lib/db.js.
//
// `.env` is loaded explicitly: the Prisma CLI runs outside Next.js, so it does
// not inherit Next's automatic env loading.
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

loadEnv();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.mjs',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
