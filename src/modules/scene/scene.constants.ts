export type Transport = 'walk' | 'transit' | 'car';

/** How far we look for candidate places, by transport mode (metres). */
export const SEARCH_RADIUS_M: Record<Transport, number> = {
  walk: 1500,
  transit: 5000,
  car: 15_000,
};

/** Rough door-to-door travel speed, by transport mode (metres per minute). */
export const TRAVEL_SPEED_M_PER_MIN: Record<Transport, number> = {
  walk: 75,
  transit: 250,
  car: 400,
};

/** Slack added on top of the raw travel estimate for a MOVE scene. */
export const TIME_LIMIT_BUFFER_MIN = 5;

/** A scene never gets less than this much time. */
export const MIN_TIME_LIMIT_MIN = 10;
