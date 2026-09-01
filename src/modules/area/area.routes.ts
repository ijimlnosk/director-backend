import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { requireAdmin } from '../../shared/require-admin.js';
import {
  areaParams,
  areaResponse,
  areasResponse,
  createAreaBody,
  ingestPlacesBody,
  ingestPlacesResponse,
  listAreasQuery,
} from './area.schema.js';
import { ingestAreaPlaces } from './area.service.js';
import { insertArea, listLiveAreas } from './area.repository.js';

export async function areaRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.get(
    '/areas',
    {
      schema: {
        tags: ['area'],
        summary: 'List live areas; with ?near=lat,lng ranked by distance',
        querystring: listAreasQuery,
        response: { 200: areasResponse },
      },
    },
    async (request) => {
      let near: { lat: number; lng: number } | undefined;
      if (request.query.near) {
        const [lat, lng] = request.query.near.split(',');
        near = { lat: Number(lat), lng: Number(lng) };
      }
      return { areas: await listLiveAreas(near) };
    },
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
}
