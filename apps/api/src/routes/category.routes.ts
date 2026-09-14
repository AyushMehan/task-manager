import { Router } from 'express';
import { z } from 'zod';
import { createCategorySchema, updateCategorySchema } from '@task-manager/shared';
import * as controller from '../controllers/category.controller.js';
import { validate } from '../middleware/validate.js';

const idParams = z.object({ id: z.uuid('Expected a category id') });

export const categoryRouter = Router();

categoryRouter.get('/', controller.list);
categoryRouter.post('/', validate(createCategorySchema), controller.create);
categoryRouter.get('/:id', validate(idParams, 'params'), controller.getOne);
categoryRouter.patch(
  '/:id',
  validate(idParams, 'params'),
  validate(updateCategorySchema),
  controller.update,
);
categoryRouter.delete('/:id', validate(idParams, 'params'), controller.remove);
