import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { createSessionBody, sessionParams, sessionResponse } from './session.schema.js';
import { createDraftSession, getSessionForUser } from './session.service.js';

export async function sessionRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post(
    '/sessions',
    {
      schema: {
        tags: ['session'],
        summary: 'Create a draft session',
        security: [{ bearerAuth: [] }],
        body: createSessionBody,
        response: { 201: sessionResponse },
      },
      onRequest: app.authenticate,
    },
    async (request, reply) => {
      const session = await createDraftSession(request.user.sub, request.body);
      return reply.code(201).send({ session });
    },
  );

  app.get(
    '/sessions/:sessionId',
    {
      schema: {
        tags: ['session'],
        summary: 'Fetch a session owned by the caller',
        security: [{ bearerAuth: [] }],
        params: sessionParams,
        response: { 200: sessionResponse },
      },
      onRequest: app.authenticate,
    },
    async (request) => {
      const session = await getSessionForUser(request.user.sub, request.params.sessionId);
      return { session };
    },
  );
}
