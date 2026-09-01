import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { z } from 'zod';

import {
  joinSessionBody,
  participantsResponse,
  sessionIdParams,
} from './participant.schema.js';
import { getParticipants, joinSession, leaveSession } from './participant.service.js';

const joinResponse = z.object({
  sessionId: z.uuid(),
  participants: participantsResponse.shape.participants,
});

export async function participantRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post(
    '/sessions/join',
    {
      schema: {
        tags: ['participant'],
        summary: 'Join a session by its invite code',
        security: [{ bearerAuth: [] }],
        body: joinSessionBody,
        response: { 200: joinResponse },
      },
      onRequest: app.authenticate,
    },
    async (request) => joinSession(request.user.sub, request.body.inviteCode),
  );

  app.get(
    '/sessions/:sessionId/participants',
    {
      schema: {
        tags: ['participant'],
        summary: 'List the participants of a session',
        security: [{ bearerAuth: [] }],
        params: sessionIdParams,
        response: { 200: participantsResponse },
      },
      onRequest: app.authenticate,
    },
    async (request) => ({
      participants: await getParticipants(request.user.sub, request.params.sessionId),
    }),
  );

  app.post(
    '/sessions/:sessionId/leave',
    {
      schema: {
        tags: ['participant'],
        summary: 'Leave a session (members only)',
        security: [{ bearerAuth: [] }],
        params: sessionIdParams,
        response: { 200: participantsResponse },
      },
      onRequest: app.authenticate,
    },
    async (request) => ({
      participants: await leaveSession(request.user.sub, request.params.sessionId),
    }),
  );
}
