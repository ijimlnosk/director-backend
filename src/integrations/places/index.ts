import { env } from '../../shared/config/env.js';
import { createKakaoPlacesProvider } from './kakao.js';
import type { PlacesProvider } from './places.types.js';

const disabledProvider: PlacesProvider = {
  enabled: false,
  searchAround() {
    return Promise.reject(new Error('Places provider is disabled (KAKAO_REST_API_KEY not set)'));
  },
};

/** Process-wide Places provider (Kakao Local). */
export const placesProvider: PlacesProvider = env.KAKAO_REST_API_KEY
  ? createKakaoPlacesProvider({
      apiKey: env.KAKAO_REST_API_KEY,
      timeoutMs: env.PLACES_TIMEOUT_MS,
    })
  : disabledProvider;

export { PlacesProviderError, DEFAULT_CATEGORY_GROUPS, KAKAO_CATEGORY_GROUPS } from './places.types.js';
export type { PlaceCandidate } from './places.types.js';
