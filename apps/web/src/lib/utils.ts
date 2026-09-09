import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Today as `YYYY-MM-DD`, matching how the API sends due dates. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function dayOffset(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Turns a due date into something readable at a glance — "Today", "Tomorrow",
 * "3d overdue" — because scanning a column of ISO dates is slow.
 */
export function formatDueDate(dueDate: string | null): {
  label: string;
  tone: 'overdue' | 'today' | 'soon' | 'later' | 'none';
} {
  if (!dueDate) return { label: '', tone: 'none' };

  const due = new Date(`${dueDate}T00:00:00.000Z`).getTime();
  const now = new Date(`${today()}T00:00:00.000Z`).getTime();
  const days = Math.round((due - now) / 86_400_000);

  if (days < 0) return { label: `${Math.abs(days)}d overdue`, tone: 'overdue' };
  if (days === 0) return { label: 'Today', tone: 'today' };
  if (days === 1) return { label: 'Tomorrow', tone: 'soon' };
  if (days <= 6) return { label: `In ${days}d`, tone: 'soon' };

  const formatted = new Date(`${dueDate}T00:00:00.000Z`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  return { label: formatted, tone: 'later' };
}
