'use client';

import { Check, X } from 'lucide-react';
import {
 QUADRANTS,
 QUADRANT_LABELS,
 type CategoryDto,
 type Quadrant,
} from '@task-manager/shared';
import { useBulkUpdateTasks } from '@/hooks/use-tasks';

/**
 * Appears only while tasks are selected. Anchored to the bottom of the
 * viewport so it stays reachable on a phone as well as a laptop.
 */
export function BulkActionBar({
 selectedIds,
 categories,
 onDone,
}: {
 selectedIds: string[];
 categories: CategoryDto[];
 onDone: () => void;
}) {
 const bulkUpdate = useBulkUpdateTasks();

 if (selectedIds.length === 0) return null;

 function apply(patch: Parameters<typeof bulkUpdate.mutate>[0]['patch']) {
 bulkUpdate.mutate({ ids: selectedIds, patch }, { onSuccess: onDone });
 }

 return (
 <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 p-3 shadow-[0_-4px_16px_rgb(0_0_0/0.12)] backdrop-blur-md">
 <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
 <span className="text-xs font-medium tabular-nums">
 {selectedIds.length} selected
 </span>

 <select
 aria-label="Set category"
 defaultValue=""
 onChange={(event) => {
 if (!event.target.value) return;
 apply({ categoryId: event.target.value === 'none' ? null : event.target.value });
 event.target.value = '';
 }}
 className={bulkSelect}
 >
 <option value="">Set category…</option>
 <option value="none">Uncategorised</option>
 {categories.map((category) => (
 <option key={category.id} value={category.id}>
 {category.name}
 </option>
 ))}
 </select>

 <select
 aria-label="Set quadrant"
 defaultValue=""
 onChange={(event) => {
 if (!event.target.value) return;
 apply({ quadrant: event.target.value as Quadrant });
 event.target.value = '';
 }}
 className={bulkSelect}
 >
 <option value="">Set quadrant…</option>
 {QUADRANTS.map((quadrant) => (
 <option key={quadrant} value={quadrant}>
 {QUADRANT_LABELS[quadrant]}
 </option>
 ))}
 </select>

 <button
 type="button"
 onClick={() => apply({ status: 'done' })}
 disabled={bulkUpdate.isPending}
 className="flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
 >
 <Check className="h-3.5 w-3.5" />
 Mark done
 </button>

 <button
 type="button"
 onClick={onDone}
 className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted hover:bg-surface-hover"
 >
 <X className="h-3.5 w-3.5" />
 Clear
 </button>
 </div>
 </div>
 );
}

const bulkSelect =
 'rounded-lg border border-line bg-surface px-2 py-1.5 text-xs outline-none ';
