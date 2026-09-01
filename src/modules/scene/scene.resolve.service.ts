import {
  conflict,
  constraintFailed,
  forbidden,
  notFound,
  validationFailed,
} from '../../shared/errors/app-error.js';
import { haversineM } from '../../shared/geo/distance.js';
import { extendSceneRow } from './scene.repository.js';
import { ARRIVAL_GEOFENCE_M } from './scene.constants.js';
import {
  insertSceneResult,
  insertVetoes,
  loadSceneForResolve,
  sceneResultExists,
  type SceneForResolve,
} from './scene.resolve.repository.js';
import {
  toSceneResultView,
  toSceneView,
  type AbortSceneInput,
  type CompleteSceneInput,
  type ExtendSceneInput,
  type SceneResultView,
  type SceneView,
  type SkipSceneInput,
  type VetoSceneInput,
} from './scene.schema.js';

async function loadResolvable(
  userId: string,
  sceneId: string,
): Promise<SceneForResolve> {
  const scene = await loadSceneForResolve(sceneId, userId);
  if (scene === undefined) {
    throw notFound('scene');
  }
  if (!scene.canResolve) {
    throw forbidden('You are not a participant of this session');
  }
  if (scene.sessionStatus !== 'active') {
    throw conflict(`Session is ${scene.sessionStatus}; scene cannot be resolved`);
  }
  if (await sceneResultExists(sceneId, userId)) {
    throw conflict('You have already resolved this scene');
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

/** Record a user-scoped veto (place and/or category) and resolve the scene. */
export async function vetoScene(
  userId: string,
  sceneId: string,
  body: VetoSceneInput,
): Promise<SceneResultView> {
  const scene = await loadResolvable(userId, sceneId);
  if (scene.placeId === null) {
    throw constraintFailed('Scene has no place to veto');
  }

  const vetoPlace = body.scope === 'place' || body.scope === 'both';
  const vetoCategory = body.scope === 'category' || body.scope === 'both';

  await insertVetoes({
    userId,
    sceneId,
    placeId: vetoPlace ? scene.placeId : null,
    category: vetoCategory ? scene.placeCategory : null,
    reason: body.reason ?? null,
  });

  const row = await insertSceneResult({
    sceneId,
    userId,
    placeId: null,
    outcome: 'vetoed',
    verifiedBy: 'manual',
    skipReason: null,
    elapsedSec: 0,
    walkedM: 0,
  });
  return toSceneResultView(row);
}

/** Add time to a live scene. The server stays the source of truth for the
 *  deadline (createdAt + timeLimitMin); the extra minutes are also recorded. */
export async function extendScene(
  userId: string,
  sceneId: string,
  body: ExtendSceneInput,
): Promise<SceneView> {
  await loadResolvable(userId, sceneId);
  const row = await extendSceneRow(sceneId, body.extraMin);
  if (row === undefined) {
    throw notFound('scene');
  }
  return toSceneView(row);
}

/** Abort a live scene. Recorded as `aborted` - never treated as completed. */
export async function abortScene(
  userId: string,
  sceneId: string,
  body: AbortSceneInput,
): Promise<SceneResultView> {
  await loadResolvable(userId, sceneId);
  const row = await insertSceneResult({
    sceneId,
    userId,
    placeId: null,
    outcome: 'aborted',
    verifiedBy: 'manual',
    skipReason: body.reason ?? null,
    elapsedSec: 0,
    walkedM: 0,
  });
  return toSceneResultView(row);
}
