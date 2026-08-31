import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { env } from '../../shared/config/env.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/** Registers JWT verification and an `authenticate` preHandler. */
export async function registerAuth(app: FastifyInstance): Promise<void> {
  await app.register(fastifyJwt, { secret: env.JWT_SECRET });

  app.decorate('authenticate', async (request: FastifyRequest) => {
    await request.jwtVerify();
  });
}

export function signUserToken(app: FastifyInstance, userId: string): string {
  return app.jwt.sign({ sub: userId });
}
