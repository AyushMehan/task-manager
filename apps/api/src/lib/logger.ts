import { pino } from 'pino';
import { env, isProduction } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  // Structured JSON in production; readable lines while developing.
  transport: isProduction ? undefined : { target: 'pino-pretty', options: { colorize: true } },
});
