import { sql } from 'drizzle-orm';
import Fastify, { type FastifyInstance } from 'fastify';

import { db } from '../shared/database/client.js';
import { registerAuth } from './plugins/auth.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { registerRoutes } from './routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  registerErrorHandler(app);
  await registerAuth(app);

  app.get('/health', async () => ({ status: 'ok' }));

  app.get('/ready', async (_request, reply) => {
    try {
      await db.execute(sql`select 1`);
      return { status: 'ready' };
    } catch (error) {
      app.log.error(error);
      return reply.code(503).send({ status: 'unavailable' });
    }
  });

  await app.register(registerRoutes);

  return app;
}
