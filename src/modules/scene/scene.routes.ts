import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import {
  completeSceneBody,
  nextSceneParams,
  sceneIdParams,
  sceneResponse,
  sceneResultResponse,
  skipSceneBody,
} from './scene.schema.js';
import { generateNextScene } from './scene.service.js';
import { completeScene, skipScene } from './scene.resolve.service.js';

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
      onRequest: app.authenticate,
    },
    async (request, reply) => {
      const scene = await generateNextScene(request.user.sub, request.params.sessionId);
      return reply.code(201).send({ scene });
    },
  );

  app.post(
    '/scenes/:sceneId/complete',
    {
      schema: {
        tags: ['scene'],
        summary: 'Verify arrival and complete a scene',
        security: [{ bearerAuth: [] }],
        params: sceneIdParams,
        body: completeSceneBody,
        response: { 201: sceneResultResponse },
      },
      onRequest: app.authenticate,
    },
    async (request, reply) => {
      const result = await completeScene(request.user.sub, request.params.sceneId, request.body);
      return reply.code(201).send({ result });
    },
  );

  app.post(
    '/scenes/:sceneId/skip',
    {
      schema: {
        tags: ['scene'],
        summary: 'Skip a scene with a reason',
        security: [{ bearerAuth: [] }],
        params: sceneIdParams,
        body: skipSceneBody,
        response: { 201: sceneResultResponse },
      },
      onRequest: app.authenticate,
    },
    async (request, reply) => {
      const result = await skipScene(request.user.sub, request.params.sceneId, request.body);
      return reply.code(201).send({ result });
    },
  );
}
