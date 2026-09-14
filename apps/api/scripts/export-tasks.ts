import 'dotenv/config';
import { writeFile } from 'node:fs/promises';

/**
 * Dump every task to the same JSON shape the importer accepts.
 *
 *   pnpm --filter @task-manager/api export [outfile.json]
 *
 * Round-trips with `import-tasks.ts`, so this doubles as a backup you can read
 * and hand-edit — unlike a pg_dump, which is only useful to Postgres.
 * Categories are written by name, not id, so a restore works against a fresh
 * database whose category ids differ.
 */

const API_URL = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 4000}`;

type TaskDto = {
  title: string;
  notes: string | null;
  category: { name: string } | null;
  quadrant: string;
  status: string;
  dueDate: string | null;
  owner: string | null;
  tag: string | null;
};

async function main() {
  const outfile = process.argv[2] ?? `tasks-export-${new Date().toISOString().slice(0, 10)}.json`;

  // Every status, so completed history is captured too — the default listing
  // would quietly omit it.
  const params = new URLSearchParams({ pageSize: '200' });
  for (const status of ['pending', 'in_progress', 'done']) params.append('status', status);

  const collected: TaskDto[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    params.set('page', String(page));
    const response = await fetch(`${API_URL}/api/tasks?${params}`);
    if (!response.ok) throw new Error(`API returned ${response.status} ${response.statusText}`);

    const body = await response.json();
    collected.push(...(body.data as TaskDto[]));
    totalPages = body.meta?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages);

  // Undefined keys are dropped by JSON.stringify, keeping the file to the
  // fields that actually carry information.
  const tasks = collected.map((task) => ({
    title: task.title,
    notes: task.notes ?? undefined,
    category: task.category?.name ?? undefined,
    quadrant: task.quadrant,
    status: task.status,
    dueDate: task.dueDate ?? undefined,
    owner: task.owner ?? undefined,
    tag: task.tag ?? undefined,
  }));

  await writeFile(outfile, `${JSON.stringify({ tasks }, null, 2)}\n`, 'utf8');
  console.log(`Exported ${tasks.length} tasks to ${outfile}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
