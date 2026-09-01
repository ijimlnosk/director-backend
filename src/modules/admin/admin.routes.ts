import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { z } from 'zod';

import { env } from '../../shared/config/env.js';
import { requireAdmin } from '../../shared/require-admin.js';
import {
  abandonStaleSessions,
  deleteStalePendingPhotos,
  purgeExpiredRefreshTokens,
} from './admin.repository.js';

const maintenanceResponse = z.object({
  sessionsAbandoned: z.number().int(),
  pendingPhotosDeleted: z.number().int(),
  refreshTokensPurged: z.number().int(),
});

export async function adminRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post(
    '/admin/maintenance',
    {
      schema: {
        tags: ['admin'],
        summary: 'Admin: abandon stale sessions and clean up pending photos / old tokens',
        response: { 200: maintenanceResponse },
      },
    },
    async (request) => {
      requireAdmin(request);
      const [sessionsAbandoned, pendingPhotosDeleted, refreshTokensPurged] = await Promise.all([
        abandonStaleSessions(env.SESSION_GRACE_MIN),
        deleteStalePendingPhotos(60),
        purgeExpiredRefreshTokens(7),
      ]);
      return { sessionsAbandoned, pendingPhotosDeleted, refreshTokensPurged };
    },
  );
}
