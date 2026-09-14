'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Save, X } from 'lucide-react';
import {
  QUADRANTS,
  QUADRANT_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type Quadrant,
  type TaskDto,
  type TaskStatus,
} from '@task-manager/shared';
import { useCategories, useUpdateTask } from '@/hooks/use-tasks';
import { cn } from '@/lib/utils';

const fieldClass =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none transition-colors focus:border-accent';

/** A complete task editor shared by list rows and cards in every dashboard view. */
export function TaskEditDialog({ task, onClose }: { task: TaskDto; onClose: () => void }) {
  const titleId = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const { data: categories = [] } = useCategories();
  const updateTask = useUpdateTask();

  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? '');
  const [categoryId, setCategoryId] = useState(task.categoryId ?? '');
  const [quadrant, setQuadrant] = useState<Quadrant>(task.quadrant);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [dueDate, setDueDate] = useState(task.dueDate ?? '');
  const [owner, setOwner] = useState(task.owner ?? '');
  const [tag, setTag] = useState(task.tag ?? '');

  useEffect(() => {
    titleRef.current?.focus();

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !updateTask.isPending) onClose();
    }

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose, updateTask.isPending]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle || updateTask.isPending) return;

    updateTask.mutate(
      {
        id: task.id,
        input: {
          title: trimmedTitle,
          notes: notes.trim() || null,
          categoryId: categoryId || null,
          quadrant,
          status,
          dueDate: dueDate || null,
          owner: owner.trim() || null,
          tag: tag.trim() || null,
        },
      },
      { onSuccess: onClose },
    );
  }

  function closeFromBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && !updateTask.isPending) onClose();
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={closeFromBackdrop}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/35 p-4"
    >
      <form
        onSubmit={submit}
        className="card my-auto w-full max-w-xl rounded-2xl p-4 shadow-xl sm:p-5"
      >
        <header className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-base font-semibold">
              Edit task
            </h2>
            <p className="mt-0.5 text-xs text-muted">Update the task details below.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={updateTask.isPending}
            aria-label="Close task editor"
            className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-hover hover:text-ink disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-3">
          <label className="block text-xs font-medium text-muted">
            Title
            <input
              ref={titleRef}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              maxLength={500}
              className={cn(fieldClass, 'mt-1')}
            />
          </label>

          <label className="block text-xs font-medium text-muted">
            Notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={5000}
              rows={4}
              className={cn(fieldClass, 'mt-1 resize-y')}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-muted">
              Category
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className={cn(fieldClass, 'mt-1')}
              >
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-muted">
              Due date
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                className={cn(fieldClass, 'mt-1')}
              />
            </label>

            <label className="block text-xs font-medium text-muted">
              Quadrant
              <select
                value={quadrant}
                onChange={(event) => setQuadrant(event.target.value as Quadrant)}
                className={cn(fieldClass, 'mt-1')}
              >
                {QUADRANTS.map((value) => (
                  <option key={value} value={value}>
                    {QUADRANT_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-muted">
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as TaskStatus)}
                className={cn(fieldClass, 'mt-1')}
              >
                {TASK_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {TASK_STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-muted">
              Owner
              <input
                value={owner}
                onChange={(event) => setOwner(event.target.value)}
                maxLength={120}
                list="task-edit-owners"
                className={cn(fieldClass, 'mt-1')}
              />
            </label>

            <label className="block text-xs font-medium text-muted">
              Tag
              <input
                value={tag}
                onChange={(event) => setTag(event.target.value)}
                maxLength={60}
                className={cn(fieldClass, 'mt-1')}
              />
            </label>
          </div>
          <datalist id="task-edit-owners">
            <option value="self" />
            <option value="outsource" />
          </datalist>
        </div>

        {updateTask.isError && (
          <p role="alert" className="mt-3 text-xs text-danger">
            {updateTask.error.message}
          </p>
        )}

        <footer className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={updateTask.isPending}
            className="rounded-lg border border-line px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-hover hover:text-ink disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim() || updateTask.isPending}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-40"
          >
            {updateTask.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save changes
          </button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}
