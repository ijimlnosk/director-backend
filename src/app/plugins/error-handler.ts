import type { FastifyError, FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

import { AppError } from '../../shared/errors/app-error.js';

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

/** Maps thrown errors to a stable `{ error: { code, message } }` contract. */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof AppError) {
      const body: ErrorBody = { error: { code: error.kind, message: error.message } };
      if (error.details !== undefined) body.error.details = error.details;
      return reply.code(error.statusCode).send(body);
    }

    if (error instanceof ZodError) {
      return reply.code(400).send({
        error: { code: 'VALIDATION', message: 'Request validation failed', details: error.issues },
      } satisfies ErrorBody);
    }

    if (error.validation) {
      return reply.code(400).send({
        error: { code: 'VALIDATION', message: error.message, details: error.validation },
      } satisfies ErrorBody);
    }

    if (error.statusCode === 401) {
      return reply.code(401).send({
        error: { code: 'AUTHENTICATION', message: 'Authentication required' },
      } satisfies ErrorBody);
    }

    request.log.error(error);
    return reply.code(500).send({
      error: { code: 'INTERNAL', message: 'Internal server error' },
    } satisfies ErrorBody);
  });
}
