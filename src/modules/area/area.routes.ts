import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { env } from '../../shared/config/env.js';
import { AppError } from '../../shared/errors/app-error.js';
import {
  areaParams,
  areasResponse,
  ingestPlacesBody,
  ingestPlacesResponse,
} from './area.schema.js';
import { ingestAreaPlaces } from './area.service.js';
import { listLiveAreas } from './area.repository.js';

export async function areaRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    '/areas',
    {
      schema: {
        tags: ['area'],
        summary: 'List live areas a session can start in',
        response: { 200: areasResponse },
      },
    },
    async () => ({ areas: await listLiveAreas() }),
  );

  app.post(
    '/areas/:areaId/places/ingest',
    {
      schema: {
        tags: ['area'],
        summary: 'Admin: ingest POIs around the area centroid from the Places provider',
        params: areaParams,
        body: ingestPlacesBody,
        response: { 200: ingestPlacesResponse },
      },
    },
    async (request) => {
      if (env.ADMIN_TOKEN === undefined) {
        throw new AppError('PROVIDER_FAILED', 'Admin operations are disabled (ADMIN_TOKEN unset)');
      }
      if (request.headers['x-admin-token'] !== env.ADMIN_TOKEN) {
        throw new AppError('AUTHENTICATION', 'Invalid admin token');
      }
      return ingestAreaPlaces(request.params.areaId, request.body);
    },
  );
}
