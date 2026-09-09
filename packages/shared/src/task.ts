import { z } from 'zod';
import { booleanFlag, dateOnly, optionalText } from './common';
import { QUADRANTS, TASK_STATUSES, type Quadrant, type TaskStatus } from './enums';

export const quadrantSchema = z.enum(QUADRANTS);
export const taskStatusSchema = z.enum(TASK_STATUSES);

/**
 * Only `title` is required — this is a brain-dump backlog, so a task can be
 * captured first and classified later.
 */
export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(500),
  notes: optionalText(5000),
  categoryId: z.uuid().nullable().optional(),
  quadrant: quadrantSchema.default('neither'),
  status: taskStatusSchema.default('pending'),
  dueDate: dateOnly.nullable().optional(),
  owner: optionalText(120),
  tag: optionalText(60),
});

/**
 * Every field is optional so the UI can PATCH a single cell from an inline
 * edit. Explicit `null` clears a field; an absent key leaves it untouched.
 */
export const updateTaskSchema = createTaskSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'At least one field must be provided' },
);

/** The subset of fields a multi-select bulk action may rewrite. */
export const bulkTaskPatchSchema = z
  .object({
    categoryId: z.uuid().nullable(),
    quadrant: quadrantSchema,
    status: taskStatusSchema,
    owner: optionalText(120),
    tag: optionalText(60),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export const bulkUpdateTasksSchema = z.object({
  ids: z.array(z.uuid()).min(1, 'Select at least one task').max(200),
  patch: bulkTaskPatchSchema,
});

export const TASK_SORT_FIELDS = ['createdAt', 'updatedAt', 'dueDate', 'title', 'quadrant'] as const;
export type TaskSortField = (typeof TASK_SORT_FIELDS)[number];

/**
 * List filters. Everything arrives as a query string, hence the coercion;
 * `status` and `category` accept repeats (`?status=pending&status=in_progress`).
 */
export const listTasksQuerySchema = z.object({
  status: z.union([taskStatusSchema, z.array(taskStatusSchema)]).optional(),
  quadrant: z.union([quadrantSchema, z.array(quadrantSchema)]).optional(),
  categoryId: z.union([z.uuid(), z.array(z.uuid())]).optional(),
  owner: z.string().trim().max(120).optional(),
  tag: z.string().trim().max(60).optional(),
  search: z.string().trim().max(200).optional(),
  dueBefore: dateOnly.optional(),
  dueAfter: dateOnly.optional(),
  /** `true` keeps only tasks that have no due date at all. */
  undated: booleanFlag.optional(),
  overdue: booleanFlag.optional(),
  sort: z.enum(TASK_SORT_FIELDS).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export type CreateTaskInput = z.input<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type BulkUpdateTasksInput = z.infer<typeof bulkUpdateTasksSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;

export type TaskDto = {
  id: string;
  title: string;
  notes: string | null;
  categoryId: string | null;
  category: { id: string; name: string; color: string | null } | null;
  quadrant: Quadrant;
  status: TaskStatus;
  /** `YYYY-MM-DD`, or null when the task has no deadline. */
  dueDate: string | null;
  owner: string | null;
  tag: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};
