import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { z } from 'zod';

/**
 * Bulk-import tasks from a JSON file.
 *
 *   pnpm --filter @task-manager/api import <file.json> [--dry-run] [--replace] [--create-categories]
 *
 * Posts through the REST API rather than writing to the database directly, so
 * every row goes through the same validation, defaults, and `completedAt`
 * rules as a task typed into the UI.
 *
 * Categories are given by NAME (matched case-insensitively) because whatever
 * produced the JSON has no idea what the UUIDs are.
 */

const API_URL = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 4000}`;

const QUADRANTS = ['urgent_important', 'urgent_only', 'important_only', 'neither'] as const;
const STATUSES = ['pending', 'in_progress', 'done'] as const;

/**
 * Deliberately forgiving about shape — the point is to accept what an LLM
 * plausibly emits and normalise it, not to bounce the whole file over a
 * trailing space or a capitalised enum.
 */
const importTaskSchema = z.object({
  title: z.string().trim().min(1).max(500),
  notes: z.string().trim().max(5000).optional().nullable(),
  category: z.string().trim().optional().nullable(),
  quadrant: z
    .string()
    .trim()
    .toLowerCase()
    .refine((value): value is (typeof QUADRANTS)[number] => QUADRANTS.includes(value as never), {
      message: `quadrant must be one of: ${QUADRANTS.join(', ')}`,
    })
    .optional(),
  status: z
    .string()
    .trim()
    .toLowerCase()
    .refine((value): value is (typeof STATUSES)[number] => STATUSES.includes(value as never), {
      message: `status must be one of: ${STATUSES.join(', ')}`,
    })
    .optional(),
  dueDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'dueDate must be YYYY-MM-DD')
    .optional()
    .nullable(),
  owner: z.string().trim().max(120).optional().nullable(),
  tag: z.string().trim().max(60).optional().nullable(),
});

// Accepts either a bare array or an object with a `tasks` key.
const fileSchema = z.union([
  z.array(importTaskSchema),
  z.object({ tasks: z.array(importTaskSchema) }).transform((value) => value.tasks),
]);

type ImportTask = z.infer<typeof importTaskSchema>;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body?.error?.details ? ` ${JSON.stringify(body.error.details)}` : '';
    throw new Error(`${body?.error?.message ?? response.statusText}${detail}`);
  }
  // DELETE replies 204 with no body at all — there is no envelope to unwrap.
  return (body?.data ?? undefined) as T;
}

type Category = { id: string; name: string };

function normalise(name: string) {
  return name.trim().toLowerCase();
}

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((arg) => !arg.startsWith('--'));
  const dryRun = args.includes('--dry-run');
  const createCategories = args.includes('--create-categories');
  const replace = args.includes('--replace');

  if (!file) {
    console.error('Usage: import-tasks <file.json> [--dry-run] [--replace] [--create-categories]');
    process.exitCode = 1;
    return;
  }

  const raw = JSON.parse(await readFile(file, 'utf8'));
  const parsed = fileSchema.safeParse(raw);

  if (!parsed.success) {
    console.error('The file does not match the expected shape:\n');
    for (const issue of parsed.error.issues.slice(0, 25)) {
      console.error(`  tasks[${issue.path.join('.')}]: ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }

  const tasks: ImportTask[] = parsed.data;
  console.log(`Read ${tasks.length} tasks from ${file}\n`);

  /**
   * `--replace` re-imports from scratch: the file becomes the source of truth.
   * Deliberately deferred until after the file has parsed, so a malformed
   * import can never leave you with an empty database.
   */
  if (replace) {
    const existing = await api<Array<{ id: string }>>('/api/tasks?pageSize=200&status=pending&status=in_progress&status=done');

    if (dryRun) {
      console.log(`[dry-run] would delete ${existing.length} existing tasks first\n`);
    } else if (existing.length > 0) {
      for (const task of existing) {
        await api(`/api/tasks/${task.id}`, { method: 'DELETE' });
      }
      console.log(`Deleted ${existing.length} existing tasks\n`);
    }
  }

  // Resolve category names up front so an unknown one is reported before any
  // task is written, rather than half-way through the import.
  const categories = await api<Category[]>('/api/categories');
  const byName = new Map(categories.map((category) => [normalise(category.name), category.id]));

  const requested = [...new Set(tasks.map((task) => task.category).filter(Boolean) as string[])];
  const unknown = requested.filter((name) => !byName.has(normalise(name)));

  if (unknown.length > 0) {
    if (!createCategories) {
      console.error('Unknown categories (pass --create-categories to add them):');
      for (const name of unknown) console.error(`  - ${name}`);
      console.error('\nKnown categories:');
      for (const category of categories) console.error(`  - ${category.name}`);
      process.exitCode = 1;
      return;
    }

    for (const name of unknown) {
      if (dryRun) {
        console.log(`[dry-run] would create category "${name}"`);
        byName.set(normalise(name), '(dry-run)');
        continue;
      }
      const created = await api<Category>('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      byName.set(normalise(created.name), created.id);
      console.log(`Created category "${created.name}"`);
    }
    console.log('');
  }

  let imported = 0;
  const failures: Array<{ title: string; reason: string }> = [];

  for (const task of tasks) {
    const payload = {
      title: task.title,
      ...(task.notes ? { notes: task.notes } : {}),
      ...(task.category ? { categoryId: byName.get(normalise(task.category)) } : {}),
      ...(task.quadrant ? { quadrant: task.quadrant } : {}),
      ...(task.status ? { status: task.status } : {}),
      ...(task.dueDate ? { dueDate: task.dueDate } : {}),
      ...(task.owner ? { owner: task.owner } : {}),
      ...(task.tag ? { tag: task.tag } : {}),
    };

    if (dryRun) {
      console.log(`[dry-run] ${task.title}  (${task.quadrant ?? 'neither'}, ${task.category ?? 'no category'})`);
      imported += 1;
      continue;
    }

    try {
      await api('/api/tasks', { method: 'POST', body: JSON.stringify(payload) });
      imported += 1;
    } catch (error) {
      failures.push({ title: task.title, reason: error instanceof Error ? error.message : String(error) });
    }
  }

  console.log(`\n${dryRun ? '[dry-run] would import' : 'Imported'} ${imported}/${tasks.length} tasks`);

  if (failures.length > 0) {
    console.log(`\n${failures.length} failed:`);
    for (const failure of failures) console.log(`  - ${failure.title}: ${failure.reason}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
