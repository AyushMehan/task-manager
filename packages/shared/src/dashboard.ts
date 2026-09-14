import type { Quadrant, TaskStatus } from './enums';
import type { TaskDto } from './task';

export type DashboardSummary = {
  /** Open tasks: `pending` + `in_progress`. */
  totalPending: number;
  dueThisWeek: number;
  overdue: number;
  completedThisWeek: number;
  byQuadrant: Record<Quadrant, number>;
  byStatus: Record<TaskStatus, number>;
  byCategory: Array<{ categoryId: string | null; name: string; count: number }>;
};

/**
 * The two halves are kept apart on purpose: urgency in this backlog does not
 * always arrive with a deadline, so Urgent+Important tasks without a due date
 * deserve their own visually distinct list rather than being merged in.
 */
export type ThisWeekResponse = {
  dueSoon: TaskDto[];
  overdue: TaskDto[];
  urgentImportantUndated: TaskDto[];
  range: { from: string; to: string };
};
