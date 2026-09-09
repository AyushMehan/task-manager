import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '../lib/prisma.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { isProduction } from '../config/env.js';

/** Shape of every failure response: `{ error: { code, message, details? } }`. */
type ErrorBody = {
  error: { code: string; message: string; details?: unknown };
};

/**
 * Translates Prisma's error codes into HTTP. Keeping this here is what lets
 * services throw domain errors (or let Prisma throw) without any layer below
 * the transport knowing about status codes.
 */
function fromPrisma(error: Prisma.PrismaClientKnownRequestError): AppError | null {
  switch (error.code) {
    case 'P2025': // Record required but not found
      return new AppError(404, 'NOT_FOUND', 'The requested record does not exist');
    case 'P2002': {
      // Unique constraint violation
      const target = (error.meta?.target as string[] | undefined)?.join(', ');
      return new AppError(
        409,
        'CONFLICT',
        target ? `A record with that ${target} already exists` : 'That record already exists',
      );
    }
    case 'P2003': // Foreign key constraint violation
      return new AppError(400, 'BAD_REQUEST', 'A referenced record does not exist');
    default:
      return null;
  }
}

export function notFoundHandler(req: Request, res: Response<ErrorBody>) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Cannot ${req.method} ${req.path}` },
  });
}

// Express identifies error middleware by arity, so `next` must stay declared
// even though this is the last handler in the chain.
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response<ErrorBody>,
  _next: NextFunction,
) {
  let appError: AppError | null = error instanceof AppError ? error : null;

  if (!appError && error instanceof Prisma.PrismaClientKnownRequestError) {
    appError = fromPrisma(error);
  }

  if (appError) {
    if (appError.statusCode >= 500) logger.error({ err: error }, appError.message);
    else logger.warn({ code: appError.code, details: appError.details }, appError.message);

    res.status(appError.statusCode).json({
      error: {
        code: appError.code,
        message: appError.message,
        ...(appError.details === undefined ? {} : { details: appError.details }),
      },
    });
    return;
  }

  // Anything reaching here is unexpected: log it in full, tell the client
  // nothing that could leak internals.
  logger.error({ err: error }, 'Unhandled error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong',
      ...(isProduction ? {} : { details: error instanceof Error ? error.message : String(error) }),
    },
  });
}
