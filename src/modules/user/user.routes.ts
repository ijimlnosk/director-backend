import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { issueForUser } from '../auth/auth.service.js';
import { notFound } from '../../shared/errors/app-error.js';
import {
  meResponse,
  preferencesResponse,
  registerDeviceBody,
  registerDeviceResponse,
  setPreferencesBody,
  updateMeBody,
} from './user.schema.js';
import {
  findUserById,
  getUserPreferences,
  liveAreaExists,
  replaceUserPreferences,
  updateUser,
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
      const tokens = await issueForUser(app, user.id);
      return reply.code(201).send({ ...tokens, user });
    },
  );

  app.get(
    '/users/me',
    {
      schema: {
        tags: ['user'],
        summary: 'The caller\'s profile',
        security: [{ bearerAuth: [] }],
        response: { 200: meResponse },
      },
      onRequest: app.authenticate,
    },
    async (request) => {
      const user = await findUserById(request.user.sub);
      if (user === undefined) throw notFound('user');
      return { user };
    },
  );

  app.patch(
    '/users/me',
    {
      schema: {
        tags: ['user'],
        summary: 'Update handle and/or home area',
        security: [{ bearerAuth: [] }],
        body: updateMeBody,
        response: { 200: meResponse },
      },
      onRequest: app.authenticate,
    },
    async (request) => {
      if (request.body.homeAreaId != null && !(await liveAreaExists(request.body.homeAreaId))) {
        throw notFound('area');
      }
      return { user: await updateUser(request.user.sub, request.body) };
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
