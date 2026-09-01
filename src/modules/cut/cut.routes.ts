import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import {
  cutParams,
  cutResponse,
  shareResponse,
  slugParams,
  unshareResponse,
} from './cut.schema.js';
import {
  endSession,
  getCut,
  getSharedCut,
  shareCut,
  unshareCut,
} from './cut.service.js';

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
    async (request) => ({ cut: await getCut(request.user.sub, request.params.sessionId) }),
  );

  app.post(
    '/sessions/:sessionId/cut/share',
    {
      schema: {
        tags: ['cut'],
        summary: 'Make the Cut shareable via a link',
        security: [{ bearerAuth: [] }],
        params: cutParams,
        response: { 200: shareResponse },
      },
      onRequest: app.authenticate,
    },
    async (request) => shareCut(request.user.sub, request.params.sessionId),
  );

  app.delete(
    '/sessions/:sessionId/cut/share',
    {
      schema: {
        tags: ['cut'],
        summary: 'Revoke link sharing for the Cut',
        security: [{ bearerAuth: [] }],
        params: cutParams,
        response: { 200: unshareResponse },
      },
      onRequest: app.authenticate,
    },
    async (request) => unshareCut(request.user.sub, request.params.sessionId),
  );

  app.get(
    '/cuts/:slug',
    {
      schema: {
        tags: ['cut'],
        summary: 'Public read of a shared Cut',
        params: slugParams,
        response: { 200: cutResponse },
      },
    },
    async (request) => ({ cut: await getSharedCut(request.params.slug) }),
  );
}
