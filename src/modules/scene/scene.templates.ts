import { formatDistance } from '../../shared/geo/distance.js';
import {
  MIN_STEP_M,
  MIN_TIME_LIMIT_MIN,
  PER_HOP_TRAVEL_FRACTION,
  SEARCH_RADIUS_M,
  TIME_LIMIT_BUFFER_MIN,
  TRAVEL_SPEED_M_PER_MIN,
  type Transport,
} from './scene.constants.js';

/**
 * How far the next place may be: what the transport covers in a fraction of the
 * remaining session time, clamped between a sensible floor and the mode ceiling.
 * Shrinks as the session runs down.
 */
export function hopRadiusM(transport: Transport, remainingMin: number): number {
  const budget = remainingMin * PER_HOP_TRAVEL_FRACTION * TRAVEL_SPEED_M_PER_MIN[transport];
  const floor = MIN_STEP_M[transport] * 3;
  return Math.round(Math.min(SEARCH_RADIUS_M[transport], Math.max(floor, budget)));
}

export interface MoveSceneDraft {
  type: 'move';
  title: string;
  body: string;
  hint: string;
  timeLimitMin: number;
  revealNameAfterArrival: true;
}

const TRANSPORT_LABEL: Record<Transport, string> = {
  walk: '도보',
  transit: '대중교통',
  car: '차량',
};

/** Deterministic travel-time estimate for a MOVE scene (minutes). */
export function estimateTimeLimitMin(distanceM: number, transport: Transport): number {
  const travel = distanceM / TRAVEL_SPEED_M_PER_MIN[transport];
  return Math.max(MIN_TIME_LIMIT_MIN, Math.ceil(travel) + TIME_LIMIT_BUFFER_MIN);
}

/** Build a template MOVE scene. The place name stays hidden until arrival. */
export function buildMoveScene(input: {
  category: string;
  distanceM: number;
  transport: Transport;
}): MoveSceneDraft {
  const { category, distanceM, transport } = input;
  return {
    type: 'move',
    title: '다음 장소로 이동',
    body: `${TRANSPORT_LABEL[transport]}(으)로 약 ${formatDistance(distanceM)} 이동하세요. 도착하면 장소가 공개됩니다.`,
    hint: `${category} 계열 장소입니다.`,
    timeLimitMin: estimateTimeLimitMin(distanceM, transport),
    revealNameAfterArrival: true,
  };
}
