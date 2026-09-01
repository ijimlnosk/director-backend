import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { env } from '../../shared/config/env.js';
import { AppError } from '../../shared/errors/app-error.js';
import { notFound } from '../../shared/errors/app-error.js';
import {
  areaParams,
  areaResponse,
  areasResponse,
  createAreaBody,
  ingestPlacesBody,
  ingestPlacesResponse,
  placeHoursParams,
  placeHoursResponse,
  setPlaceHoursBody,
} from './area.schema.js';
import { ingestAreaPlaces } from './area.service.js';
import { insertArea, listLiveAreas, setPlaceHours } from './area.repository.js';

function requireAdmin(request: FastifyRequest): void {
  if (env.ADMIN_TOKEN === undefined) {
    throw new AppError('PROVIDER_FAILED', 'Admin operations are disabled (ADMIN_TOKEN unset)');
  }
  if (request.headers['x-admin-token'] !== env.ADMIN_TOKEN) {
    throw new AppError('AUTHENTICATION', 'Invalid admin token');
  }
}

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
    '/areas',
    {
      schema: {
        tags: ['area'],
        summary: 'Admin: create an area as a circular buffer around a centre point',
        body: createAreaBody,
        response: { 201: areaResponse },
      },
    },
    async (request, reply) => {
      requireAdmin(request);
      const area = await insertArea(request.body);
      return reply.code(201).send({ area });
    },
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
      requireAdmin(request);
      return ingestAreaPlaces(request.params.areaId, request.body);
    },
  );

  app.put(
    '/areas/:areaId/places/:placeId/hours',
    {
      schema: {
        tags: ['area'],
        summary: 'Admin: set a place\'s opening hours',
        params: placeHoursParams,
        body: setPlaceHoursBody,
        response: { 200: placeHoursResponse },
      },
    },
    async (request) => {
      requireAdmin(request);
      const { areaId, placeId } = request.params;
      const ok = await setPlaceHours(areaId, placeId, request.body.openHours);
      if (!ok) throw notFound('place');
      return { placeId, openHours: request.body.openHours };
    },
  );
}
