import type { Express } from 'express';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

export const app: Express = createApp();

/** The owner row the `currentUser` middleware upserts on the first request. */
export async function seedUser(email = 'test@example.com') {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: 'Test Owner' },
  });
}

export async function seedCategory(name = 'Household / Home Admin', color = '#0ea5e9') {
  return prisma.category.create({ data: { name, color, sortOrder: 10 } });
}

/** `YYYY-MM-DD` offset from today, for building due dates relative to now. */
export function dayOffset(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
