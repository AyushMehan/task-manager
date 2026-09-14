import type { Request, Response } from 'express';
import type {
  BulkUpdateTasksInput,
  CreateTaskInput,
  ListTasksQuery,
  UpdateTaskInput,
} from '@task-manager/shared';
import * as taskService from '../services/task.service.js';
import { sendCreated, sendData } from '../lib/http.js';
import { validated } from '../middleware/validate.js';

/**
 * Controllers translate HTTP to service calls and back — no business rules and
 * no database access. Express 5 forwards rejected promises to the error
 * middleware on its own, so none of these need a try/catch.
 */

export async function list(req: Request, res: Response) {
  const query = validated<ListTasksQuery>(req, 'query');
  const { data, meta } = await taskService.listTasks(req.userId, query);
  return sendData(res, data, meta);
}

export async function getOne(req: Request, res: Response) {
  const task = await taskService.getTask(req.userId, req.params.id as string);
  return sendData(res, task);
}

export async function create(req: Request, res: Response) {
  const task = await taskService.createTask(req.userId, validated<CreateTaskInput>(req));
  return sendCreated(res, task);
}

export async function update(req: Request, res: Response) {
  const task = await taskService.updateTask(
    req.userId,
    req.params.id as string,
    validated<UpdateTaskInput>(req),
  );
  return sendData(res, task);
}

export async function remove(req: Request, res: Response) {
  await taskService.deleteTask(req.userId, req.params.id as string);
  return res.status(204).send();
}

export async function bulkUpdate(req: Request, res: Response) {
  const { updated, skipped } = await taskService.bulkUpdateTasks(
    req.userId,
    validated<BulkUpdateTasksInput>(req),
  );
  return sendData(res, updated, { updatedCount: updated.length, skipped });
}
