import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { signUserToken } from '../../app/plugins/auth.js';
import { registerDeviceBody, registerDeviceResponse } from './user.schema.js';
import { upsertUserByDeviceId } from './user.repository.js';

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
}
