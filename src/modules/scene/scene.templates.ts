import {
  MIN_STEP_M,
  MIN_TIME_LIMIT_MIN,
  PER_HOP_TRAVEL_FRACTION,
  SCENE_TYPE_EXTRA_MIN,
  SEARCH_RADIUS_M,
  TIME_LIMIT_BUFFER_MIN,
  TRAVEL_SPEED_M_PER_MIN,
  type GeneratedSceneType,
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

export interface SceneDraft {
  type: GeneratedSceneType;
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

/** Travel-time estimate plus any stay-and-do allowance (minutes). */
export function estimateTimeLimitMin(
  distanceM: number,
  transport: Transport,
  sceneType: GeneratedSceneType = 'move',
): number {
  const travel = distanceM / TRAVEL_SPEED_M_PER_MIN[transport];
  return Math.max(
    MIN_TIME_LIMIT_MIN,
    Math.ceil(travel) + TIME_LIMIT_BUFFER_MIN + SCENE_TYPE_EXTRA_MIN[sceneType],
  );
}

interface CopyArgs {
  category: string;
  direction: string;
  transportLabel: string;
}

const TEMPLATE_COPY: Record<
  GeneratedSceneType,
  (a: CopyArgs) => { title: string; body: string; hint: string }
> = {
  move: ({ category, direction, transportLabel }) => ({
    title: '다음 장소로 이동',
    body: `${direction}, ${transportLabel}(으)로 이동하세요. 도착하면 장소가 공개됩니다.`,
    hint: `${direction} 방향의 ${category} 계열 장소입니다.`,
  }),
  photo: ({ category, direction, transportLabel }) => ({
    title: '한 컷 남기기',
    body: `${direction}, ${transportLabel}(으)로 이동해 그곳에서 마음에 드는 사진을 한 장 남겨보세요.`,
    hint: `${direction} 방향의 ${category} 계열 장소입니다.`,
  }),
  observe: ({ category, direction, transportLabel }) => ({
    title: '잠시 머무르기',
    body: `${direction}, ${transportLabel}(으)로 이동한 뒤 1~2분간 주변을 천천히 살펴보세요.`,
    hint: `${direction} 방향의 ${category} 계열 장소입니다.`,
  }),
};

/** Build a template scene. The place name stays hidden until arrival.
 *  `direction` is a phrase like "북동쪽으로 약 470m". */
export function buildTemplateScene(input: {
  type: GeneratedSceneType;
  category: string;
  direction: string;
  distanceM: number;
  transport: Transport;
}): SceneDraft {
  const { type, category, direction, distanceM, transport } = input;
  const copy = TEMPLATE_COPY[type]({
    category,
    direction,
    transportLabel: TRANSPORT_LABEL[transport],
  });
  return {
    type,
    ...copy,
    timeLimitMin: estimateTimeLimitMin(distanceM, transport, type),
    revealNameAfterArrival: true,
  };
}
