import { Router } from 'express';
import { z } from 'zod';
import {
  bulkUpdateTasksSchema,
  createTaskSchema,
  listTasksQuerySchema,
  updateTaskSchema,
} from '@task-manager/shared';
import * as controller from '../controllers/task.controller.js';
import { validate } from '../middleware/validate.js';

const idParams = z.object({ id: z.uuid('Expected a task id') });

export const taskRouter = Router();

// Declared before `/:id` so "bulk" is not swallowed by the id parameter.
taskRouter.patch('/bulk', validate(bulkUpdateTasksSchema), controller.bulkUpdate);

taskRouter.get('/', validate(listTasksQuerySchema, 'query'), controller.list);
taskRouter.post('/', validate(createTaskSchema), controller.create);

taskRouter.get('/:id', validate(idParams, 'params'), controller.getOne);
taskRouter.patch('/:id', validate(idParams, 'params'), validate(updateTaskSchema), controller.update);
taskRouter.delete('/:id', validate(idParams, 'params'), controller.remove);
