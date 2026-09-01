import { z } from 'zod';

import { weatherSnapshotSchema, type WeatherSnapshot } from '../../integrations/weather/weather.types.js';
import { MIN_STEP_M, SAME_SPOT_M } from '../scene/scene.constants.js';
import { listCandidates } from '../scene/scene.repository.js';
import { hopRadiusM } from '../scene/scene.templates.js';
import { outdoorAdvisory } from './session.advisory.js';
import { sessionView } from './session.schema.js';
import { visitedPlacesInArea } from './session.repository.js';

export const startChecksSchema = z.object({
  area: z.object({ id: z.uuid(), name: z.string(), isLive: z.boolean() }),
  range: z.object({ transport: z.enum(['walk', 'transit', 'car']), radiusM: z.number().int() }),
  weather: z.discriminatedUnion('available', [
    z.object({
      available: z.literal(true),
      advisory: z.enum(['ok', 'caution', 'avoid']),
      snapshot: weatherSnapshotSchema,
    }),
    z.object({ available: z.literal(false) }),
  ]),
  openingHours: z.object({
    status: z.literal('checked'),
    openNow: z.number().int(),
    closedNow: z.number().int(),
    unknown: z.number().int(),
  }),
  recentVisits: z.object({ visitedInArea: z.number().int(), excludedByCooldown: z.number().int() }),
  candidates: z.object({ eligibleCount: z.number().int(), ok: z.boolean() }),
});

export type StartChecks = z.infer<typeof startChecksSchema>;

export const startSessionResponse = z.object({
  session: sessionView,
  checks: startChecksSchema,
});

export interface StartCheckInput {
  userId: string;
  sessionId: string;
  area: { id: string; name: string; isLive: boolean };
  transport: 'walk' | 'transit' | 'car';
  durationMin: number;
  originLat: number;
  originLng: number;
  weather: WeatherSnapshot | null;
}

/** Real SAFETY-CHECK results for the start screen. Unverifiable items are
 *  reported honestly rather than faked. */
export async function runStartChecks(input: StartCheckInput): Promise<StartChecks> {
  const radiusM = hopRadiusM(input.transport, input.durationMin);

  const [candidates, visits] = await Promise.all([
    listCandidates({
      areaId: input.area.id,
      anchorLat: input.originLat,
      anchorLng: input.originLng,
      radiusM,
      minStepM: MIN_STEP_M[input.transport],
      excludePlaceIds: [],
      avoidPoints: [],
      avoidRadiusM: SAME_SPOT_M,
      userId: input.userId,
    }),
    visitedPlacesInArea(input.userId, input.area.id),
  ]);

  const openNow = candidates.filter((c) => c.openState === 'open').length;
  const closedNow = candidates.filter((c) => c.openState === 'closed').length;
  const unknown = candidates.filter((c) => c.openState === 'unknown').length;
  const eligibleCount = openNow + unknown;

  return {
    area: input.area,
    range: { transport: input.transport, radiusM },
    weather:
      input.weather === null
        ? { available: false }
        : { available: true, advisory: outdoorAdvisory(input.weather), snapshot: input.weather },
    openingHours: { status: 'checked', openNow, closedNow, unknown },
    recentVisits: {
      visitedInArea: visits.visited,
      excludedByCooldown: visits.cooledDown,
    },
    candidates: { eligibleCount, ok: eligibleCount > 0 },
  };
}
