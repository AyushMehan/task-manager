import { prisma } from '../lib/prisma.js';
import { OPEN_STATUSES } from '@task-manager/shared';

/**
 * Aggregate reads backing the summary cards. These are grouped counts rather
 * than "fetch everything and count in JS" so the dashboard stays cheap as the
 * backlog grows.
 */

const openStatuses = [...OPEN_STATUSES];

export function countOpen(userId: string) {
  return prisma.task.count({ where: { userId, status: { in: openStatuses } } });
}

export function countDueBetween(userId: string, from: Date, to: Date) {
  return prisma.task.count({
    where: { userId, status: { in: openStatuses }, dueDate: { gte: from, lte: to } },
  });
}

export function countOverdue(userId: string, before: Date) {
  return prisma.task.count({
    where: { userId, status: { in: openStatuses }, dueDate: { lt: before } },
  });
}

export function countCompletedSince(userId: string, since: Date) {
  return prisma.task.count({
    where: { userId, status: 'done', completedAt: { gte: since } },
  });
}

/** Open tasks per quadrant — the counts shown on the matrix headers. */
export function groupOpenByQuadrant(userId: string) {
  return prisma.task.groupBy({
    by: ['quadrant'],
    where: { userId, status: { in: openStatuses } },
    _count: { _all: true },
  });
}

export function groupByStatus(userId: string) {
  return prisma.task.groupBy({
    by: ['status'],
    where: { userId },
    _count: { _all: true },
  });
}

export function groupOpenByCategory(userId: string) {
  return prisma.task.groupBy({
    by: ['categoryId'],
    where: { userId, status: { in: openStatuses } },
    _count: { _all: true },
  });
}
