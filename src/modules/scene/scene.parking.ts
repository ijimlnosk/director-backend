import { placesProvider } from '../../integrations/places/index.js';
import { haversineM } from '../../shared/geo/distance.js';
import { logger } from '../../shared/logger.js';
import {
  KAKAO_PARKING_GROUP,
  PARKING_RESULT_LIMIT,
  PARKING_SEARCH_RADIUS_M,
} from './scene.constants.js';
import type { ParkingSpot } from './scene.schema.js';

/**
 * Nearby parking for a driving scene's destination, from the trusted Places
 * provider (Kakao Local). Returns [] on any provider failure - parking is an
 * add-on and must never block scene generation.
 */
export async function findParkingNear(target: {
  lat: number;
  lng: number;
}): Promise<ParkingSpot[]> {
  if (!placesProvider.enabled) return [];

  try {
    const found = await placesProvider.searchAround({
      lat: target.lat,
      lng: target.lng,
      radiusM: PARKING_SEARCH_RADIUS_M,
      categoryGroupCodes: [KAKAO_PARKING_GROUP],
    });
    return found
      .map((p) => ({
        name: p.name,
        lat: p.lat,
        lng: p.lng,
        distanceM: Math.round(haversineM(target, { lat: p.lat, lng: p.lng })),
        address: p.address,
      }))
      .sort((a, b) => a.distanceM - b.distanceM)
      .slice(0, PARKING_RESULT_LIMIT);
  } catch (error) {
    logger.warn({ err: error }, 'parking lookup failed; returning none');
    return [];
  }
}
