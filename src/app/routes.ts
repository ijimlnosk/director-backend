import type { FastifyInstance } from 'fastify';

import { cutRoutes } from '../modules/cut/cut.routes.js';
import { sceneRoutes } from '../modules/scene/scene.routes.js';
import { sessionRoutes } from '../modules/session/session.routes.js';
import { userRoutes } from '../modules/user/user.routes.js';

/** Compose all module route plugins. */
export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(userRoutes);
  await app.register(sessionRoutes);
  await app.register(sceneRoutes);
  await app.register(cutRoutes);
}
