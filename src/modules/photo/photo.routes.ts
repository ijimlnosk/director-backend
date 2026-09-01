import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { validationFailed } from '../../shared/errors/app-error.js';
import { photoParams, photoResponse } from './photo.schema.js';
import { attachPhoto } from './photo.service.js';

export async function photoRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post(
    '/scenes/:sceneId/photo',
    {
      schema: {
        tags: ['photo'],
        summary: 'Attach a photo (multipart field "file") to an arrived scene',
        security: [{ bearerAuth: [] }],
        consumes: ['multipart/form-data'],
        params: photoParams,
        response: { 201: photoResponse },
      },
      onRequest: app.authenticate,
    },
    async (request, reply) => {
      const file = await request.file();
      if (file === undefined) {
        throw validationFailed('a multipart "file" field is required');
      }
      const buffer = await file.toBuffer();
      const photo = await attachPhoto(request.user.sub, request.params.sceneId, {
        buffer,
        mimetype: file.mimetype,
        truncated: file.file.truncated,
      });
      return reply.code(201).send({ photo });
    },
  );
}
