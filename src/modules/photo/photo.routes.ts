import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import {
  completePhotoBody,
  photoIdParams,
  photoResponse,
  sceneIdParams,
  updatePhotoBody,
  uploadUrlBody,
  uploadUrlResponse,
} from './photo.schema.js';
import {
  completePhoto,
  createUploadUrl,
  getPhoto,
  getScenePhoto,
  updatePhoto,
} from './photo.service.js';

export async function photoRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const auth = { onRequest: app.authenticate };

  app.post(
    '/scenes/:sceneId/photo/upload-url',
    {
      ...auth,
      schema: {
        tags: ['photo'],
        summary: 'Get a presigned PUT URL to upload a scene photo directly to storage',
        security: [{ bearerAuth: [] }],
        params: sceneIdParams,
        body: uploadUrlBody,
        response: { 201: uploadUrlResponse },
      },
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
      ...auth,
      schema: {
        tags: ['photo'],
        summary: 'Confirm the upload; storage is checked and the photo is finalised',
        security: [{ bearerAuth: [] }],
        params: photoIdParams,
        body: completePhotoBody,
        response: { 200: photoResponse },
      },
    },
    async (request) => {
      const photo = await completePhoto(request.user.sub, request.params.photoId, request.body);
      return { photo };
    },
  );

  app.get(
    '/scenes/:sceneId/photo',
    {
      ...auth,
      schema: {
        tags: ['photo'],
        summary: "A scene's photo with a fresh signed URL",
        security: [{ bearerAuth: [] }],
        params: sceneIdParams,
        response: { 200: photoResponse },
      },
    },
    async (request) => ({ photo: await getScenePhoto(request.user.sub, request.params.sceneId) }),
  );

  app.get(
    '/photos/:photoId',
    {
      ...auth,
      schema: {
        tags: ['photo'],
        summary: 'A photo with a fresh signed URL',
        security: [{ bearerAuth: [] }],
        params: photoIdParams,
        response: { 200: photoResponse },
      },
    },
    async (request) => ({ photo: await getPhoto(request.user.sub, request.params.photoId) }),
  );

  app.patch(
    '/photos/:photoId',
    {
      ...auth,
      schema: {
        tags: ['photo'],
        summary: 'Update a photo: credits flag and/or metadata (title, description, capturedAt, location)',
        security: [{ bearerAuth: [] }],
        params: photoIdParams,
        body: updatePhotoBody,
        response: { 200: photoResponse },
      },
    },
    async (request) => ({
      photo: await updatePhoto(request.user.sub, request.params.photoId, request.body),
    }),
  );
}
