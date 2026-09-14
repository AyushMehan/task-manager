import type {
  BulkUpdateTasksInput,
  CategoryDto,
  CreateCategoryInput,
  CreateTaskInput,
  DashboardSummary,
  PaginationMeta,
  TaskDto,
  ThisWeekResponse,
  UpdateTaskInput,
} from '@task-manager/shared';

/**
 * The only place the frontend talks to the backend.
 *
 * Everything goes through the REST API — no database access from the browser —
 * so a mobile client can later hit exactly these endpoints.
 */

/**
 * Empty by default: the app calls `/api/*` on its own origin and Next rewrites
 * that to the API service. Set NEXT_PUBLIC_API_URL only to point a browser at
 * an API on a different host.
 */
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    /** Field-level messages from the API's Zod validation, when present. */
    readonly details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Envelope<T> = { data: T; meta?: Record<string, unknown> };

async function request<T>(path: string, init?: RequestInit): Promise<Envelope<T>> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    // A network-level failure usually means the API process is not running,
    // which is worth saying plainly rather than surfacing "Failed to fetch".
    throw new ApiError(0, 'NETWORK_ERROR', `Could not reach the API at ${BASE_URL || 'this origin'}`);
  }

  if (response.status === 204) return { data: undefined as T };

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const error = body?.error;
    throw new ApiError(
      response.status,
      error?.code ?? 'UNKNOWN',
      error?.message ?? response.statusText,
      error?.details,
    );
  }

  return body as Envelope<T>;
}

/** Filters the list view sends; arrays become repeated query parameters. */
export type TaskFilters = {
  status?: string[];
  quadrant?: string[];
  categoryId?: string[];
  owner?: string;
  tag?: string;
  search?: string;
  overdue?: boolean;
  sort?: string;
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
};

function toQueryString(filters: TaskFilters): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      for (const entry of value) params.append(key, String(entry));
    } else {
      params.append(key, String(value));
    }
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export const api = {
  tasks: {
    async list(filters: TaskFilters = {}) {
      const { data, meta } = await request<TaskDto[]>(`/api/tasks${toQueryString(filters)}`);
      return { tasks: data, meta: meta as unknown as PaginationMeta };
    },

    async create(input: CreateTaskInput) {
      const { data } = await request<TaskDto>('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return data;
    },

    async update(id: string, input: UpdateTaskInput) {
      const { data } = await request<TaskDto>(`/api/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      });
      return data;
    },

    async remove(id: string) {
      await request<void>(`/api/tasks/${id}`, { method: 'DELETE' });
    },

    async bulkUpdate(input: BulkUpdateTasksInput) {
      const { data } = await request<TaskDto[]>('/api/tasks/bulk', {
        method: 'PATCH',
        body: JSON.stringify(input),
      });
      return data;
    },
  },

  categories: {
    async list(withCounts = false) {
      const { data } = await request<CategoryDto[]>(
        `/api/categories${withCounts ? '?withCounts=true' : ''}`,
      );
      return data;
    },

    async create(input: CreateCategoryInput) {
      const { data } = await request<CategoryDto>('/api/categories', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return data;
    },
  },

  dashboard: {
    async summary() {
      const { data } = await request<DashboardSummary>('/api/dashboard/summary');
      return data;
    },

    async thisWeek() {
      const { data } = await request<ThisWeekResponse>('/api/dashboard/this-week');
      return data;
    },
  },
};
