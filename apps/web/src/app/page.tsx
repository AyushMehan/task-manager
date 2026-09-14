'use client';

import { useMemo, useState } from 'react';
import { CalendarRange, Grid2x2, List, Layers, Loader2 } from 'lucide-react';
import type { TaskDto } from '@task-manager/shared';
import { useCategories, useTasks } from '@/hooks/use-tasks';
import { QuickAdd } from '@/components/quick-add';
import { SummaryCards } from '@/components/summary-cards';
import { TaskRow } from '@/components/task-row';
import { MatrixView } from '@/components/matrix-view';
import { CategoryView } from '@/components/category-view';
import { ThisWeekView } from '@/components/this-week-view';
import { BulkActionBar } from '@/components/bulk-action-bar';
import { emptyFilters, FilterBar, type Filters } from '@/components/filter-bar';
import { cn } from '@/lib/utils';

type ViewMode = 'list' | 'matrix' | 'category' | 'week';

// Ordered by how often they answer the question you opened the app with:
// what needs me now, how does it classify, where does it sit, then the
// full flat list last.
const VIEWS: Array<{ id: ViewMode; label: string; icon: typeof List }> = [
  { id: 'week', label: 'This Week', icon: CalendarRange },
  { id: 'matrix', label: 'Matrix', icon: Grid2x2 },
  { id: 'category', label: 'Category', icon: Layers },
  { id: 'list', label: 'List', icon: List },
];

export default function DashboardPage() {
 const [view, setView] = useState<ViewMode>('week');
 const [filters, setFilters] = useState<Filters>(emptyFilters);
 const [selectedIds, setSelectedIds] = useState<string[]>([]);

 const { data: categories = [] } = useCategories();

 // The default view is everything still open; an explicit status filter wins.
 const statusFilter = filters.status.length > 0 ? filters.status : ['pending', 'in_progress'];

 const { data, isLoading, isError, error } = useTasks({
 search: filters.search || undefined,
 status: statusFilter,
 quadrant: filters.quadrant.length > 0 ? filters.quadrant : undefined,
 categoryId: filters.categoryId.length > 0 ? filters.categoryId : undefined,
 owner: filters.owner || undefined,
 sort: 'dueDate',
 order: 'asc',
 pageSize: 200,
 });

 const tasks: TaskDto[] = useMemo(() => data?.tasks ?? [], [data]);

 // Owner is free text, so the filter's options come from what is actually in use.
 const owners = useMemo(() => {
 const unique = new Set<string>();
 for (const task of tasks) if (task.owner) unique.add(task.owner);
 return [...unique].sort();
 }, [tasks]);

 function toggleSelect(id: string, selected: boolean) {
 setSelectedIds((current) =>
 selected ? [...current, id] : current.filter((entry) => entry !== id),
 );
 }

 const allSelected = tasks.length > 0 && selectedIds.length === tasks.length;

 return (
 <main className="mx-auto max-w-6xl space-y-4 px-3 py-5 pb-24 sm:px-5">
 <header className="flex flex-wrap items-baseline justify-between gap-2">
 <h1 className="text-xl font-semibold tracking-tight">Task Manager</h1>
 {data?.meta && (
 <p className="text-xs text-muted tabular-nums">
 {data.meta.total} matching {data.meta.total === 1 ? 'task' : 'tasks'}
 </p>
 )}
 </header>

 <QuickAdd />

 <SummaryCards
 activeQuadrant={filters.quadrant[0]}
 onQuadrantClick={(quadrant) => {
 setView('list');
 setFilters((current) => ({
 ...current,
 quadrant: current.quadrant[0] === quadrant ? [] : [quadrant],
 }));
 }}
 />

 <div className="flex flex-wrap items-center gap-2">
 <div className="flex rounded-lg border border-line bg-surface p-0.5">
 {VIEWS.map((entry) => (
 <button
 key={entry.id}
 type="button"
 onClick={() => setView(entry.id)}
 aria-pressed={view === entry.id}
 className={cn(
 'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
 view === entry.id
 ? 'bg-accent text-accent-ink shadow-sm'
 : 'text-muted hover:bg-surface-hover hover:text-ink',
 )}
 >
 <entry.icon className="h-3.5 w-3.5" />
 <span className="hidden sm:inline">{entry.label}</span>
 </button>
 ))}
 </div>
 </div>

 {/* This Week has its own endpoint and its own grouping, so the list
 filters do not apply to it. */}
 {view !== 'week' && (
 <FilterBar
 filters={filters}
 onChange={setFilters}
 categories={categories}
 owners={owners}
 />
 )}

 {isError && (
 <div className="rounded-xl border border-q-urgent-line bg-q-urgent-bg p-4 text-sm text-q-urgent-ink">
 <p className="font-medium">Could not load tasks</p>
 <p className="mt-1 text-xs">{error.message}</p>
 <p className="mt-2 text-xs opacity-80">
 Is the API running? Start it with <code>pnpm dev:api</code>.
 </p>
 </div>
 )}

 {isLoading && (
 <div className="flex items-center justify-center gap-2 py-16 text-sm text-faint">
 <Loader2 className="h-4 w-4 animate-spin" />
 Loading tasks…
 </div>
 )}

 {!isLoading && !isError && (
 <>
 {view === 'week' && <ThisWeekView />}

 {view === 'matrix' && <MatrixView tasks={tasks} />}

 {view === 'category' && <CategoryView tasks={tasks} categories={categories} />}

 {view === 'list' && (
 <div className="card overflow-hidden rounded-xl">
 {tasks.length > 0 && (
 <div className="flex items-center gap-3 border-b border-line bg-surface-2 px-3 py-2 ">
 <input
 type="checkbox"
 checked={allSelected}
 onChange={(event) =>
 setSelectedIds(event.target.checked ? tasks.map((task) => task.id) : [])
 }
 aria-label="Select all tasks"
 className="h-4 w-4 rounded border-line-strong"
 />
 <span className="text-xs text-muted">Select all</span>
 </div>
 )}

 {tasks.map((task) => (
 <TaskRow
 key={task.id}
 task={task}
 categories={categories}
 selected={selectedIds.includes(task.id)}
 onSelect={toggleSelect}
 />
 ))}

 {tasks.length === 0 && (
 <p className="py-12 text-center text-sm text-faint">
 Nothing here. Add a task above to get started.
 </p>
 )}
 </div>
 )}
 </>
 )}

 <BulkActionBar
 selectedIds={selectedIds}
 categories={categories}
 onDone={() => setSelectedIds([])}
 />
 </main>
 );
}
