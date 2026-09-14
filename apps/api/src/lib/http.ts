import type { Response } from 'express';

/**
 * Every successful response is `{ data, meta? }`. A stable envelope means a
 * client — the web app now, a mobile app later — can unwrap responses in one
 * place instead of special-casing each endpoint.
 */
export function sendData<T>(res: Response, data: T, meta?: Record<string, unknown>, status = 200) {
  return res.status(status).json(meta ? { data, meta } : { data });
}

export function sendCreated<T>(res: Response, data: T, meta?: Record<string, unknown>) {
  return sendData(res, data, meta, 201);
}
