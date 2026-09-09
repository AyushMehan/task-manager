'use client';

import { AlertTriangle, CalendarClock, Flame } from 'lucide-react';
import type { TaskDto } from '@task-manager/shared';
import { useThisWeek } from '@/hooks/use-tasks';
import { TaskCard } from '@/components/task-card';
import { cn } from '@/lib/utils';

function Section({
 title,
 hint,
 icon: Icon,
 tasks,
 tone,
}: {
 title: string;
 hint: string;
 icon: typeof Flame;
 tasks: TaskDto[];
 tone: string;
}) {
 if (tasks.length === 0) return null;

 return (
 <section className={cn('overflow-hidden rounded-xl border', tone)}>
 <header className="flex items-center gap-2 px-3 py-2">
 <Icon className="h-4 w-4 shrink-0" />
 <div className="flex-1">
 <h3 className="text-sm font-semibold">{title}</h3>
 <p className="text-[11px] opacity-70">{hint}</p>
 </div>
 <span className="text-sm font-semibold tabular-nums">{tasks.length}</span>
 </header>
 <div className="grid gap-2 bg-canvas/40 p-2 sm:grid-cols-2 lg:grid-cols-3">
 {tasks.map((task) => (
 <TaskCard key={task.id} task={task} draggable={false} />
 ))}
 </div>
 </section>
 );
}

/**
 * The week at a glance. Undated Urgent+Important work is shown as its own
 * section rather than mixed into the dated lists — in this backlog urgency
 * often arrives without a deadline, and burying it under "no due date" is how
 * it gets missed.
 */
export function ThisWeekView() {
 const { data, isLoading } = useThisWeek();

 if (isLoading || !data) {
 return <div className="h-40 animate-pulse rounded-xl bg-surface-2" />;
 }

 const empty =
 data.overdue.length === 0 &&
 data.dueSoon.length === 0 &&
 data.urgentImportantUndated.length === 0;

 if (empty) {
 return (
 <p className="py-12 text-center text-sm text-faint">
 Nothing due this week, and no undated urgent work. Clear.
 </p>
 );
 }

 return (
 <div className="space-y-3">
 <Section
 title="Overdue"
 hint="Past due and still open"
 icon={AlertTriangle}
 tasks={data.overdue}
 tone="border-q-urgent-line bg-q-urgent-bg text-q-urgent-ink"
 />
 <Section
 title="Due in the next 7 days"
 hint={`${data.range.from} → ${data.range.to}`}
 icon={CalendarClock}
 tasks={data.dueSoon}
 tone="border-q-delegate-line bg-q-delegate-bg text-q-delegate-ink"
 />
 <Section
 title="Urgent & Important, no date"
 hint="Urgency without a deadline — easy to lose"
 icon={Flame}
 tasks={data.urgentImportantUndated}
 tone="border-q-schedule-line bg-q-schedule-bg text-q-schedule-ink"
 />
 </div>
 );
}
