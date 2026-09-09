import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app, seedCategory } from './helpers.js';

describe('categories', () => {
  it('creates a category and appends it to the end of the list', async () => {
    await seedCategory('Cleaning');

    const response = await request(app).post('/api/categories').send({ name: 'Aspirational' });

    expect(response.status).toBe(201);
    expect(response.body.data.sortOrder).toBeGreaterThan(10);
  });

  it('refuses a duplicate name regardless of casing', async () => {
    await seedCategory('Cleaning');

    const response = await request(app).post('/api/categories').send({ name: 'cleaning' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
  });

  it('rejects a malformed colour', async () => {
    const response = await request(app)
      .post('/api/categories')
      .send({ name: 'Bad colour', color: 'blue' });

    expect(response.status).toBe(422);
  });

  it('returns categories in sort order', async () => {
    await request(app).post('/api/categories').send({ name: 'First' });
    await request(app).post('/api/categories').send({ name: 'Second' });

    const response = await request(app).get('/api/categories');

    expect(response.body.data.map((c: { name: string }) => c.name)).toEqual(['First', 'Second']);
  });

  it('includes task counts on request, for the category view headers', async () => {
    const category = await seedCategory('Household / Home Admin');
    await request(app).post('/api/tasks').send({ title: 'Bins', categoryId: category.id });

    const without = await request(app).get('/api/categories');
    const with_ = await request(app).get('/api/categories?withCounts=true');

    expect(without.body.data[0].taskCount).toBeUndefined();
    expect(with_.body.data[0].taskCount).toBe(1);
  });

  it('renames a category without disturbing its tasks', async () => {
    const category = await seedCategory('Old name');
    await request(app).post('/api/tasks').send({ title: 'Bins', categoryId: category.id });

    await request(app).patch(`/api/categories/${category.id}`).send({ name: 'New name' });

    const tasks = await request(app).get('/api/tasks');
    expect(tasks.body.data[0].category.name).toBe('New name');
  });

  it('leaves tasks in place as uncategorised when a category is deleted', async () => {
    const category = await seedCategory('Temporary');
    await request(app).post('/api/tasks').send({ title: 'Survivor', categoryId: category.id });

    expect((await request(app).delete(`/api/categories/${category.id}`)).status).toBe(204);

    const tasks = await request(app).get('/api/tasks');
    expect(tasks.body.data).toHaveLength(1);
    expect(tasks.body.data[0]).toMatchObject({ title: 'Survivor', categoryId: null });
  });

  it('404s when deleting a category that does not exist', async () => {
    const response = await request(app).delete(
      '/api/categories/00000000-0000-4000-8000-000000000000',
    );

    expect(response.status).toBe(404);
  });
});

describe('GET /health', () => {
  it('reports the database is reachable', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok', database: 'up' });
  });
});
