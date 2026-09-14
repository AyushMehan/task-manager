import { Router } from 'express';
import { currentUser } from '../middleware/current-user.js';
import { taskRouter } from './task.routes.js';
import { categoryRouter } from './category.routes.js';
import { dashboardRouter } from './dashboard.routes.js';

export const apiRouter = Router();

// Everything below here is scoped to a user. Today that user comes from the
// environment; swapping in JWT verification happens at this one line.
apiRouter.use(currentUser);

apiRouter.use('/tasks', taskRouter);
apiRouter.use('/categories', categoryRouter);
apiRouter.use('/dashboard', dashboardRouter);
