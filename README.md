# Task Manager

Personal task dashboard — answers "what's pending?" and "what needs me this week?"
Tasks are classified on the Eisenhower matrix and grouped by category.

Runs locally: Next.js frontend, Express API, Postgres in Docker.

## First-time setup

Requires Node 20+, pnpm, and Docker Desktop running.

```bash
pnpm install
pnpm db:up                                        # Postgres on localhost:5433
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm --filter @task-manager/api prisma:deploy     # apply migrations
pnpm --filter @task-manager/api seed              # 10 categories + owner account
```

## Running it

Open **<http://task-manager>** (or <http://localhost>) — always available.
A small always-on gateway serves that URL; if Docker is off it offers a button
to start it, and the app is up about 20 seconds later. Docker itself does not
run at login, to keep the RAM back. See [docs/running.md](docs/running.md).

### By hand

```bash
pnpm db:up    # if Docker was restarted
pnpm dev      # starts both API (:4000) and web (:3000)
```

Open <http://localhost:3000>.

To run them separately: `pnpm dev:api` and `pnpm dev:web`.

## Layout

```
apps/api        Express + Prisma REST API
  prisma/       schema, migrations (checked in), seed
  src/routes/   HTTP wiring
  src/controllers/  request → service → response
  src/services/     business rules (completedAt, week window)
  src/repositories/ the only place Prisma is called
apps/web        Next.js App Router dashboard
  src/lib/api.ts    the only place the frontend calls the API
  src/hooks/        react-query data hooks
  src/components/   views and controls
packages/shared Zod schemas + enums used by both sides
```

## Views

- **List** — flat, filterable by status, quadrant, category, owner, and free-text search. Inline edits, multi-select, bulk actions.
- **Matrix** — Eisenhower 2x2; drag a card between quadrants to reclassify.
- **Category** — collapsible sections per category.
- **This Week** — overdue, due in the next 7 days, and Urgent+Important tasks with *no* due date, kept as three separate lists.

Default view shows open tasks (`pending` + `in_progress`); completed tasks stay in
the database and appear when you filter by status Done.

## API

All endpoints are under `/api`, wrapped in `{ data, meta? }`; errors come back as
`{ error: { code, message, details? } }`.

```
GET    /api/tasks              ?status&quadrant&categoryId&owner&tag&search
                               &dueBefore&dueAfter&undated&overdue
                               &sort&order&page&pageSize
POST   /api/tasks              only `title` is required
GET    /api/tasks/:id
PATCH  /api/tasks/:id          partial; explicit null clears a field
DELETE /api/tasks/:id
PATCH  /api/tasks/bulk         { ids, patch }
GET    /api/categories         ?withCounts=true
POST   /api/categories
PATCH  /api/categories/:id
DELETE /api/categories/:id     tasks survive as uncategorised
GET    /api/dashboard/summary
GET    /api/dashboard/this-week
GET    /health
```

## Bulk import

Feed a JSON file of tasks straight in (categories given by name, not id):

```bash
pnpm --filter @task-manager/api import tasks.json --dry-run   # preview
pnpm --filter @task-manager/api import tasks.json             # write
```

See [docs/import-format.md](docs/import-format.md) for the exact shape and a
prompt for generating it. Not idempotent — running twice creates duplicates.

## Tests

```bash
pnpm test     # 42 supertest tests against a real Postgres
```

The suite uses a separate `taskmanager_test` database. Create it once with:

```bash
docker exec task-manager-db psql -U taskmanager -d taskmanager -c "CREATE DATABASE taskmanager_test;"
cd apps/api && DATABASE_URL="postgresql://taskmanager:taskmanager@localhost:5433/taskmanager_test?schema=public" pnpm prisma:deploy
```

## Notes

- **Single user, no auth.** The owner comes from `DEFAULT_USER_EMAIL` in
  `apps/api/.env`. Tasks already carry a `userId`, so adding JWT auth later means
  replacing `src/middleware/current-user.ts` — no schema or query changes.
- **Prisma 7** keeps the connection URL in `apps/api/prisma.config.ts`, not in
  `schema.prisma`, and connects through the `@prisma/adapter-pg` driver adapter.
- Pin note: `prisma`'s npm `latest` tag currently points at an `8.0.0-rc`, so both
  `prisma` and `@prisma/client` are pinned to `7.10.0`.
- Due dates are calendar dates (Postgres `DATE`, `YYYY-MM-DD` on the wire), handled
  in UTC end to end so they never shift by a day.
