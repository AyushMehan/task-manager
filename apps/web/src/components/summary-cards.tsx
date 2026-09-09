'use client';

import { AlertTriangle, CalendarClock, CheckCircle2, ListTodo } from 'lucide-react';
import { QUADRANT_ACTIONS, QUADRANT_LABELS, QUADRANTS, type Quadrant } from '@task-manager/shared';
import { useSummary } from '@/hooks/use-tasks';
import { cn } from '@/lib/utils';

/**
 * Quadrant colours come from the semantic tokens in globals.css, which carry
 * their own dark-mode values — the fills that read well on white vanish
 * against a dark canvas, so each theme sets its own alpha and text shade.
 */
export const quadrantCardStyles: Record<Quadrant, string> = {
  urgent_important: 'border-q-urgent-line bg-q-urgent-bg text-q-urgent-ink hover:border-q-urgent-ink',
  urgent_only:
    'border-q-delegate-line bg-q-delegate-bg text-q-delegate-ink hover:border-q-delegate-ink',
  important_only:
    'border-q-schedule-line bg-q-schedule-bg text-q-schedule-ink hover:border-q-schedule-ink',
  neither: 'border-q-backlog-line bg-q-backlog-bg text-q-backlog-ink hover:border-q-backlog-ink',
};

/** Answers "what's pending?" and "what needs me this week?" at a glance. */
export function SummaryCards({
  onQuadrantClick,
  activeQuadrant,
}: {
  onQuadrantClick?: (quadrant: Quadrant) => void;
  activeQuadrant?: string;
}) {
  const { data, isLoading } = useSummary();

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-20 animate-pulse rounded-xl bg-surface-2" />
        ))}
      </div>
    );
  }

  const cards = [
    { label: 'Pending', value: data.totalPending, icon: ListTodo, tint: 'text-muted bg-surface-2' },
    {
      label: 'Due this week',
      value: data.dueThisWeek,
      icon: CalendarClock,
      tint: 'text-warning bg-q-delegate-bg',
    },
    {
      label: 'Overdue',
      value: data.overdue,
      icon: AlertTriangle,
      tint: 'text-danger bg-q-urgent-bg',
    },
    {
      label: 'Done this week',
      value: data.completedThisWeek,
      icon: CheckCircle2,
      tint: 'text-success bg-success/10',
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="card rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">{card.label}</span>
              <span className={cn('rounded-lg p-1.5', card.tint)}>
                <card.icon className="h-3.5 w-3.5" />
              </span>
            </div>
            <p
              className={cn(
                'mt-1.5 text-2xl font-semibold tabular-nums',
                card.value === 0 && 'text-faint',
              )}
            >
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quadrant counts double as filters — clicking one scopes the list. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {QUADRANTS.map((quadrant) => (
          <button
            key={quadrant}
            type="button"
            onClick={() => onQuadrantClick?.(quadrant)}
            aria-pressed={activeQuadrant === quadrant}
            className={cn(
              'rounded-xl border p-3 text-left transition-all',
              quadrantCardStyles[quadrant],
              activeQuadrant === quadrant && 'ring-2 ring-accent ring-offset-2 ring-offset-canvas',
            )}
          >
            <p className="text-xl font-semibold tabular-nums">{data.byQuadrant[quadrant]}</p>
            <p className="text-xs font-medium">{QUADRANT_LABELS[quadrant]}</p>
            <p className="mt-0.5 text-[11px] opacity-75">{QUADRANT_ACTIONS[quadrant]}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
