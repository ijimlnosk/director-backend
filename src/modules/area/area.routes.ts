import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { areasResponse } from './area.schema.js';
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
}
