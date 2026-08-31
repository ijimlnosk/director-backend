import { conflict, constraintFailed, forbidden, notFound } from '../../shared/errors/app-error.js';
import { SEARCH_RADIUS_M } from './scene.constants.js';
import {
  findNearestCandidate,
  insertNextScene,
  loadSessionContext,
  priorScenes,
  unresolvedSceneSeq,
} from './scene.repository.js';
import { buildMoveScene } from './scene.templates.js';
import { toSceneView, type SceneView } from './scene.schema.js';

const SCENE_GENERATABLE_STATUS = new Set(['draft', 'active']);

/** Deterministic (no-AI) generation of the next MOVE scene for a session. */
export async function generateNextScene(userId: string, sessionId: string): Promise<SceneView> {
  const session = await loadSessionContext(sessionId);
  if (session === undefined) {
    throw notFound('session');
  }
  if (session.hostUserId !== userId) {
    throw forbidden('You do not have access to this session');
  }
  if (!SCENE_GENERATABLE_STATUS.has(session.status)) {
    throw conflict(`Session is ${session.status}; cannot generate a scene`);
  }

  const unresolved = await unresolvedSceneSeq(sessionId);
  if (unresolved !== undefined) {
    throw conflict(`Scene ${unresolved} is still open; resolve it before requesting the next`);
  }

  const prior = await priorScenes(sessionId);
  const usedPlaceIds = prior
    .map((scene) => scene.placeId)
    .filter((id): id is string => id !== null);
  const remainingMin = session.durationMin - prior.reduce((sum, s) => sum + s.timeLimitMin, 0);

  const candidate = await findNearestCandidate({
    areaId: session.areaId,
    originLat: session.originLat,
    originLng: session.originLng,
    radiusM: SEARCH_RADIUS_M[session.transport],
    excludePlaceIds: usedPlaceIds,
    userId,
  });
  if (candidate === undefined) {
    throw constraintFailed('No eligible place found for the next scene');
  }

  const distanceM = Math.round(candidate.distanceM);
  const draft = buildMoveScene({
    category: candidate.category,
    distanceM,
    transport: session.transport,
  });

  // Final deterministic check: the scene must fit the remaining session time.
  if (draft.timeLimitMin > remainingMin) {
    throw constraintFailed('Not enough session time remains for another scene', {
      remainingMin,
      requiredMin: draft.timeLimitMin,
    });
  }

  const row = await insertNextScene({
    sessionId,
    activateDraft: session.status === 'draft',
    draft,
    placeId: candidate.placeId,
    distanceM,
  });
  return toSceneView(row);
}
