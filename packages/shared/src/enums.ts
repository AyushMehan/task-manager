/**
 * Domain enums shared by the API and every client.
 *
 * These mirror the Prisma enums one-for-one. They live here (rather than being
 * imported from `@prisma/client`) so that a client — the web app today, a
 * mobile app later — can depend on the vocabulary without depending on the ORM.
 */

export const QUADRANTS = [
  'urgent_important',
  'urgent_only',
  'important_only',
  'neither',
] as const;

export type Quadrant = (typeof QUADRANTS)[number];

export const QUADRANT_LABELS: Record<Quadrant, string> = {
  urgent_important: 'Urgent & Important',
  urgent_only: 'Urgent, not Important',
  important_only: 'Important, not Urgent',
  neither: 'Neither',
};

/** The action each quadrant implies, per the Eisenhower matrix. */
export const QUADRANT_ACTIONS: Record<Quadrant, string> = {
  urgent_important: 'Do now',
  urgent_only: 'Delegate',
  important_only: 'Schedule',
  neither: 'Backlog',
};

export const TASK_STATUSES = ['pending', 'in_progress', 'done'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  done: 'Done',
};

/** Statuses that count as "still on the plate" for pending-oriented views. */
export const OPEN_STATUSES: readonly TaskStatus[] = ['pending', 'in_progress'];
