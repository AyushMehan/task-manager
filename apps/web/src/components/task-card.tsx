'use client';

import { useDraggable } from '@dnd-kit/core';
import { Check, GripVertical } from 'lucide-react';
import type { TaskDto } from '@task-manager/shared';
import { useUpdateTask } from '@/hooks/use-tasks';
import { cn, formatDueDate } from '@/lib/utils';

/** The visual card, with no drag wiring — shared by the grid and the overlay. */
function CardBody({
  task,
  handle,
  onToggle,
}: {
  task: TaskDto;
  handle?: React.ReactNode;
  onToggle?: () => void;
}) {
  const done = task.status === 'done';
  const due = formatDueDate(task.dueDate);

  return (
    <>
      {handle}

      <button
        type="button"
        onClick={onToggle}
        disabled={!onToggle}
        aria-label={done ? 'Reopen task' : 'Mark complete'}
        className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
          done
            ? 'border-success bg-success text-canvas'
            : 'border-line-strong hover:border-success',
        )}
      >
        {done && <Check className="h-2.5 w-2.5" />}
      </button>

      <div className="min-w-0 flex-1">
        <p className={cn('break-words', done && 'text-faint line-through')}>{task.title}</p>

        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
          {task.category && (
            <span
              className="rounded px-1.5 py-0.5"
              style={{
                backgroundColor: `${task.category.color ?? '#64748b'}1a`,
                color: task.category.color ?? '#64748b',
              }}
            >
              {task.category.name}
            </span>
          )}
          {task.tag && <span className="text-faint">#{task.tag}</span>}
          {task.owner && <span className="text-faint">{task.owner}</span>}
          {task.dueDate && (
            <span
              className={cn(
                'tabular-nums',
                due.tone === 'overdue' && 'font-medium text-danger',
                due.tone === 'today' && 'font-medium text-warning',
                due.tone !== 'overdue' && due.tone !== 'today' && 'text-faint',
              )}
            >
              {due.label}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * The copy that follows the cursor while dragging. Rendered by `DragOverlay`
 * in a portal at the top of the DOM, so it is never clipped by the quadrant
 * it is leaving.
 */
export function TaskCardOverlay({ task }: { task: TaskDto }) {
  return (
    <div className="card flex w-full items-start gap-2 rounded-lg p-2.5 text-sm shadow-xl ring-2 ring-accent">
      <span className="mt-0.5 shrink-0 text-faint">
        <GripVertical className="h-4 w-4" />
      </span>
      <CardBody task={task} />
    </div>
  );
}

/**
 * A task as a card, used by the matrix and category views.
 *
 * While dragging, this stays put as a dimmed placeholder and applies no
 * transform of its own — the moving copy is `TaskCardOverlay`.
 */
export function TaskCard({ task, draggable = true }: { task: TaskDto; draggable?: boolean }) {
  const updateTask = useUpdateTask();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    disabled: !draggable,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'card flex items-start gap-2 rounded-lg p-2.5 text-sm transition-opacity',
        isDragging && 'opacity-40',
      )}
    >
      <CardBody
        task={task}
        onToggle={() =>
          updateTask.mutate({
            id: task.id,
            input: { status: task.status === 'done' ? 'pending' : 'done' },
          })
        }
        handle={
          draggable ? (
            <button
              type="button"
              {...listeners}
              {...attributes}
              aria-label={`Drag ${task.title}`}
              className="mt-0.5 shrink-0 cursor-grab touch-none text-faint hover:text-muted active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          ) : undefined
        }
      />
    </div>
  );
}
