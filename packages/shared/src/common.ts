import { z } from 'zod';

/** `YYYY-MM-DD` — the wire format for date-only fields such as `dueDate`. */
export const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a YYYY-MM-DD date')
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), 'Not a real calendar date');

/**
 * Optional free text that is stored as NULL when blank.
 *
 * Entry speed matters more than a rich form here, so a field the user tabbed
 * through and left empty should not become an empty string in the database.
 */
export const optionalText = (max: number) =>
  z
    .string()
    .max(max)
    .transform((value) => value.trim())
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional();

/**
 * A query-string boolean. `z.coerce.boolean()` is not usable here: it applies
 * JavaScript truthiness, so the string "false" would coerce to `true`.
 */
export const booleanFlag = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

/** Shape every successful response is wrapped in. */
export type ApiResponse<T> = {
  data: T;
  meta?: Record<string, unknown>;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
