import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import {
  abortSceneBody,
  completeSceneBody,
  currentSceneResponse,
  extendSceneBody,
  nextSceneParams,
  sceneIdParams,
  sceneListResponse,
  sceneResponse,
  sceneResultResponse,
  sessionScenesParams,
  skipSceneBody,
  vetoSceneBody,
} from './scene.schema.js';
import { generateNextScene, getCurrentScene, listSessionScenes } from './scene.service.js';
import {
  abortScene,
  completeScene,
  extendScene,
  skipScene,
  vetoScene,
} from './scene.resolve.service.js';

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

  app.get(
    '/sessions/:sessionId/scenes',
    {
      schema: {
        tags: ['scene'],
        summary: 'All scenes of a session so far, with outcomes',
        security: [{ bearerAuth: [] }],
        params: sessionScenesParams,
        response: { 200: sceneListResponse },
      },
      onRequest: app.authenticate,
    },
    async (request) => ({
      scenes: await listSessionScenes(request.user.sub, request.params.sessionId),
    }),
  );

  app.get(
    '/sessions/:sessionId/scenes/current',
    {
      schema: {
        tags: ['scene'],
        summary: 'The scene to resume (latest unresolved), or null',
        security: [{ bearerAuth: [] }],
        params: sessionScenesParams,
        response: { 200: currentSceneResponse },
      },
      onRequest: app.authenticate,
    },
    async (request) => ({
      scene: await getCurrentScene(request.user.sub, request.params.sessionId),
    }),
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

  app.post(
    '/scenes/:sceneId/veto',
    {
      schema: {
        tags: ['scene'],
        summary: 'Veto a scene\'s place and/or category for this user',
        security: [{ bearerAuth: [] }],
        params: sceneIdParams,
        body: vetoSceneBody,
        response: { 201: sceneResultResponse },
      },
      onRequest: app.authenticate,
    },
    async (request, reply) => {
      const result = await vetoScene(request.user.sub, request.params.sceneId, request.body);
      return reply.code(201).send({ result });
    },
  );

  app.post(
    '/scenes/:sceneId/extend',
    {
      schema: {
        tags: ['scene'],
        summary: 'Add time to a live scene (server owns the deadline)',
        security: [{ bearerAuth: [] }],
        params: sceneIdParams,
        body: extendSceneBody,
        response: { 200: sceneResponse },
      },
      onRequest: app.authenticate,
    },
    async (request) => ({
      scene: await extendScene(request.user.sub, request.params.sceneId, request.body),
    }),
  );

  app.post(
    '/scenes/:sceneId/abort',
    {
      schema: {
        tags: ['scene'],
        summary: 'Abort a live scene (recorded as aborted, not completed)',
        security: [{ bearerAuth: [] }],
        params: sceneIdParams,
        body: abortSceneBody,
        response: { 201: sceneResultResponse },
      },
      onRequest: app.authenticate,
    },
    async (request, reply) => {
      const result = await abortScene(request.user.sub, request.params.sceneId, request.body);
      return reply.code(201).send({ result });
    },
  );
}
