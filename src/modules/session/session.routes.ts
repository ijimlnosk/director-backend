import type { FastifyInstance } from 'fastify';

import { createSessionBody, sessionParams } from './session.schema.js';
import { createDraftSession, getSessionForUser } from './session.service.js';

export async function sessionRoutes(app: FastifyInstance): Promise<void> {
  app.post('/sessions', { preHandler: app.authenticate }, async (request, reply) => {
    const input = createSessionBody.parse(request.body);
    const session = await createDraftSession(request.user.sub, input);
    return reply.code(201).send({ session });
  });

  app.get('/sessions/:sessionId', { preHandler: app.authenticate }, async (request) => {
    const { sessionId } = sessionParams.parse(request.params);
    const session = await getSessionForUser(request.user.sub, sessionId);
    return { session };
  });
}
