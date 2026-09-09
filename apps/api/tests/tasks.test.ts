import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, dayOffset, seedCategory } from './helpers.js';

describe('POST /api/tasks', () => {
  it('creates a task from a title alone, applying defaults', async () => {
    const response = await request(app).post('/api/tasks').send({ title: 'Call the accountant' });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      title: 'Call the accountant',
      quadrant: 'neither',
      status: 'pending',
      dueDate: null,
      categoryId: null,
      completedAt: null,
    });
  });

  it('rejects a blank title', async () => {
    const response = await request(app).post('/api/tasks').send({ title: '   ' });

    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.title).toContain('Title is required');
  });

  it('stores blank optional text as null rather than an empty string', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({ title: 'Tidy the loft', notes: '   ', owner: '', tag: '  ' });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ notes: null, owner: null, tag: null });
  });

  it('round-trips a due date without timezone drift', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({ title: 'Renew insurance', dueDate: '2026-09-02' });

    expect(response.body.data.dueDate).toBe('2026-09-02');
  });

  it('rejects a category that does not exist', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .send({ title: 'Orphan', categoryId: '00000000-0000-4000-8000-000000000000' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('embeds the category so the UI can render a chip without a second request', async () => {
    const category = await seedCategory();
    const response = await request(app)
      .post('/api/tasks')
      .send({ title: 'Buy bin bags', categoryId: category.id });

    expect(response.body.data.category).toMatchObject({
      id: category.id,
      name: category.name,
      color: category.color,
    });
  });
});

describe('PATCH /api/tasks/:id', () => {
  async function createTask(body: Record<string, unknown> = {}) {
    const response = await request(app)
      .post('/api/tasks')
      .send({ title: 'A task', ...body });
    return response.body.data;
  }

  it('stamps completedAt when a task is marked done', async () => {
    const task = await createTask();
    const response = await request(app).patch(`/api/tasks/${task.id}`).send({ status: 'done' });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('done');
    expect(response.body.data.completedAt).not.toBeNull();
  });

  it('clears completedAt when a done task is reopened', async () => {
    const task = await createTask();
    await request(app).patch(`/api/tasks/${task.id}`).send({ status: 'done' });

    const response = await request(app).patch(`/api/tasks/${task.id}`).send({ status: 'pending' });

    expect(response.body.data.completedAt).toBeNull();
  });

  it('leaves unmentioned fields untouched', async () => {
    const task = await createTask({ notes: 'Ring after 6pm', owner: 'self' });
    const response = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .send({ quadrant: 'urgent_important' });

    expect(response.body.data).toMatchObject({
      quadrant: 'urgent_important',
      notes: 'Ring after 6pm',
      owner: 'self',
    });
  });

  it('clears a field when the client sends an explicit null', async () => {
    const task = await createTask({ dueDate: dayOffset(3) });
    const response = await request(app).patch(`/api/tasks/${task.id}`).send({ dueDate: null });

    expect(response.body.data.dueDate).toBeNull();
  });

  it('404s for an unknown id', async () => {
    const response = await request(app)
      .patch('/api/tasks/00000000-0000-4000-8000-000000000000')
      .send({ status: 'done' });

    expect(response.status).toBe(404);
  });

  it('422s on a malformed id', async () => {
    const response = await request(app).patch('/api/tasks/not-a-uuid').send({ status: 'done' });

    expect(response.status).toBe(422);
  });
});

describe('GET /api/tasks', () => {
  async function seedTasks() {
    const category = await seedCategory();
    await request(app)
      .post('/api/tasks')
      .send({ title: 'Overdue thing', dueDate: dayOffset(-3), quadrant: 'urgent_important' });
    await request(app)
      .post('/api/tasks')
      .send({ title: 'Due soon', dueDate: dayOffset(2), categoryId: category.id });
    await request(app)
      .post('/api/tasks')
      .send({ title: 'Undated', quadrant: 'important_only', owner: 'Outsource' });
    return category;
  }

  it('filters by quadrant', async () => {
    await seedTasks();
    const response = await request(app).get('/api/tasks?quadrant=urgent_important');

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].title).toBe('Overdue thing');
  });

  it('accepts a repeated filter as a set', async () => {
    await seedTasks();
    const response = await request(app).get(
      '/api/tasks?quadrant=urgent_important&quadrant=important_only',
    );

    expect(response.body.data).toHaveLength(2);
  });

  it('sorts undated tasks last regardless of direction', async () => {
    await seedTasks();
    const response = await request(app).get('/api/tasks?sort=dueDate&order=asc');

    expect(response.body.data.map((task: { title: string }) => task.title)).toEqual([
      'Overdue thing',
      'Due soon',
      'Undated',
    ]);
  });

  it('finds overdue tasks and excludes completed ones', async () => {
    await seedTasks();
    const overdue = await request(app).get('/api/tasks?overdue=true');
    expect(overdue.body.data).toHaveLength(1);

    await request(app).patch(`/api/tasks/${overdue.body.data[0].id}`).send({ status: 'done' });

    const after = await request(app).get('/api/tasks?overdue=true');
    expect(after.body.data).toHaveLength(0);
  });

  it('searches title and notes case-insensitively', async () => {
    await request(app).post('/api/tasks').send({ title: 'Sort the Drive', notes: 'photos' });
    const byTitle = await request(app).get('/api/tasks?search=drive');
    const byNotes = await request(app).get('/api/tasks?search=PHOTOS');

    expect(byTitle.body.data).toHaveLength(1);
    expect(byNotes.body.data).toHaveLength(1);
  });

  it('paginates and reports totals', async () => {
    await seedTasks();
    const response = await request(app).get('/api/tasks?pageSize=2&page=1');

    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta).toMatchObject({ page: 1, pageSize: 2, total: 3, totalPages: 2 });
  });

  it('rejects an out-of-range page size', async () => {
    const response = await request(app).get('/api/tasks?pageSize=5000');
    expect(response.status).toBe(422);
  });
});

