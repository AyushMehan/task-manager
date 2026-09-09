import {
  QUADRANTS,
  TASK_STATUSES,
  type DashboardSummary,
  type ThisWeekResponse,
} from '@task-manager/shared';
import * as dashboardRepo from '../repositories/dashboard.repository.js';
import * as categoryRepo from '../repositories/category.repository.js';
import * as taskRepo from '../repositories/task.repository.js';
import { addDays, startOfToday, thisWeekRange, toDateOnly } from '../lib/dates.js';
import { toTaskDto } from '../lib/serializers.js';

/**
 * Turns a Prisma `groupBy` result into a zero-filled record over known keys.
 * `groupBy` only returns rows that exist, but the dashboard needs every
 * quadrant and status present — including the ones sitting at zero.
 */
function tally<K extends string, R extends { _count: { _all: number } }>(
  keys: readonly K[],
  rows: R[],
  keyOf: (row: R) => K | null,
): Record<K, number> {
  const counts = Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;
  for (const row of rows) {
    const key = keyOf(row);
    if (key !== null && key in counts) counts[key] = row._count._all;
  }
  return counts;
}

export async function getSummary(userId: string): Promise<DashboardSummary> {
  const { from, to } = thisWeekRange();
  const weekAgo = addDays(startOfToday(), -6);

  // Independent aggregates, so they run concurrently rather than in series.
  const [
    totalPending,
    dueThisWeek,
    overdue,
    completedThisWeek,
    quadrantRows,
    statusRows,
    categoryRows,
    categories,
  ] = await Promise.all([
    dashboardRepo.countOpen(userId),
    dashboardRepo.countDueBetween(userId, from, to),
    dashboardRepo.countOverdue(userId, from),
    dashboardRepo.countCompletedSince(userId, weekAgo),
    dashboardRepo.groupOpenByQuadrant(userId),
    dashboardRepo.groupByStatus(userId),
    dashboardRepo.groupOpenByCategory(userId),
    categoryRepo.findCategories(),
  ]);

  const nameById = new Map(categories.map((category) => [category.id, category.name]));

  return {
    totalPending,
    dueThisWeek,
    overdue,
    completedThisWeek,
    byQuadrant: tally(QUADRANTS, quadrantRows, (row) => row.quadrant),
    byStatus: tally(TASK_STATUSES, statusRows, (row) => row.status),
    byCategory: categoryRows
      .map((row) => {
        const { categoryId } = row;
        return {
          categoryId,
          name: categoryId ? (nameById.get(categoryId) ?? 'Unknown') : 'Uncategorised',
          count: row._count._all,
        };
      })
      .sort((a, b) => b.count - a.count),
  };
}

/**
 * The This Week view. The three lists are returned separately because they
 * answer different questions: what is late, what lands in the next seven days,
 * and what is urgent-and-important but carries no date at all.
 */
export async function getThisWeek(userId: string): Promise<ThisWeekResponse> {
  const { from, to } = thisWeekRange();

  const [dueSoon, overdue, urgentImportantUndated] = await Promise.all([
    taskRepo.findDueBetween(userId, from, to),
    taskRepo.findOverdue(userId, from),
    taskRepo.findUrgentImportantUndated(userId),
  ]);

  return {
    dueSoon: dueSoon.map(toTaskDto),
    overdue: overdue.map(toTaskDto),
    urgentImportantUndated: urgentImportantUndated.map(toTaskDto),
    range: { from: toDateOnly(from)!, to: toDateOnly(to)! },
  };
}
