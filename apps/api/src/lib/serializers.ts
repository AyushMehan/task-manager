import type { CategoryDto, Quadrant, TaskDto, TaskStatus } from '@task-manager/shared';
import type { CategoryWithCount } from '../repositories/category.repository.js';
import type { TaskRecord } from '../repositories/task.repository.js';
import type { Category } from './prisma.js';
import { toDateOnly } from './dates.js';

/**
 * Database rows are shaped for storage; DTOs are shaped for clients. Mapping
 * explicitly here means a new column is not accidentally exposed over the API,
 * and `Date` objects leave as strings in a single, predictable format.
 */

export function toTaskDto(task: TaskRecord): TaskDto {
  return {
    id: task.id,
    title: task.title,
    notes: task.notes,
    categoryId: task.categoryId,
    category: task.category
      ? { id: task.category.id, name: task.category.name, color: task.category.color }
      : null,
    quadrant: task.quadrant as Quadrant,
    status: task.status as TaskStatus,
    dueDate: toDateOnly(task.dueDate),
    owner: task.owner,
    tag: task.tag,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    completedAt: task.completedAt?.toISOString() ?? null,
  };
}

export function toCategoryDto(category: Category | CategoryWithCount): CategoryDto {
  return {
    id: category.id,
    name: category.name,
    color: category.color,
    sortOrder: category.sortOrder,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
    ...('_count' in category ? { taskCount: category._count.tasks } : {}),
  };
}
