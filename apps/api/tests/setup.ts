import { config } from 'dotenv';
import { beforeAll, afterAll, beforeEach } from 'vitest';

// Loaded before anything imports `config/env.ts`, so the suite points at the
// test database and can never touch development data.
config({ path: '.env.test', override: true });

const { prisma } = await import('../src/lib/prisma.js');

beforeAll(async () => {
  await prisma.$connect();
});

beforeEach(async () => {
  // Truncate rather than delete: resets the tables fast and keeps every test
  // starting from an identical, empty database.
  //
  // `users` is deliberately left alone. The owner account is a fixture, not
  // test data, and the `currentUser` middleware caches its id for the life of
  // the process — dropping the row would leave that cache pointing at a user
  // that no longer exists, and every insert would fail on the foreign key.
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "tasks", "categories" CASCADE');
});

afterAll(async () => {
  await prisma.$disconnect();
});
