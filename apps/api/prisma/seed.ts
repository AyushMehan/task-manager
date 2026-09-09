import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Seeds the ten categories from the brief and the single owner account.
 *
 * Idempotent by design — `upsert` on the unique name means re-running after a
 * migration adds what is missing without duplicating or clobbering colours the
 * user has since changed. No sample tasks: the backlog is real data.
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const CATEGORIES = [
  { name: 'Household / Home Admin', color: '#0ea5e9' },
  { name: 'Car Mart (Work)', color: '#f97316' },
  { name: 'Digital & Docs Sorting', color: '#8b5cf6' },
  { name: 'Cleaning', color: '#14b8a6' },
  { name: 'Outsource / Repairs', color: '#ef4444' },
  { name: 'Purchases — Day to Day', color: '#22c55e' },
  { name: 'Purchases — Big Ticket', color: '#eab308' },
  { name: 'Common Area', color: '#64748b' },
  { name: 'Aspirational', color: '#ec4899' },
  { name: 'Personal (Ayush)', color: '#6366f1' },
];

async function main() {
  const email = process.env.DEFAULT_USER_EMAIL ?? 'owner@example.com';
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: process.env.DEFAULT_USER_NAME ?? 'Owner' },
  });
  console.log(`Owner account ready: ${user.email}`);

  for (const [index, category] of CATEGORIES.entries()) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      // Spaced by 10 so a category can be slotted between two later without
      // renumbering the whole list.
      create: { ...category, sortOrder: (index + 1) * 10 },
    });
  }
  console.log(`Seeded ${CATEGORIES.length} categories`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
