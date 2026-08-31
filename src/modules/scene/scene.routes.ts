import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { nextSceneParams, sceneResponse } from './scene.schema.js';
import { generateNextScene } from './scene.service.js';

export async function sceneRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post(
    '/sessions/:sessionId/scenes/next',
    {
      schema: {
        tags: ['scene'],
        summary: 'Generate the next scene for a session (deterministic, no AI)',
        security: [{ bearerAuth: [] }],
        params: nextSceneParams,
        response: { 201: sceneResponse },
      },
      preHandler: app.authenticate,
    },
    async (request, reply) => {
      const scene = await generateNextScene(request.user.sub, request.params.sessionId);
      return reply.code(201).send({ scene });
    },
  );
}
