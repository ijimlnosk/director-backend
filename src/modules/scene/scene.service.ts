import { aiDirector } from '../../integrations/ai/index.js';
import { outdoorAdvisory } from '../../integrations/weather/advisory.js';
import { weatherSnapshotSchema } from '../../integrations/weather/weather.types.js';
import { countJoined, findParticipant } from '../participant/participant.repository.js';
import { conflict, constraintFailed, forbidden, notFound } from '../../shared/errors/app-error.js';
import { directionPhrase } from '../../shared/geo/distance.js';
import { logger } from '../../shared/logger.js';
import {
  INDOOR_CATEGORIES,
  MIN_STEP_M,
  PURPOSE_CATEGORIES,
  PURPOSE_SCENE_TYPES,
  RECENT_CATEGORY_WINDOW,
  SAME_SPOT_M,
  WEATHER_RADIUS_FACTOR,
  type GeneratedSceneType,
  type WeatherAdvisory,
} from './scene.constants.js';
import {
  currentSceneRow,
  insertNextScene,
  lastSceneAnchor,
  listCandidates,
  listSceneRows,
  loadSessionContext,
  priorScenes,
  softCategoryPreferences,
  unresolvedSceneSeq,
  type Candidate,
  type SessionContext,
} from './scene.repository.js';
import {
  buildTemplateScene,
  estimateTimeLimitMin,
  hopRadiusM,
  type SceneDraft,
} from './scene.templates.js';
import {
  toSceneListItem,
  toSceneView,
  type SceneListItem,
  type SceneView,
} from './scene.schema.js';

const SCENE_GENERATABLE_STATUS = new Set(['active']);

interface SceneChoice {
  placeId: string;
  distanceM: number;
  generatedBy: 'template' | 'llm';
  draft: SceneDraft;
}

type Anchor = { lat: number; lng: number };

/** No-AI pick: the first shuffled candidate, always a plain MOVE scene. */
function deterministicChoice(
  pick: Candidate,
  anchor: Anchor,
  transport: SessionContext['transport'],
): SceneChoice {
  const distanceM = Math.round(pick.distanceM);
  return {
    placeId: pick.placeId,
    distanceM,
    generatedBy: 'template',
    draft: buildTemplateScene({
      type: 'move',
      category: pick.category,
      direction: directionPhrase(anchor, { lat: pick.lat, lng: pick.lng }),
      distanceM,
      transport,
    }),
  };
}

interface DirectorHints {
  recentCategories: string[];
  preferredCategories: string[];
  avoidedCategories: string[];
  allowedSceneTypes: GeneratedSceneType[];
  weather: { advisory: WeatherAdvisory; summary: string } | null;
}

/** Ask the AI Director to choose; fall back to deterministic on any failure. */
async function chooseScene(
  session: SessionContext,
  anchor: Anchor,
  remainingMin: number,
  priorSceneCount: number,
  hints: DirectorHints,
  candidates: Candidate[],
): Promise<SceneChoice> {
  const fallbackPick = candidates[0]!;
  if (!aiDirector.enabled) {
    return deterministicChoice(fallbackPick, anchor, session.transport);
  }

  try {
    const decision = await aiDirector.decide({
      mode: session.mode,
      mood: session.mood,
      purpose: session.purpose,
      transport: session.transport,
      remainingMin,
      priorSceneCount,
      recentCategories: hints.recentCategories,
      preferredCategories: hints.preferredCategories,
      avoidedCategories: hints.avoidedCategories,
      allowedSceneTypes: hints.allowedSceneTypes,
      weather: hints.weather,
      candidates: candidates.map((c) => ({
        placeId: c.placeId,
        category: c.category,
        distanceM: Math.round(c.distanceM),
        direction: directionPhrase(anchor, { lat: c.lat, lng: c.lng }),
      })),
    });

    const chosen = candidates.find((c) => c.placeId === decision.placeId);
    if (chosen === undefined) {
      throw new Error(`AI returned a placeId not in the candidate set: ${decision.placeId}`);
    }

    const sceneType = hints.allowedSceneTypes.includes(decision.sceneType)
      ? decision.sceneType
      : 'move';
    const distanceM = Math.round(chosen.distanceM);
    return {
      placeId: chosen.placeId,
      distanceM,
      generatedBy: 'llm',
      draft: {
        type: sceneType,
        title: decision.title,
        body: decision.body,
        hint: decision.hint,
        timeLimitMin: estimateTimeLimitMin(distanceM, session.transport, sceneType),
        revealNameAfterArrival: true,
      },
    };
  } catch (error) {
    logger.warn({ err: error }, 'ai-director: falling back to deterministic pick');
    return deterministicChoice(fallbackPick, anchor, session.transport);
  }
}

