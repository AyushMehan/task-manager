import type { Request, Response } from 'express';
import * as dashboardService from '../services/dashboard.service.js';
import { sendData } from '../lib/http.js';

export async function summary(req: Request, res: Response) {
  return sendData(res, await dashboardService.getSummary(req.userId));
}

export async function thisWeek(req: Request, res: Response) {
  return sendData(res, await dashboardService.getThisWeek(req.userId));
}
