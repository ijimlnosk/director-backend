import { env } from '../../shared/config/env.js';
import { createKakaoDirectionsProvider } from './kakao-directions.js';
import type { DirectionsProvider } from './directions.types.js';

const disabledProvider: DirectionsProvider = {
  enabled: false,
  route() {
    return Promise.resolve(null);
  },
};

const apiKey = env.KAKAO_MOBILITY_API_KEY ?? env.KAKAO_REST_API_KEY;

/** Process-wide driving-directions provider (Kakao Mobility). */
export const directionsProvider: DirectionsProvider = apiKey
  ? createKakaoDirectionsProvider({ apiKey, timeoutMs: env.DIRECTIONS_TIMEOUT_MS })
  : disabledProvider;

export { DirectionsProviderError } from './directions.types.js';
export type { RouteSummary, RouteRequest } from './directions.types.js';
