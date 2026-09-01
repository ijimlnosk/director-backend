import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { signUserToken } from '../../app/plugins/auth.js';
import {
  preferencesResponse,
  registerDeviceBody,
  registerDeviceResponse,
  setPreferencesBody,
} from './user.schema.js';
import {
  getUserPreferences,
  replaceUserPreferences,
  upsertUserByDeviceId,
} from './user.repository.js';

export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post(
    '/users',
    {
      schema: {
        tags: ['auth'],
        summary: 'Register a device and receive a bearer token',
        body: registerDeviceBody,
        response: { 201: registerDeviceResponse },
      },
    },
    async (request, reply) => {
      const user = await upsertUserByDeviceId(request.body);
      const token = signUserToken(app, user.id);
      return reply.code(201).send({ token, user });
    },
  );

  app.get(
    '/users/me/preferences',
    {
      schema: {
        tags: ['user'],
        summary: 'Read the caller\'s category preferences',
        security: [{ bearerAuth: [] }],
        response: { 200: preferencesResponse },
      },
      onRequest: app.authenticate,
    },
    async (request) => ({ preferences: await getUserPreferences(request.user.sub) }),
  );

  app.put(
    '/users/me/preferences',
    {
      schema: {
        tags: ['user'],
        summary: 'Replace the caller\'s liked / disliked categories',
        security: [{ bearerAuth: [] }],
        body: setPreferencesBody,
        response: { 200: preferencesResponse },
      },
      onRequest: app.authenticate,
    },
    async (request) => {
      await replaceUserPreferences(request.user.sub, request.body.liked, request.body.disliked);
      return { preferences: await getUserPreferences(request.user.sub) };
    },
  );
}
