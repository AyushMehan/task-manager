import type { ListTasksQuery } from '@task-manager/shared';
import { Prisma, prisma } from '../lib/prisma.js';
import { addDays, fromDateOnly, startOfToday } from '../lib/dates.js';

/**
 * The only module that talks to Prisma about tasks. Services compose these
 * calls; controllers never see a Prisma type. Swapping the ORM out would
 * touch this file and nothing above it.
 */

/** Category fields the task payload embeds, so the UI can render chips without a second request. */
const categorySelect = { select: { id: true, name: true, color: true } } as const;

const taskInclude = { category: categorySelect } satisfies Prisma.TaskInclude;

export type TaskRecord = Prisma.TaskGetPayload<{ include: typeof taskInclude }>;

/** Accepts one value or many, and normalises to a Prisma `in` filter. */
function oneOrMany<T>(value: T | T[] | undefined): T | { in: T[] } | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? { in: value } : value;
}

export function buildTaskWhere(userId: string, query: Partial<ListTasksQuery>): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = { userId };

  const status = oneOrMany(query.status);
  if (status !== undefined) where.status = status as Prisma.TaskWhereInput['status'];

  const quadrant = oneOrMany(query.quadrant);
  if (quadrant !== undefined) where.quadrant = quadrant as Prisma.TaskWhereInput['quadrant'];

  const categoryId = oneOrMany(query.categoryId);
  if (categoryId !== undefined) where.categoryId = categoryId as Prisma.TaskWhereInput['categoryId'];

  if (query.owner) where.owner = { equals: query.owner, mode: 'insensitive' };
  if (query.tag) where.tag = { equals: query.tag, mode: 'insensitive' };

  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { notes: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  // `undated` and the date range are mutually exclusive by nature; asking for
  // both would mean "no due date, but due before X", which matches nothing.
  if (query.undated) {
    where.dueDate = null;
  } else if (query.dueBefore || query.dueAfter) {
    where.dueDate = {
      ...(query.dueAfter ? { gte: fromDateOnly(query.dueAfter) } : {}),
      ...(query.dueBefore ? { lte: fromDateOnly(query.dueBefore) } : {}),
    };
  }

  // Overdue means past due and still open — a task finished late is not overdue.
  if (query.overdue) {
    where.dueDate = { lt: startOfToday() };
    where.status = { not: 'done' };
  }

  return where;
}

function buildOrderBy(
  sort: ListTasksQuery['sort'],
  order: ListTasksQuery['order'],
): Prisma.TaskOrderByWithRelationInput[] {
  // Undated tasks sort last regardless of direction: an empty due date means
  // "no deadline", not "due at the beginning of time".
  const primary: Prisma.TaskOrderByWithRelationInput =
    sort === 'dueDate' ? { dueDate: { sort: order, nulls: 'last' } } : { [sort]: order };

  // `id` breaks ties so pagination stays stable across pages.
  return [primary, { id: 'asc' }];
}

export async function findTasks(userId: string, query: ListTasksQuery) {
  const where = buildTaskWhere(userId, query);
  const skip = (query.page - 1) * query.pageSize;

  const [items, total] = await prisma.$transaction([
    prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: buildOrderBy(query.sort, query.order),
      skip,
      take: query.pageSize,
    }),
    prisma.task.count({ where }),
  ]);

  return { items, total };
}

export function findTaskById(userId: string, id: string) {
  return prisma.task.findFirst({ where: { id, userId }, include: taskInclude });
}

export function createTask(data: Prisma.TaskUncheckedCreateInput) {
  return prisma.task.create({ data, include: taskInclude });
}

export function updateTask(id: string, data: Prisma.TaskUncheckedUpdateInput) {
  return prisma.task.update({ where: { id }, data, include: taskInclude });
}

export function deleteTask(id: string) {
  return prisma.task.delete({ where: { id } });
}

/** Returns the ids that actually belong to the user — guards bulk operations. */
export async function findOwnedTaskIds(userId: string, ids: string[]) {
  const rows = await prisma.task.findMany({
    where: { id: { in: ids }, userId },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

export function updateManyTasks(ids: string[], data: Prisma.TaskUncheckedUpdateManyInput) {
  return prisma.task.updateMany({ where: { id: { in: ids } }, data });
}

export function findTasksByIds(userId: string, ids: string[]) {
  return prisma.task.findMany({
    where: { id: { in: ids }, userId },
    include: taskInclude,
    orderBy: { updatedAt: 'desc' },
  });
}

/** Tasks due within the window, soonest first. */
export function findDueBetween(userId: string, from: Date, to: Date) {
  return prisma.task.findMany({
    where: { userId, status: { not: 'done' }, dueDate: { gte: from, lte: to } },
    include: taskInclude,
    orderBy: [{ dueDate: 'asc' }, { quadrant: 'asc' }],
  });
}

export function findOverdue(userId: string, before: Date) {
  return prisma.task.findMany({
    where: { userId, status: { not: 'done' }, dueDate: { lt: before } },
    include: taskInclude,
    orderBy: [{ dueDate: 'asc' }],
  });
}

/**
 * Urgent+Important tasks carrying no deadline. These are surfaced beside the
 * dated ones because in this backlog urgency frequently arrives without a date.
 */
export function findUrgentImportantUndated(userId: string) {
  return prisma.task.findMany({
    where: { userId, status: { not: 'done' }, quadrant: 'urgent_important', dueDate: null },
    include: taskInclude,
    orderBy: [{ createdAt: 'desc' }],
  });
}
