'use client';

import { useRef, useState } from 'react';
import { Check, Loader2, Plus, X } from 'lucide-react';
import { QUADRANTS, QUADRANT_LABELS, type Quadrant } from '@task-manager/shared';
import { useCategories, useCreateCategory, useCreateTask } from '@/hooks/use-tasks';
import { cn } from '@/lib/utils';

const fieldClass =
  'rounded-lg border border-line bg-surface px-2 py-1.5 text-xs outline-none transition-colors focus:border-accent';

/**
 * Add form.
 *
 * Title stays a single Enter-to-submit field, but category and quadrant sit
 * right under it rather than behind a toggle: an unclassified backlog is just
 * a long list, so the two fields that give it structure should cost nothing to
 * reach. Notes, owner, and tag are the genuinely rare ones and stay collapsed.
 */
export function QuickAdd() {
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [quadrant, setQuadrant] = useState<Quadrant>('neither');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [owner, setOwner] = useState('');
  const [tag, setTag] = useState('');

  const [showMore, setShowMore] = useState(false);
  const [newCategory, setNewCategory] = useState<string | null>(null);

  const titleRef = useRef<HTMLInputElement>(null);
  const newCategoryRef = useRef<HTMLInputElement>(null);

  const { data: categories } = useCategories();
  const createTask = useCreateTask();
  const createCategory = useCreateCategory();

  function reset() {
    setTitle('');
    setDueDate('');
    setNotes('');
    setOwner('');
    // Category, quadrant, and tag persist: brain-dumping happens in runs of
    // related tasks, so the previous choice is more often right than a reset.
    titleRef.current?.focus();
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || createTask.isPending) return;

    createTask.mutate(
      {
        title: trimmed,
        quadrant,
        ...(categoryId ? { categoryId } : {}),
        ...(dueDate ? { dueDate } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(owner.trim() ? { owner: owner.trim() } : {}),
        ...(tag.trim() ? { tag: tag.trim() } : {}),
      },
      { onSuccess: reset },
    );
  }

  function confirmNewCategory() {
    const name = newCategory?.trim();
    if (!name || createCategory.isPending) return;

    createCategory.mutate(
      { name },
      {
        onSuccess: (category) => {
          setCategoryId(category.id);
          setNewCategory(null);
          titleRef.current?.focus();
        },
      },
    );
  }

  return (
    <form onSubmit={submit} className="card rounded-xl p-3">
      <div className="flex items-center gap-2">
        <input
          ref={titleRef}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Add a task and press Enter…"
          aria-label="Task title"
          autoFocus
          className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-faint"
        />
        <button
          type="submit"
          disabled={!title.trim() || createTask.isPending}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-40"
        >
          {createTask.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Add</span>
        </button>
      </div>

      {/* Always visible: the fields that make the backlog navigable. */}
      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-2">
        {newCategory === null ? (
          <select
            value={categoryId}
            onChange={(event) => {
              if (event.target.value === '__new') {
                setNewCategory('');
                // Focus after the input has replaced the select.
                requestAnimationFrame(() => newCategoryRef.current?.focus());
              } else {
                setCategoryId(event.target.value);
              }
            }}
            aria-label="Category"
            className={cn(fieldClass, categoryId && 'border-accent/60 font-medium')}
          >
            <option value="">No category</option>
            {categories?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
            <option value="__new">+ New category…</option>
          </select>
        ) : (
          <span className="flex items-center gap-1">
            <input
              ref={newCategoryRef}
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              onKeyDown={(event) => {
                // Enter here must not submit the task itself.
                if (event.key === 'Enter') {
                  event.preventDefault();
                  confirmNewCategory();
                }
                if (event.key === 'Escape') setNewCategory(null);
              }}
              placeholder="New category name"
              aria-label="New category name"
              className={cn(fieldClass, 'w-40')}
            />
            <button
              type="button"
              onClick={confirmNewCategory}
              disabled={!newCategory.trim() || createCategory.isPending}
              aria-label="Create category"
              className="rounded-lg p-1.5 text-success hover:bg-surface-hover disabled:opacity-40"
            >
              {createCategory.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setNewCategory(null)}
              aria-label="Cancel new category"
              className="rounded-lg p-1.5 text-muted hover:bg-surface-hover"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        )}

        <select
          value={quadrant}
          onChange={(event) => setQuadrant(event.target.value as Quadrant)}
          aria-label="Quadrant"
          className={cn(fieldClass, quadrant !== 'neither' && 'border-accent/60 font-medium')}
        >
          {QUADRANTS.map((value) => (
            <option key={value} value={value}>
              {QUADRANT_LABELS[value]}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={dueDate}
          onChange={(event) => setDueDate(event.target.value)}
          aria-label="Due date"
          className={cn(fieldClass, dueDate && 'border-accent/60 font-medium')}
        />

        <button
          type="button"
          onClick={() => setShowMore((value) => !value)}
          aria-expanded={showMore}
          className="rounded-lg px-2 py-1.5 text-xs text-muted transition-colors hover:bg-surface-hover hover:text-ink"
        >
          {showMore ? 'Fewer fields' : 'Notes, owner, tag'}
        </button>
      </div>

      {showMore && (
        <div className="mt-2 flex flex-wrap items-start gap-2 border-t border-line pt-2">
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Notes"
            aria-label="Notes"
            rows={2}
            className={cn(fieldClass, 'min-w-[12rem] flex-1 resize-y')}
          />
          <input
            value={owner}
            onChange={(event) => setOwner(event.target.value)}
            placeholder="Owner (self, outsource…)"
            aria-label="Owner"
            list="quick-add-owners"
            className={cn(fieldClass, 'w-44')}
          />
          <datalist id="quick-add-owners">
            <option value="self" />
            <option value="outsource" />
          </datalist>
          <input
            value={tag}
            onChange={(event) => setTag(event.target.value)}
            placeholder="Tag"
            aria-label="Tag"
            className={cn(fieldClass, 'w-32')}
          />
        </div>
      )}

      {(createTask.isError || createCategory.isError) && (
        <p className="mt-2 px-2 text-xs text-danger">
          {createTask.error?.message ?? createCategory.error?.message}
        </p>
      )}
    </form>
  );
}
