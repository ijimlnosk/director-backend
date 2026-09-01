import { pino } from 'pino';

import { env } from './config/env.js';

/** Process-wide logger for service-layer code that has no Fastify request. */
export const logger = pino({ level: env.LOG_LEVEL });
