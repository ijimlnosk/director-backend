import { aiDirector } from '../../integrations/ai/index.js';
import { conflict, constraintFailed, forbidden, notFound } from '../../shared/errors/app-error.js';
import { SEARCH_RADIUS_M } from './scene.constants.js';
import {
  insertNextScene,
  listCandidates,
  loadSessionContext,
  priorScenes,
  unresolvedSceneSeq,
  type Candidate,
  type SessionContext,
} from './scene.repository.js';
import { buildMoveScene, estimateTimeLimitMin, type MoveSceneDraft } from './scene.templates.js';
import { toSceneView, type SceneView } from './scene.schema.js';

const SCENE_GENERATABLE_STATUS = new Set(['active']);

interface SceneChoice {
  placeId: string;
  distanceM: number;
  generatedBy: 'template' | 'llm';
  draft: MoveSceneDraft;
}

/** Deterministic pick from the nearest candidate. */
function deterministicChoice(nearest: Candidate, transport: SessionContext['transport']): SceneChoice {
  const distanceM = Math.round(nearest.distanceM);
  return {
    placeId: nearest.placeId,
    distanceM,
    generatedBy: 'template',
    draft: buildMoveScene({ category: nearest.category, distanceM, transport }),
  };
}

/** Ask the AI Director to choose; fall back to deterministic on any failure. */
async function chooseScene(
  session: SessionContext,
  remainingMin: number,
  priorSceneCount: number,
  candidates: Candidate[],
): Promise<SceneChoice> {
  const nearest = candidates[0]!;
  if (!aiDirector.enabled) {
    return deterministicChoice(nearest, session.transport);
  }

  try {
    const decision = await aiDirector.decide({
      mode: session.mode,
      mood: session.mood,
      transport: session.transport,
      remainingMin,
      priorSceneCount,
      candidates: candidates.map((c) => ({
        placeId: c.placeId,
        category: c.category,
        distanceM: Math.round(c.distanceM),
      })),
    });

    const chosen = candidates.find((c) => c.placeId === decision.placeId);
    if (chosen === undefined) {
      throw new Error(`AI returned a placeId not in the candidate set: ${decision.placeId}`);
    }

    const distanceM = Math.round(chosen.distanceM);
    return {
      placeId: chosen.placeId,
      distanceM,
      generatedBy: 'llm',
      draft: {
        type: 'move',
        title: decision.title,
        body: decision.body,
        hint: decision.hint,
        timeLimitMin: estimateTimeLimitMin(distanceM, session.transport),
        revealNameAfterArrival: true,
      },
    };
  } catch (error) {
    // eslint-disable-next-line no-console -- no shared logger yet; visible in container logs
    console.warn('[ai-director] falling back to deterministic pick:', error);
    return deterministicChoice(nearest, session.transport);
  }
}

/** Generate the next MOVE scene for a session (AI Director with deterministic fallback). */
export async function generateNextScene(userId: string, sessionId: string): Promise<SceneView> {
  const session = await loadSessionContext(sessionId);
  if (session === undefined) {
    throw notFound('session');
  }
  if (session.hostUserId !== userId) {
    throw forbidden('You do not have access to this session');
  }
  if (!SCENE_GENERATABLE_STATUS.has(session.status)) {
    throw conflict(`Session is ${session.status}; start the session before requesting a scene`);
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

  const candidates = await listCandidates({
    areaId: session.areaId,
    originLat: session.originLat,
    originLng: session.originLng,
    radiusM: SEARCH_RADIUS_M[session.transport],
    excludePlaceIds: usedPlaceIds,
    userId,
  });
  if (candidates.length === 0) {
    throw constraintFailed('No eligible place found for the next scene');
  }

  const choice = await chooseScene(session, remainingMin, prior.length, candidates);

  // Final deterministic check: the scene must fit the remaining session time.
  if (choice.draft.timeLimitMin > remainingMin) {
    throw constraintFailed('Not enough session time remains for another scene', {
      remainingMin,
      requiredMin: choice.draft.timeLimitMin,
    });
  }

  const row = await insertNextScene({
    sessionId,
    draft: choice.draft,
    placeId: choice.placeId,
    distanceM: choice.distanceM,
    generatedBy: choice.generatedBy,
  });
  return toSceneView(row);
}
