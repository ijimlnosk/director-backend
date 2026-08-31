import { sql } from 'drizzle-orm';
import Fastify from 'fastify';

import { db } from '../shared/database/client.js';

export function buildApp() {
  const app = Fastify({ logger: true });

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

  return app;
}
