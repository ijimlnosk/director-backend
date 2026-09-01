import {
  DirectionsProviderError,
  type DirectionsProvider,
  type RouteRequest,
  type RouteSummary,
} from './directions.types.js';

const ENDPOINT = 'https://apis-navi.kakaomobility.com/v1/directions';
const MAX_MAIN_ROADS = 3;

interface KakaoRoad {
  name?: string;
  distance?: number;
}

interface KakaoGuide {
  name?: string;
  guidance?: string;
  distance?: number;
  /** 100 = departure, 1000 = arrival. */
  type?: number;
  road_index?: number;
}

interface KakaoSection {
  roads?: KakaoRoad[];
  guides?: KakaoGuide[];
}

interface KakaoRoute {
  result_code?: number;
  result_msg?: string;
  summary?: { distance?: number; duration?: number };
  sections?: KakaoSection[];
}

export interface KakaoDirectionsResponse {
  routes?: KakaoRoute[];
}

/** Reduce a Kakao Directions response to our RouteSummary, or null when the
 *  response carries no usable route (missing, error code, no distance). */
export function summariseKakaoRoute(body: KakaoDirectionsResponse): RouteSummary | null {
  const route = body.routes?.[0];
  if (route === undefined || (route.result_code ?? 0) !== 0) return null;

  const distanceM = route.summary?.distance;
  const durationSec = route.summary?.duration;
  if (!Number.isFinite(distanceM) || !Number.isFinite(durationSec)) return null;

  const roads = (route.sections ?? []).flatMap((s) => s.roads ?? []);
  const guides = (route.sections ?? []).flatMap((s) => s.guides ?? []);

  const byRoad = new Map<string, number>();
  for (const r of roads) {
    const name = r.name?.trim();
    if (name) byRoad.set(name, (byRoad.get(name) ?? 0) + (r.distance ?? 0));
  }
  const mainRoads = [...byRoad.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_MAIN_ROADS)
    .map(([name]) => name);

  const firstNamedRoad = roads.find((r) => r.name?.trim());
  const firstManoeuvre = guides.find(
    (g) => g.type !== 100 && g.type !== 1000 && (g.guidance?.trim().length ?? 0) > 0,
  );
  const firstStep = firstManoeuvre
    ? {
        instruction: firstManoeuvre.guidance!.trim(),
        roadName: firstNamedRoad?.name?.trim() ?? null,
        distanceM: Math.round(firstManoeuvre.distance ?? 0),
      }
    : null;

  return {
    distanceM: Math.round(distanceM as number),
    durationSec: Math.round(durationSec as number),
    mainRoads,
    firstStep,
  };
}

export function createKakaoDirectionsProvider(opts: {
  apiKey: string;
  timeoutMs: number;
}): DirectionsProvider {
  return {
    enabled: true,
    async route(request: RouteRequest): Promise<RouteSummary | null> {
      const { origin, destination } = request;
      const url =
        `${ENDPOINT}?origin=${origin.lng},${origin.lat}` +
        `&destination=${destination.lng},${destination.lat}` +
        `&priority=RECOMMEND&road_details=false`;

      let response: Response;
      try {
        response = await fetch(url, {
          headers: { Authorization: `KakaoAK ${opts.apiKey}` },
          signal: AbortSignal.timeout(opts.timeoutMs),
        });
      } catch (error) {
        throw new DirectionsProviderError(
          `Kakao directions request failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      if (!response.ok) {
        const detail = (await response.text().catch(() => '')).slice(0, 200);
        throw new DirectionsProviderError(`Kakao directions responded ${response.status}: ${detail}`);
      }
      return summariseKakaoRoute((await response.json()) as KakaoDirectionsResponse);
    },
  };
}
