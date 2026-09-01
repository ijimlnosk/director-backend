import { directionsProvider } from '../../integrations/directions/index.js';
import { logger } from '../../shared/logger.js';
import type { RouteView } from './scene.schema.js';

/**
 * Trusted driving route between two points, from Kakao Mobility. Returns null
 * when the provider is disabled, errors, or has no usable route - the route is
 * an add-on and must never block scene generation.
 */
export async function findRouteTo(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<RouteView | null> {
  if (!directionsProvider.enabled) return null;
  try {
    return await directionsProvider.route({ origin: from, destination: to });
  } catch (error) {
    logger.warn({ err: error }, 'route lookup failed; returning none');
    return null;
  }
}
