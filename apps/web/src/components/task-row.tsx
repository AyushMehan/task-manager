'use client';

import { useState } from 'react';
import { Check, Pencil, Trash2, Undo2 } from 'lucide-react';
import {
 QUADRANTS,
 QUADRANT_LABELS,
 TASK_STATUSES,
 TASK_STATUS_LABELS,
 type CategoryDto,
 type Quadrant,
 type TaskDto,
 type TaskStatus,
} from '@task-manager/shared';
import { useDeleteTask, useUpdateTask } from '@/hooks/use-tasks';
import { cn, formatDueDate } from '@/lib/utils';
import { TaskEditDialog } from '@/components/task-edit-dialog';

const dueToneStyles: Record<string, string> = {
 overdue: 'text-danger font-medium',
 today: 'text-warning font-medium',
 soon: 'text-muted',
 later: 'text-faint',
 none: 'text-faint',
};

/**
 * One task in the list view, with common fields editable in place and the
 * pencil action opening the complete editor.
 */
export function TaskRow({
 task,
 categories,
 selected,
 onSelect,
}: {
 task: TaskDto;
 categories: CategoryDto[];
 selected: boolean;
 onSelect: (id: string, selected: boolean) => void;
}) {
 const updateTask = useUpdateTask();
 const deleteTask = useDeleteTask();
 const [isEditing, setIsEditing] = useState(false);

 const done = task.status === 'done';
 const due = formatDueDate(task.dueDate);

 function patch(input: Parameters<typeof updateTask.mutate>[0]['input']) {
 updateTask.mutate({ id: task.id, input });
 }

 return (
 <>
 <div
 className={cn(
 'group flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line px-3 py-2.5 last:border-0',
 'transition-colors hover:bg-surface-hover',
 selected && 'bg-accent-soft',
 )}
 >
 <input
 type="checkbox"
 checked={selected}
 onChange={(event) => onSelect(task.id, event.target.checked)}
 aria-label={`Select ${task.title}`}
 className="h-4 w-4 shrink-0 rounded border-line-strong"
 />

 <button
 type="button"
 onClick={() => patch({ status: done ? 'pending' : 'done' })}
 aria-label={done ? 'Reopen task' : 'Mark complete'}
 className={cn(
 'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
 done
 ? 'border-success bg-success text-canvas'
 : 'border-line-strong hover:border-success',
 )}
 >
 {done && <Check className="h-3 w-3" />}
 </button>

 <span
 className={cn(
 'min-w-[8rem] flex-1 text-sm',
 done && 'text-faint line-through',
 )}
 >
 {task.title}
 </span>

 {task.tag && (
 <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted">
 #{task.tag}
 </span>
 )}

 {task.owner && (
 <span className="hidden shrink-0 text-xs text-muted sm:inline">{task.owner}</span>
 )}

 {task.dueDate && (
 <span className={cn('shrink-0 text-xs tabular-nums', dueToneStyles[due.tone])}>
 {due.label}
 </span>
 )}

 <select
 value={task.categoryId ?? ''}
 onChange={(event) => patch({ categoryId: event.target.value || null })}
 aria-label="Category"
 className={inlineSelect}
 style={task.category?.color ? { color: task.category.color } : undefined}
 >
 <option value="">—</option>
 {categories.map((category) => (
 <option key={category.id} value={category.id}>
 {category.name}
 </option>
 ))}
 </select>

 <select
 value={task.quadrant}
 onChange={(event) => patch({ quadrant: event.target.value as Quadrant })}
 aria-label="Quadrant"
 className={inlineSelect}
 >
 {QUADRANTS.map((quadrant) => (
 <option key={quadrant} value={quadrant}>
 {QUADRANT_LABELS[quadrant]}
 </option>
 ))}
 </select>

 <select
 value={task.status}
 onChange={(event) => patch({ status: event.target.value as TaskStatus })}
 aria-label="Status"
 className={inlineSelect}
 >
 {TASK_STATUSES.map((status) => (
 <option key={status} value={status}>
 {TASK_STATUS_LABELS[status]}
 </option>
 ))}
 </select>

 <div className="flex shrink-0 items-center gap-1">
 <button
 type="button"
 onClick={() => setIsEditing(true)}
 aria-label={`Edit ${task.title}`}
 className="rounded p-1 text-faint transition-colors hover:bg-surface-hover hover:text-ink"
 >
 <Pencil className="h-3.5 w-3.5" />
 </button>
 {done && (
 <button
 type="button"
 onClick={() => patch({ status: 'pending' })}
 aria-label="Reopen"
 className="rounded p-1 text-faint hover:bg-surface-hover hover:text-ink"
 >
 <Undo2 className="h-3.5 w-3.5" />
 </button>
 )}
 <button
 type="button"
 onClick={() => deleteTask.mutate(task.id)}
 aria-label="Delete task"
 className="rounded p-1 text-faint opacity-0 transition-opacity hover:bg-q-urgent-bg hover:text-danger group-hover:opacity-100"
 >
 <Trash2 className="h-3.5 w-3.5" />
 </button>
 </div>
 </div>
 {isEditing && <TaskEditDialog task={task} onClose={() => setIsEditing(false)} />}
 </>
 );
}

const inlineSelect = cn(
 'shrink-0 rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-muted',
 'hover:border-line hover:bg-surface-2 focus:border-line-strong',
);
