import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

/**
 * Prisma 7 moved connection configuration out of `schema.prisma`: the schema
 * describes the model, this file describes how tooling reaches the database.
 * The runtime client gets its connection separately, via the pg adapter in
 * `src/lib/prisma.ts`.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
