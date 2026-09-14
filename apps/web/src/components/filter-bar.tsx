'use client';

import { Search, X } from 'lucide-react';
import {
 QUADRANTS,
 QUADRANT_LABELS,
 TASK_STATUSES,
 TASK_STATUS_LABELS,
 type CategoryDto,
} from '@task-manager/shared';
import { cn } from '@/lib/utils';

export type Filters = {
 search: string;
 status: string[];
 quadrant: string[];
 categoryId: string[];
 owner: string;
};

export const emptyFilters: Filters = {
 search: '',
 status: [],
 quadrant: [],
 categoryId: [],
 owner: '',
};

export function hasActiveFilters(filters: Filters): boolean {
 return (
 filters.search !== '' ||
 filters.owner !== '' ||
 filters.status.length > 0 ||
 filters.quadrant.length > 0 ||
 filters.categoryId.length > 0
 );
}

/** Single-select dropdown that maps "" to "no filter". */
function SelectFilter({
 label,
 value,
 options,
 onChange,
}: {
 label: string;
 value: string[];
 options: Array<{ value: string; label: string }>;
 onChange: (next: string[]) => void;
}) {
 return (
 <select
 aria-label={label}
 value={value[0] ?? ''}
 onChange={(event) => onChange(event.target.value ? [event.target.value] : [])}
 className={cn(
 'rounded-lg border border-line bg-surface px-2 py-1.5 text-xs outline-none transition-colors',
 value.length > 0 && 'border-accent bg-accent-soft font-medium text-accent',
 )}
 >
 <option value="">{label}</option>
 {options.map((option) => (
 <option key={option.value} value={option.value}>
 {option.label}
 </option>
 ))}
 </select>
 );
}

export function FilterBar({
 filters,
 onChange,
 categories,
 owners,
}: {
 filters: Filters;
 onChange: (filters: Filters) => void;
 categories: CategoryDto[];
 owners: string[];
}) {
 const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
 onChange({ ...filters, [key]: value });

 return (
 <div className="flex flex-wrap items-center gap-2">
 <div className="relative min-w-[10rem] flex-1">
 <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
 <input
 value={filters.search}
 onChange={(event) => set('search', event.target.value)}
 placeholder="Search title and notes…"
 aria-label="Search tasks"
 className="w-full rounded-lg border border-line bg-surface py-1.5 pl-8 pr-2 text-xs outline-none "
 />
 </div>

 <SelectFilter
 label="Status"
 value={filters.status}
 onChange={(next) => set('status', next)}
 options={TASK_STATUSES.map((status) => ({
 value: status,
 label: TASK_STATUS_LABELS[status],
 }))}
 />

 <SelectFilter
 label="Quadrant"
 value={filters.quadrant}
 onChange={(next) => set('quadrant', next)}
 options={QUADRANTS.map((quadrant) => ({
 value: quadrant,
 label: QUADRANT_LABELS[quadrant],
 }))}
 />

 <SelectFilter
 label="Category"
 value={filters.categoryId}
 onChange={(next) => set('categoryId', next)}
 options={categories.map((category) => ({ value: category.id, label: category.name }))}
 />

 {owners.length > 0 && (
 <select
 aria-label="Owner"
 value={filters.owner}
 onChange={(event) => set('owner', event.target.value)}
 className={cn(
 'rounded-lg border border-line bg-surface px-2 py-1.5 text-xs outline-none transition-colors',
 filters.owner && 'border-accent bg-accent-soft font-medium text-accent',
 )}
 >
 <option value="">Owner</option>
 {owners.map((owner) => (
 <option key={owner} value={owner}>
 {owner}
 </option>
 ))}
 </select>
 )}

 {hasActiveFilters(filters) && (
 <button
 type="button"
 onClick={() => onChange(emptyFilters)}
 className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted hover:bg-surface-hover hover:text-ink"
 >
 <X className="h-3 w-3" />
 Clear
 </button>
 )}
 </div>
 );
}
