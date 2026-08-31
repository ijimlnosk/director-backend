import {
  MIN_TIME_LIMIT_MIN,
  TIME_LIMIT_BUFFER_MIN,
  TRAVEL_SPEED_M_PER_MIN,
  type Transport,
} from './scene.constants.js';

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

export function formatDistance(distanceM: number): string {
  if (distanceM < 1000) return `${Math.round(distanceM / 10) * 10}m`;
  return `${(distanceM / 1000).toFixed(1)}km`;
}

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
