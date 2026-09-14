import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

/**
 * Single-user mode.
 *
 * Every downstream layer already takes a `userId`, so the only thing standing
 * between this app and real multi-user auth is *this middleware*. Replacing it
 * with one that verifies a JWT and sets `req.userId` from the token is the
 * whole migration — no route, service, or query changes.
 */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

// Resolved once and cached: the owner does not change while the process runs.
let cachedUserId: string | null = null;

export async function resolveDefaultUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId;

  const user = await prisma.user.upsert({
    where: { email: env.DEFAULT_USER_EMAIL },
    update: {},
    create: { email: env.DEFAULT_USER_EMAIL, name: env.DEFAULT_USER_NAME },
  });

  logger.debug({ userId: user.id, email: user.email }, 'Resolved default user');
  cachedUserId = user.id;
  return user.id;
}

export async function currentUser(req: Request, _res: Response, next: NextFunction) {
  try {
    req.userId = await resolveDefaultUserId();
    next();
  } catch (error) {
    next(
      new AppError(503, 'USER_UNAVAILABLE', 'Could not resolve the current user', {
        cause: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}
