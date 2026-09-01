import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import {
  completePhotoBody,
  photoIdParams,
  photoResponse,
  sceneIdParams,
  uploadUrlBody,
  uploadUrlResponse,
} from './photo.schema.js';
import { completePhoto, createUploadUrl } from './photo.service.js';

export async function photoRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post(
    '/scenes/:sceneId/photo/upload-url',
    {
      schema: {
        tags: ['photo'],
        summary: 'Get a presigned PUT URL to upload a scene photo directly to storage',
        security: [{ bearerAuth: [] }],
        params: sceneIdParams,
        body: uploadUrlBody,
        response: { 201: uploadUrlResponse },
      },
      onRequest: app.authenticate,
    },
    async (request, reply) => {
      const result = await createUploadUrl(
        request.user.sub,
        request.params.sceneId,
        request.body.contentType,
      );
      return reply.code(201).send(result);
    },
  );

  app.post(
    '/photos/:photoId/complete',
    {
      schema: {
        tags: ['photo'],
        summary: 'Confirm the upload; storage is checked and the photo is finalised',
        security: [{ bearerAuth: [] }],
        params: photoIdParams,
        body: completePhotoBody,
        response: { 200: photoResponse },
      },
      onRequest: app.authenticate,
    },
    async (request) => {
      const photo = await completePhoto(request.user.sub, request.params.photoId, request.body);
      return { photo };
    },
  );
}
