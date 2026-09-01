import type { FastifyRequest } from 'fastify';

import { env } from './config/env.js';
import { AppError } from './errors/app-error.js';

/** Gate a route behind the x-admin-token header. */
export function requireAdmin(request: FastifyRequest): void {
  if (env.ADMIN_TOKEN === undefined) {
    throw new AppError('PROVIDER_FAILED', 'Admin operations are disabled (ADMIN_TOKEN unset)');
  }
  if (request.headers['x-admin-token'] !== env.ADMIN_TOKEN) {
    throw new AppError('AUTHENTICATION', 'Invalid admin token');
  }
}
