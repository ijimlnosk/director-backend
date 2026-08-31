import type { FastifyInstance } from 'fastify';

import { signUserToken } from '../../app/plugins/auth.js';
import { registerDeviceBody } from './user.schema.js';
import { upsertUserByDeviceId } from './user.repository.js';

export async function userRoutes(app: FastifyInstance): Promise<void> {
  app.post('/users', async (request, reply) => {
    const input = registerDeviceBody.parse(request.body);
    const user = await upsertUserByDeviceId(input);
    const token = signUserToken(app, user.id);
    return reply.code(201).send({ token, user });
  });
}
