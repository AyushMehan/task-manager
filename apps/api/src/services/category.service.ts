import type { CategoryDto, CreateCategoryInput, UpdateCategoryInput } from '@task-manager/shared';
import * as categoryRepo from '../repositories/category.repository.js';
import { ConflictError, NotFoundError } from '../lib/errors.js';
import { toCategoryDto } from '../lib/serializers.js';

/** New categories land at the end of the list rather than interleaving. */
const SORT_ORDER_STEP = 10;

export async function listCategories(withCounts: boolean): Promise<CategoryDto[]> {
  const categories = withCounts
    ? await categoryRepo.findCategoriesWithCounts()
    : await categoryRepo.findCategories();
  return categories.map(toCategoryDto);
}

export async function getCategory(id: string): Promise<CategoryDto> {
  const category = await categoryRepo.findCategoryById(id);
  if (!category) throw new NotFoundError('Category', id);
  return toCategoryDto(category);
}

async function assertNameIsFree(name: string, exceptId?: string) {
  const existing = await categoryRepo.findCategoryByName(name);
  if (existing && existing.id !== exceptId) {
    throw new ConflictError(`A category named '${existing.name}' already exists`);
  }
}

export async function createCategory(input: CreateCategoryInput): Promise<CategoryDto> {
  // Checked case-insensitively so "Cleaning" and "cleaning" cannot coexist and
  // silently split a group in the category view.
  await assertNameIsFree(input.name);

  const sortOrder =
    input.sortOrder ?? (await categoryRepo.maxCategorySortOrder()) + SORT_ORDER_STEP;

  const created = await categoryRepo.createCategory({
    name: input.name,
    color: input.color ?? null,
    sortOrder,
  });

  return toCategoryDto(created);
}

export async function updateCategory(id: string, input: UpdateCategoryInput): Promise<CategoryDto> {
  const existing = await categoryRepo.findCategoryById(id);
  if (!existing) throw new NotFoundError('Category', id);

  if (input.name) await assertNameIsFree(input.name, id);

  const updated = await categoryRepo.updateCategory(id, {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.color !== undefined ? { color: input.color } : {}),
    ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
  });

  return toCategoryDto(updated);
}

/** Tasks in a deleted category become uncategorised; they are never removed. */
export async function deleteCategory(id: string): Promise<void> {
  const existing = await categoryRepo.findCategoryById(id);
  if (!existing) throw new NotFoundError('Category', id);
  await categoryRepo.deleteCategory(id);
}
