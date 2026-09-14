'use client';

import { useEffect, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { ChevronDown } from 'lucide-react';
import {
  QUADRANTS,
  QUADRANT_ACTIONS,
  QUADRANT_LABELS,
  type Quadrant,
  type TaskDto,
} from '@task-manager/shared';
import { useUpdateTask } from '@/hooks/use-tasks';
import { TaskCard, TaskCardOverlay } from '@/components/task-card';
import { cn } from '@/lib/utils';

const quadrantStyles: Record<Quadrant, { header: string; body: string; over: string }> = {
  urgent_important: {
    header: 'bg-q-urgent-bg text-q-urgent-ink',
    body: 'border-q-urgent-line',
    over: 'bg-q-urgent-bg',
  },
  urgent_only: {
    header: 'bg-q-delegate-bg text-q-delegate-ink',
    body: 'border-q-delegate-line',
    over: 'bg-q-delegate-bg',
  },
  important_only: {
    header: 'bg-q-schedule-bg text-q-schedule-ink',
    body: 'border-q-schedule-line',
    over: 'bg-q-schedule-bg',
  },
  neither: {
    header: 'bg-q-backlog-bg text-q-backlog-ink',
    body: 'border-q-backlog-line',
    over: 'bg-q-backlog-bg',
  },
};

/**
 * How many cards a collapsed quadrant shows, sized to the viewport so all four
 * quadrants stay visible together — the point of the matrix is comparing them
 * at a glance, not scrolling through one.
 */
function useCollapsedCount(): number {
  const [count, setCount] = useState(4);

  useEffect(() => {
    const measure = () => {
      const height = window.innerHeight;
      setCount(height < 700 ? 3 : height < 900 ? 4 : height < 1100 ? 5 : 6);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  return count;
}

function QuadrantCell({
  quadrant,
  tasks,
  limit,
  expanded,
  onToggleExpanded,
}: {
  quadrant: Quadrant;
  tasks: TaskDto[];
  limit: number;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: quadrant });
  const styles = quadrantStyles[quadrant];

  const visible = expanded ? tasks : tasks.slice(0, limit);
  const hidden = tasks.length - visible.length;

  return (
    <div className={cn('flex flex-col rounded-xl border bg-surface', styles.body)}>
      <div
        className={cn(
          'flex items-baseline justify-between rounded-t-xl px-3 py-2',
          styles.header,
        )}
      >
        <div>
          <h3 className="text-sm font-semibold">{QUADRANT_LABELS[quadrant]}</h3>
          <p className="text-[11px] opacity-70">{QUADRANT_ACTIONS[quadrant]}</p>
        </div>
        <span className="text-sm font-semibold tabular-nums">{tasks.length}</span>
      </div>

      {/* No `overflow-hidden` here: it would clip a card being dragged out. */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[7rem] flex-1 flex-col gap-2 rounded-b-xl p-2 transition-colors',
          isOver && cn(styles.over, 'ring-2 ring-inset ring-accent'),
        )}
      >
        {visible.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}

        {tasks.length === 0 && (
          <p className="px-1 py-4 text-center text-xs text-faint">
            {isOver ? 'Drop to reclassify' : 'Nothing here'}
          </p>
        )}

        {(hidden > 0 || expanded) && (
          <button
            type="button"
            onClick={onToggleExpanded}
            aria-expanded={expanded}
            className="flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-ink"
          >
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-180')} />
            {expanded ? 'Show less' : `Show ${hidden} more`}
          </button>
        )}
      </div>
    </div>
  );
}

/** The classic Eisenhower 2x2. Dragging a card between cells reclassifies it. */
export function MatrixView({ tasks }: { tasks: TaskDto[] }) {
  const updateTask = useUpdateTask();
  const limit = useCollapsedCount();

  const [expanded, setExpanded] = useState<Partial<Record<Quadrant, boolean>>>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  // A small activation distance keeps a click on the complete button from
  // being swallowed as the start of a drag.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const activeTask = activeId ? (tasks.find((task) => task.id === activeId) ?? null) : null;

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);

    const quadrant = event.over?.id as Quadrant | undefined;
    const taskId = event.active.id as string;
    if (!quadrant) return;

    const task = tasks.find((candidate) => candidate.id === taskId);
    if (!task || task.quadrant === quadrant) return;

    updateTask.mutate({ id: taskId, input: { quadrant } });
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(event: DragStartEvent) => setActiveId(event.active.id as string)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="grid items-start gap-3 sm:grid-cols-2">
        {QUADRANTS.map((quadrant) => (
          <QuadrantCell
            key={quadrant}
            quadrant={quadrant}
            tasks={tasks.filter((task) => task.quadrant === quadrant)}
            limit={limit}
            expanded={expanded[quadrant] ?? false}
            onToggleExpanded={() =>
              setExpanded((state) => ({ ...state, [quadrant]: !state[quadrant] }))
            }
          />
        ))}
      </div>

      {/* Rendered in a portal above the grid, so the dragged card is never
          clipped by the quadrant it started in. */}
      <DragOverlay dropAnimation={null}>
        {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
