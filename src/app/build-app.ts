import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import fastifyStatic from '@fastify/static';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { sql } from 'drizzle-orm';
import Fastify, { type FastifyInstance } from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';

import { storage, writeLocalObject } from '../integrations/storage/index.js';
import { env } from '../shared/config/env.js';
import { db } from '../shared/database/client.js';
import { registerAuth } from './plugins/auth.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { registerRoutes } from './routes.js';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Local-storage stand-in for a presigned PUT: accepts the raw image body. */
async function registerLocalMediaUpload(app: FastifyInstance): Promise<void> {
  app.addContentTypeParser(
    IMAGE_TYPES,
    { parseAs: 'buffer', bodyLimit: env.PHOTO_MAX_BYTES + 1024 },
    (_req, body, done) => done(null, body),
  );
  await mkdir(env.MEDIA_DIR, { recursive: true });
  await app.register(fastifyStatic, {
    root: resolve(env.MEDIA_DIR),
    prefix: '/media/',
    decorateReply: false,
    index: false,
  });
  app.put('/media-upload/*', { schema: { hide: true } }, async (request, reply) => {
    const key = (request.params as Record<'*', string>)['*'];
    await writeLocalObject(env.MEDIA_DIR, key, request.body as Buffer);
    return reply.code(200).send({ ok: true });
  });
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registerErrorHandler(app);
  await registerAuth(app);

  if (storage.kind === 'local') {
    await registerLocalMediaUpload(app);
  }

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
