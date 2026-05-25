/**
 * @author alnosila — https://github.com/alnosila
 */

import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
});

export type Logger = typeof logger;
