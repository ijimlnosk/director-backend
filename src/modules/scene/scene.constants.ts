export type Transport = 'walk' | 'transit' | 'car';

export type Purpose = 'explore' | 'walk' | 'food' | 'culture';

/** Scene types the Director may generate (a subset of the DB enum). */
export type GeneratedSceneType = 'move' | 'photo' | 'observe';

/** `place.category` values a purpose draws from. Empty = no restriction. */
export const PURPOSE_CATEGORIES: Record<Purpose, string[]> = {
  explore: [],
  walk: ['관광명소', '문화시설', '공원'],
  food: ['음식점', '카페'],
  culture: ['문화시설', '관광명소', '서점'],
};

/** Scene types eligible for a purpose; the first is the deterministic default. */
export const PURPOSE_SCENE_TYPES: Record<Purpose, GeneratedSceneType[]> = {
  explore: ['move', 'photo', 'observe'],
  walk: ['move', 'observe', 'photo'],
  food: ['move', 'photo'],
  culture: ['move', 'photo', 'observe'],
};

/** Extra minutes on top of travel time for a stay-and-do scene. */
export const SCENE_TYPE_EXTRA_MIN: Record<GeneratedSceneType, number> = {
  move: 0,
  photo: 5,
  observe: 8,
};

/** Upper bound on how far the next place can be, by transport mode (metres). */
export const SEARCH_RADIUS_M: Record<Transport, number> = {
  walk: 1500,
  transit: 5000,
  car: 15_000,
};

/** Fraction of the remaining session time budgeted for reaching the next place. */
export const PER_HOP_TRAVEL_FRACTION = 0.35;

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

/** Minimum distance from the current anchor to the next place (metres). */
export const MIN_STEP_M: Record<Transport, number> = {
  walk: 150,
  transit: 400,
  car: 600,
};

/** Two places closer than this count as the same spot (de-clustering). */
export const SAME_SPOT_M = 40;

/** How many prior categories the Director is told to vary away from. */
export const RECENT_CATEGORY_WINDOW = 3;

/** Nearest-N eligible places to shuffle the candidate pool out of. */
export const CANDIDATE_POOL_SIZE = 60;

/** How close a GPS fix must be to the target to count as an arrival (metres). */
export const ARRIVAL_GEOFENCE_M = 75;

export const SKIP_REASONS = [
  'too_far',
  'not_interested',
  'too_expensive',
  'no_time',
  'weather',
  'other',
] as const;
