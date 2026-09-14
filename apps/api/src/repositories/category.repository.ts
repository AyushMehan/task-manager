import { Prisma, prisma } from '../lib/prisma.js';

/**
 * Categories are seeded but editable — the UI reads them at runtime, so adding
 * one never requires a code change or a migration.
 */

export type CategoryWithCount = Prisma.CategoryGetPayload<{
  include: { _count: { select: { tasks: true } } };
}>;

const orderBy: Prisma.CategoryOrderByWithRelationInput[] = [{ sortOrder: 'asc' }, { name: 'asc' }];

export function findCategories() {
  return prisma.category.findMany({ orderBy });
}

export function findCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  return prisma.category.findMany({
    orderBy,
    include: { _count: { select: { tasks: true } } },
  });
}

export function findCategoryById(id: string) {
  return prisma.category.findUnique({ where: { id } });
}

export function findCategoryByName(name: string) {
  return prisma.category.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
}

export function createCategory(data: Prisma.CategoryCreateInput) {
  return prisma.category.create({ data });
}

export function updateCategory(id: string, data: Prisma.CategoryUpdateInput) {
  return prisma.category.update({ where: { id }, data });
}

/**
 * Deleting a category does not delete its tasks — the FK is `ON DELETE SET
 * NULL`, so they fall back to uncategorised rather than vanishing.
 */
export function deleteCategory(id: string) {
  return prisma.category.delete({ where: { id } });
}

/** Highest `sortOrder` in use, so a new category lands at the end of the list. */
export async function maxCategorySortOrder(): Promise<number> {
  const result = await prisma.category.aggregate({ _max: { sortOrder: true } });
  return result._max.sortOrder ?? 0;
}
