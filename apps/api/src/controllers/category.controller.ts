import type { Request, Response } from 'express';
import type { CreateCategoryInput, UpdateCategoryInput } from '@task-manager/shared';
import * as categoryService from '../services/category.service.js';
import { sendCreated, sendData } from '../lib/http.js';
import { validated } from '../middleware/validate.js';

export async function list(req: Request, res: Response) {
  // `?withCounts=true` powers the category view's section headers.
  const categories = await categoryService.listCategories(req.query.withCounts === 'true');
  return sendData(res, categories);
}

export async function getOne(req: Request, res: Response) {
  return sendData(res, await categoryService.getCategory(req.params.id as string));
}

export async function create(req: Request, res: Response) {
  return sendCreated(res, await categoryService.createCategory(validated<CreateCategoryInput>(req)));
}

export async function update(req: Request, res: Response) {
  const category = await categoryService.updateCategory(
    req.params.id as string,
    validated<UpdateCategoryInput>(req),
  );
  return sendData(res, category);
}

export async function remove(req: Request, res: Response) {
  await categoryService.deleteCategory(req.params.id as string);
  return res.status(204).send();
}
