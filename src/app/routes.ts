import type { FastifyInstance } from 'fastify';

import { adminRoutes } from '../modules/admin/admin.routes.js';
import { areaRoutes } from '../modules/area/area.routes.js';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { cutRoutes } from '../modules/cut/cut.routes.js';
import { feedbackRoutes } from '../modules/feedback/feedback.routes.js';
import { participantRoutes } from '../modules/participant/participant.routes.js';
import { photoRoutes } from '../modules/photo/photo.routes.js';
import { sceneRoutes } from '../modules/scene/scene.routes.js';
import { sessionRoutes } from '../modules/session/session.routes.js';
import { userRoutes } from '../modules/user/user.routes.js';

/** Compose all module route plugins. */
export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(userRoutes);
  await app.register(authRoutes);
  await app.register(areaRoutes);
  await app.register(adminRoutes);
  await app.register(sessionRoutes);
  await app.register(participantRoutes);
  await app.register(sceneRoutes);
  await app.register(photoRoutes);
  await app.register(feedbackRoutes);
  await app.register(cutRoutes);
}