async function assertSceneReader(userId: string, sessionId: string): Promise<void> {
  const session = await loadSessionContext(sessionId);
  if (session === undefined) {
    throw notFound('session');
  }
  if (session.hostUserId === userId) return;
  const me = await findParticipant(sessionId, userId);
  if (me === undefined || me.state !== 'joined') {
    throw forbidden('You do not have access to this session');
  }
}

/** Every scene of a session so far, with outcomes, for a trail/progress view. */
export async function listSessionScenes(
  userId: string,
  sessionId: string,
): Promise<SceneListItem[]> {
  await assertSceneReader(userId, sessionId);
  return (await listSceneRows(sessionId)).map(toSceneListItem);
}

/** The scene to resume (latest unresolved), or null if there is none. */
export async function getCurrentScene(
  userId: string,
  sessionId: string,
): Promise<SceneView | null> {
  await assertSceneReader(userId, sessionId);
  const row = await currentSceneRow(sessionId);
  return row === undefined ? null : toSceneView(row);
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

  const resolverCount = Math.max(await countJoined(sessionId), 1);
  const unresolved = await unresolvedSceneSeq(sessionId, resolverCount);
  if (unresolved !== undefined) {
    throw conflict(`Scene ${unresolved} is still open; every participant must resolve it first`);
  }

  const prior = await priorScenes(sessionId);
  const usedPlaceIds = prior
    .map((scene) => scene.placeId)
    .filter((id): id is string => id !== null);
  const avoidPoints = prior
    .filter((s): s is typeof s & { lat: number; lng: number } => s.lat !== null && s.lng !== null)
    .map((s) => ({ lat: s.lat, lng: s.lng }));
  const recentCategories = [
    ...new Set(
      prior
        .map((s) => s.category)
        .filter((c): c is string => c !== null)
        .slice(-RECENT_CATEGORY_WINDOW),
    ),
  ];
  const remainingMin = session.durationMin - prior.reduce((sum, s) => sum + s.timeLimitMin, 0);

  // Weather steers how far and toward what kind of place the next scene goes.
  const parsedWeather = weatherSnapshotSchema.safeParse(session.weatherSnapshot);
  const advisory: WeatherAdvisory = parsedWeather.success
    ? outdoorAdvisory(parsedWeather.data)
    : 'ok';
  const weatherHint = parsedWeather.success
    ? { advisory, summary: parsedWeather.data.summary }
    : null;

  const purposeCategories = PURPOSE_CATEGORIES[session.purpose];
  let categories = purposeCategories;
  if (advisory === 'avoid') {
    const sheltered =
      purposeCategories.length === 0
        ? INDOOR_CATEGORIES
        : purposeCategories.filter((c) => INDOOR_CATEGORIES.includes(c));
    categories = sheltered.length > 0 ? sheltered : INDOOR_CATEGORIES;
  }

  const stepM = MIN_STEP_M[session.transport];
  const radiusM = Math.max(
    stepM * 3,
    Math.round(
      hopRadiusM(session.transport, Math.max(remainingMin, 0)) * WEATHER_RADIUS_FACTOR[advisory],
    ),
  );

  // The search moves with the player: last arrival, else session origin.
  const anchor = (await lastSceneAnchor(sessionId)) ?? {
    lat: session.originLat,
    lng: session.originLng,
  };

  const candidates = await listCandidates({
    areaId: session.areaId,
    anchorLat: anchor.lat,
    anchorLng: anchor.lng,
    radiusM,
    minStepM: stepM,
    excludePlaceIds: usedPlaceIds,
    avoidPoints,
    avoidRadiusM: SAME_SPOT_M,
    categories,
    userId,
  });
  if (candidates.length === 0) {
    throw constraintFailed('No eligible place found for the next scene');
  }

  const prefs = await softCategoryPreferences(userId);
  const preferredCategories =
    advisory === 'caution'
      ? [...new Set([...prefs.preferred, ...INDOOR_CATEGORIES])]
      : prefs.preferred;
  const choice = await chooseScene(
    session,
    anchor,
    remainingMin,
    prior.length,
    {
      recentCategories,
      preferredCategories,
      avoidedCategories: prefs.avoided,
      allowedSceneTypes: PURPOSE_SCENE_TYPES[session.purpose],
      weather: weatherHint,
    },
    candidates,
  );

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
