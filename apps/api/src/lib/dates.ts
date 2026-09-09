/**
 * Date helpers.
 *
 * `dueDate` is a calendar date, not an instant — "due the 4th" means the 4th
 * wherever the user is, so it is stored in a Postgres DATE column and moved
 * over the wire as `YYYY-MM-DD`. Everything here works in UTC to keep that
 * round-trip lossless; converting to a local timezone would shift dates by a
 * day at the edges.
 */

/** `YYYY-MM-DD` for a DATE column value, or null. */
export function toDateOnly(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

/** Parses `YYYY-MM-DD` into the UTC midnight instant Postgres stores. */
export function fromDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** Today as UTC midnight. */
export function startOfToday(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/**
 * The "next 7 days" window used by the This Week view and the summary cards:
 * today through today+6 inclusive, so it always covers a full week without
 * depending on which weekday it happens to be.
 */
export function thisWeekRange(now: Date = new Date()): { from: Date; to: Date } {
  const from = startOfToday(now);
  return { from, to: addDays(from, 6) };
}
