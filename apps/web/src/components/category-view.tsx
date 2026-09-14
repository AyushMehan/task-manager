'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { CategoryDto, TaskDto } from '@task-manager/shared';
import { TaskCard } from '@/components/task-card';
import { cn } from '@/lib/utils';

/** Tasks grouped into collapsible sections, one per category. */
export function CategoryView({
 tasks,
 categories,
}: {
 tasks: TaskDto[];
 categories: CategoryDto[];
}) {
 const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

 const groups = [
 ...categories.map((category) => ({
 id: category.id,
 name: category.name,
 color: category.color,
 tasks: tasks.filter((task) => task.categoryId === category.id),
 })),
 {
 id: 'uncategorised',
 name: 'Uncategorised',
 color: null,
 tasks: tasks.filter((task) => task.categoryId === null),
 },
 ].filter((group) => group.tasks.length > 0);

 if (groups.length === 0) {
 return <p className="py-12 text-center text-sm text-faint">No tasks match these filters.</p>;
 }

 return (
 <div className="space-y-2">
 {groups.map((group) => {
 const isCollapsed = collapsed[group.id] ?? false;

 return (
 <section
 key={group.id}
 className="card overflow-hidden rounded-xl"
 >
 <button
 type="button"
 onClick={() => setCollapsed((state) => ({ ...state, [group.id]: !isCollapsed }))}
 aria-expanded={!isCollapsed}
 className="flex w-full items-center gap-2 bg-surface-2 px-3 py-2 text-left transition-colors hover:bg-surface-hover"
 >
 <ChevronDown
 className={cn(
 'h-4 w-4 shrink-0 text-faint transition-transform',
 isCollapsed && '-rotate-90',
 )}
 />
 <span
 className="h-2.5 w-2.5 shrink-0 rounded-full"
 style={{ backgroundColor: group.color ?? '#cbd5e1' }}
 />
 <span className="flex-1 text-sm font-medium">{group.name}</span>
 <span className="text-xs tabular-nums text-muted">{group.tasks.length}</span>
 </button>

 {!isCollapsed && (
 <div className="grid gap-2 p-2 sm:grid-cols-2 lg:grid-cols-3">
 {group.tasks.map((task) => (
 <TaskCard key={task.id} task={task} draggable={false} />
 ))}
 </div>
 )}
 </section>
 );
 })}
 </div>
 );
}
