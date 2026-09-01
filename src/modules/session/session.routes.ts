import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { startSessionResponse } from './session.checks.js';
import {
  createSessionBody,
  listSessionsQuery,
  sessionListResponse,
  sessionParams,
  sessionResponse,
} from './session.schema.js';
import {
  abandonSession,
  createDraftSession,
  getSessionForUser,
  listSessions,
  startSession,
} from './session.service.js';

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
    '/sessions',
    {
      schema: {
        tags: ['session'],
        summary: "List the caller's sessions, newest first",
        security: [{ bearerAuth: [] }],
        querystring: listSessionsQuery,
        response: { 200: sessionListResponse },
      },
      onRequest: app.authenticate,
    },
    async (request) => ({ sessions: await listSessions(request.user.sub, request.query) }),
  );

  app.post(
    '/sessions/:sessionId/abandon',
    {
      schema: {
        tags: ['session'],
        summary: 'Abandon an in-progress session',
        security: [{ bearerAuth: [] }],
        params: sessionParams,
        response: { 200: sessionResponse },
      },
      onRequest: app.authenticate,
    },
    async (request) => ({
      session: await abandonSession(request.user.sub, request.params.sessionId),
    }),
  );

  app.post(
    '/sessions/:sessionId/start',
    {
      schema: {
        tags: ['session'],
        summary: 'Run the safety check and activate the session',
        security: [{ bearerAuth: [] }],
        params: sessionParams,
        response: { 200: startSessionResponse },
      },
      onRequest: app.authenticate,
    },
    async (request) => startSession(request.user.sub, request.params.sessionId),
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
