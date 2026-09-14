import { Router } from 'express';
import * as controller from '../controllers/dashboard.controller.js';

export const dashboardRouter = Router();

/** Counts for the summary cards. */
dashboardRouter.get('/summary', controller.summary);

/** The next seven days, plus undated Urgent+Important work. */
dashboardRouter.get('/this-week', controller.thisWeek);
