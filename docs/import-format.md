# Bulk import format

Paste the prompt below into the other chat along with your raw task list. Save
what comes back as a `.json` file, then import it:

```bash
pnpm --filter @task-manager/api import path/to/tasks.json --dry-run   # preview
pnpm --filter @task-manager/api import path/to/tasks.json             # for real
```

The API must be running (`pnpm dev:api`). Add `--create-categories` only if you
deliberately want new categories beyond the ten seeded ones.

---

## Prompt for the other chat

> Convert the task list below into JSON for import into my task manager.
>
> Output **only** the JSON — no commentary, no explanation before or after.
>
> Shape:
>
> ```json
> {
>   "tasks": [
>     {
>       "title": "Renew car insurance",
>       "notes": "Policy expires end of month",
>       "category": "Car Mart (Work)",
>       "quadrant": "urgent_important",
>       "status": "pending",
>       "dueDate": "2026-09-12",
>       "owner": "self",
>       "tag": "finance"
>     }
>   ]
> }
> ```
>
> Rules:
>
> - `title` is the only required field. Omit any field you have no basis for —
>   do not invent due dates, owners, or tags.
> - `category` must be **exactly** one of these ten strings, copied verbatim
>   (note the em-dashes in the two "Purchases" ones):
>   - `Household / Home Admin` — day-to-day chores, purchases, recurring admin
>   - `Car Mart (Work)` — the family business: contacts, financials, digital presence, setup
>   - `Digital & Docs Sorting` — cloud storage, passwords, photo/drive organisation, account cleanup
>   - `Cleaning` — physical decluttering and cleaning
>   - `Outsource / Repairs` — anything needing a technician or contractor
>   - `Purchases — Day to Day` — small, cheap, recurring buys
>   - `Purchases — Big Ticket` — larger considered purchases
>   - `Common Area` — building/society-level maintenance
>   - `Aspirational` — nice-to-have, no urgency
>   - `Personal (Ayush)` — individual admin and errands
>
>   If a task fits none of them, omit `category` rather than inventing one.
> - `quadrant` must be one of `urgent_important`, `urgent_only`,
>   `important_only`, `neither` (Eisenhower matrix: do now / delegate /
>   schedule / backlog). Default to `neither` when genuinely unsure.
> - `status` must be one of `pending`, `in_progress`, `done`. Omit it unless the
>   list says otherwise — it defaults to `pending`.
> - `dueDate` must be `YYYY-MM-DD`. Today is 2026-09-09; resolve relative dates
>   ("next Friday", "end of month") against that. Omit it if the task has no
>   real deadline — most will not.
> - `owner` is free text for who is responsible: `self`, a family member's name,
>   or `outsource`. Omit if unstated.
> - `tag` is a short free-text label for finer grouping within a category
>   (e.g. `finance`, `insurance`, `website`). Optional.
> - Keep one task per entry. If a line contains several distinct actions, split
>   it into separate tasks.
>
> Task list:
>
> [paste your raw list here]

---

## Notes on the importer

- Category names are matched **case-insensitively**, and `quadrant`/`status`
  are lower-cased for you, so `"NEITHER"` and `"Pending"` both work.
- Unknown category names abort the import **before anything is written**, and
  print the list of valid names.
- Malformed entries (blank title, bad date format, unknown quadrant) are
  reported by index with the reason, and nothing is imported.
- Whitespace-only `notes`/`owner`/`tag` are stored as null, not empty strings.
- Every row goes through `POST /api/tasks`, so it gets the same validation and
  defaults as a task typed into the UI.
- The importer is **not** idempotent — running it twice creates duplicates.
