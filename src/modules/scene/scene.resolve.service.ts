import {
  conflict,
  constraintFailed,
  forbidden,
  notFound,
  validationFailed,
} from '../../shared/errors/app-error.js';
import { haversineM } from '../../shared/geo/distance.js';
import { ARRIVAL_GEOFENCE_M } from './scene.constants.js';
import {
  insertSceneResult,
  loadSceneForResolve,
  sceneResultExists,
  type SceneForResolve,
} from './scene.resolve.repository.js';
import {
  toSceneResultView,
  type CompleteSceneInput,
  type SceneResultView,
  type SkipSceneInput,
} from './scene.schema.js';

async function loadResolvable(
  userId: string,
  sceneId: string,
): Promise<SceneForResolve> {
  const scene = await loadSceneForResolve(sceneId);
  if (scene === undefined) {
    throw notFound('scene');
  }
  if (scene.hostUserId !== userId) {
    throw forbidden('You do not have access to this scene');
  }
  if (scene.sessionStatus !== 'active') {
    throw conflict(`Session is ${scene.sessionStatus}; scene cannot be resolved`);
  }
  if (await sceneResultExists(sceneId, userId)) {
    throw conflict('Scene is already resolved');
  }
  return scene;
}

/** Verify arrival and record an `arrived` scene result. */
export async function completeScene(
  userId: string,
  sceneId: string,
  body: CompleteSceneInput,
): Promise<SceneResultView> {
  const scene = await loadResolvable(userId, sceneId);
  if (scene.placeId === null || scene.placeLat === null || scene.placeLng === null) {
    throw constraintFailed('Scene has no target place to verify against');
  }

  if (body.verifiedBy === 'gps') {
    if (body.point === undefined) {
      throw validationFailed('point is required when verifiedBy is "gps"');
    }
    const distanceM = haversineM(body.point, { lat: scene.placeLat, lng: scene.placeLng });
    if (distanceM > ARRIVAL_GEOFENCE_M) {
      throw constraintFailed('Too far from the target to confirm arrival', {
        distanceM: Math.round(distanceM),
        allowedM: ARRIVAL_GEOFENCE_M,
      });
    }
  }

  const row = await insertSceneResult({
    sceneId,
    userId,
    placeId: scene.placeId,
    outcome: 'arrived',
    verifiedBy: body.verifiedBy,
    ...(body.point ? { arrivedPoint: body.point } : {}),
    skipReason: null,
    elapsedSec: body.elapsedSec,
    walkedM: body.walkedM,
  });
  return toSceneResultView(row);
}

/** Record a `skipped` scene result with its reason. */
export async function skipScene(
  userId: string,
  sceneId: string,
  body: SkipSceneInput,
): Promise<SceneResultView> {
  await loadResolvable(userId, sceneId);

  const row = await insertSceneResult({
    sceneId,
    userId,
    placeId: null,
    outcome: 'skipped',
    verifiedBy: 'manual',
    skipReason: body.reason,
    elapsedSec: body.elapsedSec,
    walkedM: body.walkedM,
  });
  return toSceneResultView(row);
}
