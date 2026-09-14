import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodType } from 'zod';
import { ValidationError } from '../lib/errors.js';

type Source = 'body' | 'query' | 'params';

/** Flattens Zod issues into `{ "field.path": ["message"] }` for the client. */
function formatIssues(error: ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}

/**
 * Validates one part of the request and replaces it with the parsed result, so
 * handlers downstream receive coerced, defaulted, fully typed values and never
 * touch `req.body` as `any`.
 *
 * Express 5 makes `req.query` a getter, hence the `defineProperty` rather than
 * a plain assignment.
 */
export function validate<T>(schema: ZodType<T>, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      next(new ValidationError('Request validation failed', formatIssues(result.error)));
      return;
    }

    Object.defineProperty(req, source, {
      value: result.data,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    next();
  };
}

/** Typed accessors, so controllers stay free of casts. */
export function validated<T>(req: Request, source: Source = 'body'): T {
  return req[source] as unknown as T;
}
