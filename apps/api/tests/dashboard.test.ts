import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, dayOffset, seedCategory } from './helpers.js';

/**
 * The dashboard endpoints are what the summary cards and the This Week view
 * are built on, so the counts and the list-splitting rules are pinned here.
 */

async function createTask(body: Record<string, unknown>) {
  const response = await request(app)
    .post('/api/tasks')
    .send({ title: 'Task', ...body });
  return response.body.data;
}

describe('GET /api/dashboard/summary', () => {
  it('counts open tasks, excluding completed ones', async () => {
    await createTask({ title: 'Open one' });
    await createTask({ title: 'In progress', status: 'in_progress' });
    const done = await createTask({ title: 'Finished' });
    await request(app).patch(`/api/tasks/${done.id}`).send({ status: 'done' });

    const response = await request(app).get('/api/dashboard/summary');

    expect(response.status).toBe(200);
    expect(response.body.data.totalPending).toBe(2);
    expect(response.body.data.byStatus).toMatchObject({
      pending: 1,
      in_progress: 1,
      done: 1,
    });
  });

  it('separates overdue from due-this-week', async () => {
    await createTask({ title: 'Late', dueDate: dayOffset(-2) });
    await createTask({ title: 'Soon', dueDate: dayOffset(3) });
    await createTask({ title: 'Later', dueDate: dayOffset(30) });

    const response = await request(app).get('/api/dashboard/summary');

    expect(response.body.data.overdue).toBe(1);
    expect(response.body.data.dueThisWeek).toBe(1);
  });

  it('counts a task due today as due this week, not overdue', async () => {
    await createTask({ title: 'Today', dueDate: dayOffset(0) });

    const response = await request(app).get('/api/dashboard/summary');

    expect(response.body.data.dueThisWeek).toBe(1);
    expect(response.body.data.overdue).toBe(0);
  });

  it('reports every quadrant, including the empty ones', async () => {
    await createTask({ title: 'Do now', quadrant: 'urgent_important' });

    const response = await request(app).get('/api/dashboard/summary');

    expect(response.body.data.byQuadrant).toEqual({
      urgent_important: 1,
      urgent_only: 0,
      important_only: 0,
      neither: 0,
    });
  });

  it('groups open tasks by category and labels uncategorised ones', async () => {
    const category = await seedCategory('Cleaning', '#14b8a6');
    await createTask({ title: 'Declutter', categoryId: category.id });
    await createTask({ title: 'Loose end' });

    const response = await request(app).get('/api/dashboard/summary');
    const byCategory = response.body.data.byCategory as Array<{ name: string; count: number }>;

    expect(byCategory).toContainEqual({ categoryId: category.id, name: 'Cleaning', count: 1 });
    expect(byCategory).toContainEqual({ categoryId: null, name: 'Uncategorised', count: 1 });
  });
});

describe('GET /api/dashboard/this-week', () => {
  it('returns a seven-day window starting today', async () => {
    const response = await request(app).get('/api/dashboard/this-week');

    expect(response.body.data.range).toEqual({ from: dayOffset(0), to: dayOffset(6) });
  });

  it('splits overdue, due-soon, and undated urgent work into separate lists', async () => {
    await createTask({ title: 'Late', dueDate: dayOffset(-1) });
    await createTask({ title: 'Soon', dueDate: dayOffset(4) });
    await createTask({ title: 'Urgent but undated', quadrant: 'urgent_important' });
    await createTask({ title: 'Someday', quadrant: 'neither' });

    const { data } = (await request(app).get('/api/dashboard/this-week')).body;

    expect(data.overdue.map((t: { title: string }) => t.title)).toEqual(['Late']);
    expect(data.dueSoon.map((t: { title: string }) => t.title)).toEqual(['Soon']);
    expect(data.urgentImportantUndated.map((t: { title: string }) => t.title)).toEqual([
      'Urgent but undated',
    ]);
  });

  it('keeps a dated urgent+important task out of the undated list', async () => {
    await createTask({
      title: 'Urgent and dated',
      quadrant: 'urgent_important',
      dueDate: dayOffset(1),
    });

    const { data } = (await request(app).get('/api/dashboard/this-week')).body;

    expect(data.dueSoon).toHaveLength(1);
    expect(data.urgentImportantUndated).toHaveLength(0);
  });

  it('omits completed tasks from every list', async () => {
    const task = await createTask({ title: 'Done early', dueDate: dayOffset(2) });
    await request(app).patch(`/api/tasks/${task.id}`).send({ status: 'done' });

    const { data } = (await request(app).get('/api/dashboard/this-week')).body;

    expect(data.dueSoon).toHaveLength(0);
    expect(data.overdue).toHaveLength(0);
  });
});