describe('PATCH /api/tasks/bulk', () => {
  it('reclassifies many tasks at once', async () => {
    const first = await request(app).post('/api/tasks').send({ title: 'One' });
    const second = await request(app).post('/api/tasks').send({ title: 'Two' });

    const response = await request(app)
      .patch('/api/tasks/bulk')
      .send({
        ids: [first.body.data.id, second.body.data.id],
        patch: { quadrant: 'important_only', owner: 'Ayush' },
      });

    expect(response.status).toBe(200);
    expect(response.body.meta.updatedCount).toBe(2);
    for (const task of response.body.data) {
      expect(task).toMatchObject({ quadrant: 'important_only', owner: 'Ayush' });
    }
  });

  it('stamps completedAt across a bulk completion', async () => {
    const task = await request(app).post('/api/tasks').send({ title: 'One' });
    const response = await request(app)
      .patch('/api/tasks/bulk')
      .send({ ids: [task.body.data.id], patch: { status: 'done' } });

    expect(response.body.data[0].completedAt).not.toBeNull();
  });

  it('reports ids it did not update instead of failing the batch', async () => {
    const task = await request(app).post('/api/tasks').send({ title: 'One' });
    const unknown = '00000000-0000-4000-8000-000000000000';

    const response = await request(app)
      .patch('/api/tasks/bulk')
      .send({ ids: [task.body.data.id, unknown], patch: { status: 'done' } });

    expect(response.body.meta.updatedCount).toBe(1);
    expect(response.body.meta.skipped).toEqual([unknown]);
  });

  it('requires at least one id and one field', async () => {
    const noIds = await request(app)
      .patch('/api/tasks/bulk')
      .send({ ids: [], patch: { status: 'done' } });
    const noPatch = await request(app)
      .patch('/api/tasks/bulk')
      .send({ ids: ['00000000-0000-4000-8000-000000000000'], patch: {} });

    expect(noIds.status).toBe(422);
    expect(noPatch.status).toBe(422);
  });
});

describe('DELETE /api/tasks/:id', () => {
  it('removes the task and then 404s', async () => {
    const task = await request(app).post('/api/tasks').send({ title: 'Temporary' });

    expect((await request(app).delete(`/api/tasks/${task.body.data.id}`)).status).toBe(204);
    expect((await request(app).get(`/api/tasks/${task.body.data.id}`)).status).toBe(404);
  });
});
