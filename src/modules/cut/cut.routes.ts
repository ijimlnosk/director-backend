import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { cutParams, cutResponse } from './cut.schema.js';
import { endSession, getCut } from './cut.service.js';

export async function cutRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post(
    '/sessions/:sessionId/end',
    {
      schema: {
        tags: ['cut'],
        summary: 'End an active session and build its End Credits',
        security: [{ bearerAuth: [] }],
        params: cutParams,
        response: { 201: cutResponse },
      },
      onRequest: app.authenticate,
    },
    async (request, reply) => {
      const cut = await endSession(request.user.sub, request.params.sessionId);
      return reply.code(201).send({ cut });
    },
  );

  app.get(
    '/sessions/:sessionId/cut',
    {
      schema: {
        tags: ['cut'],
        summary: 'Fetch a session End Credits',
        security: [{ bearerAuth: [] }],
        params: cutParams,
        response: { 200: cutResponse },
      },
      onRequest: app.authenticate,
    },
    async (request) => {
      const cut = await getCut(request.user.sub, request.params.sessionId);
      return { cut };
    },
  );
}
