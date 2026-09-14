import type {
  BulkUpdateTasksInput,
  CreateTaskInput,
  ListTasksQuery,
  TaskDto,
  UpdateTaskInput,
} from '@task-manager/shared';
import { createTaskSchema } from '@task-manager/shared';
import * as categoryRepo from '../repositories/category.repository.js';
import * as taskRepo from '../repositories/task.repository.js';
import { BadRequestError, NotFoundError } from '../lib/errors.js';
import { fromDateOnly } from '../lib/dates.js';
import { toTaskDto } from '../lib/serializers.js';
import type { Prisma } from '../lib/prisma.js';

/**
 * Task business rules. Controllers handle HTTP, repositories handle SQL; the
 * decisions live here — notably the `completedAt` bookkeeping, which must hold
 * no matter which endpoint moved the status.
 */

async function assertCategoryExists(categoryId: string | null | undefined) {
  if (!categoryId) return;
  const category = await categoryRepo.findCategoryById(categoryId);
  if (!category) throw new BadRequestError(`Category '${categoryId}' does not exist`);
}

/**
 * `completedAt` is derived from `status`, never set by the client: marking a
 * task done stamps it, reopening a done task clears it. Keeping this in one
 * place is what stops the completion history from drifting.
 */
function completionPatch(
  nextStatus: string | undefined,
  previousStatus: string | undefined,
): { completedAt?: Date | null } {
  if (!nextStatus || nextStatus === previousStatus) return {};
  if (nextStatus === 'done') return { completedAt: new Date() };
  return previousStatus === 'done' ? { completedAt: null } : {};
}

export async function listTasks(userId: string, query: ListTasksQuery) {
  const { items, total } = await taskRepo.findTasks(userId, query);

  return {
    data: items.map(toTaskDto),
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  };
}

export async function getTask(userId: string, id: string): Promise<TaskDto> {
  const task = await taskRepo.findTaskById(userId, id);
  if (!task) throw new NotFoundError('Task', id);
  return toTaskDto(task);
}

export async function createTask(userId: string, input: CreateTaskInput): Promise<TaskDto> {
  // Re-parsed rather than trusted: this applies the `quadrant`/`status`
  // defaults for callers that reach the service directly (seeds, tests, a
  // future job) instead of coming through the validation middleware.
  const data = createTaskSchema.parse(input);

  await assertCategoryExists(data.categoryId);

  const created = await taskRepo.createTask({
    userId,
    title: data.title,
    notes: data.notes ?? null,
    categoryId: data.categoryId ?? null,
    quadrant: data.quadrant,
    status: data.status,
    dueDate: data.dueDate ? fromDateOnly(data.dueDate) : null,
    owner: data.owner ?? null,
    tag: data.tag ?? null,
    ...completionPatch(data.status, undefined),
  });

  return toTaskDto(created);
}

export async function updateTask(
  userId: string,
  id: string,
  input: UpdateTaskInput,
): Promise<TaskDto> {
  const existing = await taskRepo.findTaskById(userId, id);
  if (!existing) throw new NotFoundError('Task', id);

  if (input.categoryId !== undefined) await assertCategoryExists(input.categoryId);

  // Only keys the client actually sent are written, so a PATCH from an inline
  // edit cannot blank out fields it never mentioned.
  const data: Prisma.TaskUncheckedUpdateInput = {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
    ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
    ...(input.quadrant !== undefined ? { quadrant: input.quadrant } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.dueDate !== undefined
      ? { dueDate: input.dueDate ? fromDateOnly(input.dueDate) : null }
      : {}),
    ...(input.owner !== undefined ? { owner: input.owner } : {}),
    ...(input.tag !== undefined ? { tag: input.tag } : {}),
    ...completionPatch(input.status, existing.status),
  };

  const updated = await taskRepo.updateTask(id, data);
  return toTaskDto(updated);
}

export async function deleteTask(userId: string, id: string): Promise<void> {
  const existing = await taskRepo.findTaskById(userId, id);
  if (!existing) throw new NotFoundError('Task', id);
  await taskRepo.deleteTask(id);
}

/**
 * Multi-select actions from the dashboard. Ids the user does not own are
 * dropped rather than failing the whole request, and the affected tasks are
 * returned so the client can reconcile its cache without a refetch.
 */
export async function bulkUpdateTasks(
  userId: string,
  { ids, patch }: BulkUpdateTasksInput,
): Promise<{ updated: TaskDto[]; skipped: string[] }> {
  if (patch.categoryId !== undefined) await assertCategoryExists(patch.categoryId);

  const ownedIds = await taskRepo.findOwnedTaskIds(userId, ids);
  const skipped = ids.filter((id) => !ownedIds.includes(id));

  if (ownedIds.length === 0) return { updated: [], skipped };

  const data: Prisma.TaskUncheckedUpdateManyInput = {
    ...(patch.categoryId !== undefined ? { categoryId: patch.categoryId } : {}),
    ...(patch.quadrant !== undefined ? { quadrant: patch.quadrant } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.owner !== undefined ? { owner: patch.owner } : {}),
    ...(patch.tag !== undefined ? { tag: patch.tag } : {}),
    // `updateMany` cannot branch per row, so the stamp is applied uniformly —
    // correct here because every task in the batch lands on the same status.
    ...(patch.status === 'done' ? { completedAt: new Date() } : {}),
    ...(patch.status !== undefined && patch.status !== 'done' ? { completedAt: null } : {}),
  };

  await taskRepo.updateManyTasks(ownedIds, data);
  const updated = await taskRepo.findTasksByIds(userId, ownedIds);

  return { updated: updated.map(toTaskDto), skipped };
}
