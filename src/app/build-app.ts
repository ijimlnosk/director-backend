import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { sql } from 'drizzle-orm';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';

import { db } from '../shared/database/client.js';
import { registerAuth } from './plugins/auth.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { registerRoutes } from './routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registerErrorHandler(app);
  await registerAuth(app);

  await app.register(fastifySwagger, {
    openapi: {
      info: { title: 'DIRECTOR Backend API', version: '0.1.0' },
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
    transform: jsonSchemaTransform,
  });
  await app.register(fastifySwaggerUi, { routePrefix: '/docs' });

  app.get('/health', { schema: { tags: ['system'] } }, async () => ({ status: 'ok' }));

  app.get('/ready', { schema: { tags: ['system'] } }, async (_request, reply) => {
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
