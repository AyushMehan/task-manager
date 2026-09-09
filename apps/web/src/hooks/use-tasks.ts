'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  BulkUpdateTasksInput,
  CreateCategoryInput,
  CreateTaskInput,
  TaskDto,
  UpdateTaskInput,
} from '@task-manager/shared';
import { api, type TaskFilters } from '@/lib/api';

/**
 * Data hooks for tasks.
 *
 * Every mutation invalidates both the task lists and the dashboard counts,
 * since changing a task's status or quadrant moves the summary cards too.
 */

export const queryKeys = {
  tasks: (filters: TaskFilters = {}) => ['tasks', filters] as const,
  categories: (withCounts = false) => ['categories', withCounts] as const,
  summary: () => ['dashboard', 'summary'] as const,
  thisWeek: () => ['dashboard', 'this-week'] as const,
};

export function useTasks(filters: TaskFilters = {}) {
  return useQuery({
    queryKey: queryKeys.tasks(filters),
    queryFn: () => api.tasks.list(filters),
  });
}

export function useCategories(withCounts = false) {
  return useQuery({
    queryKey: queryKeys.categories(withCounts),
    queryFn: () => api.categories.list(withCounts),
    // Categories change rarely; no need to refetch them on every focus.
    staleTime: 5 * 60 * 1000,
  });
}

export function useSummary() {
  return useQuery({ queryKey: queryKeys.summary(), queryFn: api.dashboard.summary });
}

export function useThisWeek() {
  return useQuery({ queryKey: queryKeys.thisWeek(), queryFn: api.dashboard.thisWeek });
}

/** Refetches everything a task change could have affected. */
function useInvalidateTaskData() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    void queryClient.invalidateQueries({ queryKey: ['categories'] });
  };
}

/**
 * Creating a category from inside the add form, so a missing one never forces
 * a detour — categories are what turn the backlog into something navigable.
 */
export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCategoryInput) => api.categories.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useCreateTask() {
  const invalidate = useInvalidateTaskData();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => api.tasks.create(input),
    onSuccess: invalidate,
  });
}

/**
 * Inline edits apply optimistically: clicking a status or dragging a card in
 * the matrix should feel instant, and the change is rolled back if the request
 * fails.
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateTaskData();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      api.tasks.update(id, input),

    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const snapshot = queryClient.getQueriesData({ queryKey: ['tasks'] });

      queryClient.setQueriesData(
        { queryKey: ['tasks'] },
        (old: { tasks: TaskDto[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            tasks: old.tasks.map((task) => (task.id === id ? { ...task, ...input } : task)),
          };
        },
      );

      return { snapshot };
    },

    onError: (_error, _variables, context) => {
      for (const [key, value] of context?.snapshot ?? []) {
        queryClient.setQueryData(key, value);
      }
    },

    onSettled: invalidate,
  });
}

export function useDeleteTask() {
  const invalidate = useInvalidateTaskData();
  return useMutation({
    mutationFn: (id: string) => api.tasks.remove(id),
    onSuccess: invalidate,
  });
}

export function useBulkUpdateTasks() {
  const invalidate = useInvalidateTaskData();
  return useMutation({
    mutationFn: (input: BulkUpdateTasksInput) => api.tasks.bulkUpdate(input),
    onSuccess: invalidate,
  });
}
