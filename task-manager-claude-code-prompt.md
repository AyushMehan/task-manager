# Claude Code Prompt — Personal Task Manager Dashboard

Copy everything below into Claude Code to kick off the build.

---

## Project Overview

Build a personal task manager web app for tracking a large, mixed backlog of
personal, household, family-business, and admin tasks. Priority is a clean
**dashboard view** that answers two questions at a glance: "What's pending?"
and "What should I look at this week?"

Phase 1: web app. Phase 2 (later, not now): a mobile app reusing the same
backend — so the backend must be usable by a separate mobile client later,
not tightly coupled to the web frontend.

This project will also go on a portfolio for backend/SDE job applications,
so the backend should be hand-written and demonstrable — not a generated
BaaS layer. Favor clear, idiomatic backend code (proper route structure,
validation, error handling, a real service/repository layer) over the
fastest path to a working demo.

## Tech Stack

- **Frontend:** Next.js (App Router) + React + TypeScript + Tailwind CSS
- **Backend:** a self-written REST API in Node.js + TypeScript (Express or
  NestJS) — not a BaaS like Supabase/Firebase. This is the part meant to be
  discussed in interviews, so keep the API layer, validation, and data
  access code clean and separated from the frontend.
- **Database/ORM:** Postgres + Prisma. Prisma migrations should be checked
  into the repo so the schema history is visible.
- **Deployment target:** Vercel (or similar) for the Next.js frontend;
  Render/Railway/Fly.io for the API; managed Postgres (Neon, Railway, or
  Supabase's database-only tier) for the database.

## Data Model

**`tasks` table:**
| Field | Type | Notes |
|---|---|---|
| id | uuid | primary key |
| title | text | required |
| notes | text | optional, free text |
| category | enum/text | see Categories below |
| quadrant | enum | `urgent_important`, `urgent_only`, `important_only`, `neither` |
| status | enum | `pending`, `in_progress`, `done` |
| due_date | date, nullable | optional — many tasks won't have one |
| owner | text, nullable | who it's delegated to / responsible (e.g. self, a family member, "outsource") |
| created_at | timestamp | auto |
| updated_at | timestamp | auto |
| completed_at | timestamp, nullable | set when marked done |

**`categories` table** (or a fixed enum to start): seeded with the categories
below, but editable later — don't hardcode them in the UI in a way that
requires a code change to add one.

## Classification: Eisenhower Matrix

Every task gets assigned one of four quadrants — this is the standard
**Eisenhower Matrix**:
1. **Urgent & Important** — do now
2. **Urgent, not Important** — delegate / quick turnaround
3. **Important, not Urgent** — schedule / plan for
4. **Neither** — backlog / someday

The dashboard should be able to show a **2x2 matrix view** of this
classification as one of the view modes, not just a filter dropdown.

## Categories

Seed with these categories, derived from how the task backlog is naturally
grouped (don't include the actual task list — just the category names):
- **Household / Home Admin** — day-to-day chores, purchases, recurring admin
- **Car Mart (Work)** — the family business: contacts, financials, digital
  presence, setup tasks
- **Digital & Docs Sorting** — cloud storage, passwords, photo/drive
  organization, account cleanup
- **Cleaning** — physical decluttering/cleaning tasks
- **Outsource / Repairs** — anything needing a technician or contractor
- **Purchases — Day to Day** — small/cheap recurring buys
- **Purchases — Big Ticket** — larger considered purchases
- **Common Area** — building/society-level maintenance
- **Aspirational** — nice-to-have, no urgency
- **Personal (Ayush)** — individual admin/errands

Allow a task to optionally carry a free-text **tag** in addition to its
category, for finer grouping without needing a new top-level category each
time.

## Dashboard / UI Requirements

**Home dashboard:**
- Summary cards at the top: total pending, due this week, overdue, by
  quadrant counts (e.g. "5 Urgent+Important")
- Default view: all pending tasks, sortable/filterable
- A **"This Week" view**: tasks with a due date in the next 7 days, plus
  (separately, visually distinct) tasks in the Urgent+Important quadrant
  even if they lack a due date, since urgency doesn't always come with a
  deadline in this list

**View modes (toggle, not separate pages):**
1. **List view** — flat list, filterable by category, quadrant, status, owner
2. **Matrix view** — classic 2x2 Eisenhower grid, tasks as cards in their
   quadrant, drag-and-drop to reclassify if feasible
3. **Category view** — grouped/collapsible sections by category

**Task interactions:**
- Add task (title required, everything else optional at creation)
- Quick-edit category/quadrant/status inline without a full form
- Mark complete (moves out of pending views, keeps history)
- Bulk actions: multi-select to reassign category/quadrant or mark done

**Non-functional:**
- Responsive layout — should work reasonably on mobile browser even before
  a dedicated mobile app exists
- Fast to add a task (low friction — this is a brain-dump backlog, entry
  speed matters more than a rich form)
- No auth needed for a single user to start (a single hardcoded/env-based
  user is fine), but design the Prisma schema and API routes so adding real
  auth (JWT-based) and a second user (family member) later is additive, not
  a rewrite

## Explicitly Out of Scope for Now

- Mobile app itself (just don't architect against it)
- Notifications/reminders
- Recurring tasks
- Multi-user permissions/sharing UI

## Deliverable

Set up the Next.js frontend, the Node/TypeScript API with Prisma + Postgres,
and the dashboard with List and Matrix views working end-to-end for CRUD on
tasks (via the API, not direct DB calls from the frontend), seeded with the
categories above (no sample tasks needed).
