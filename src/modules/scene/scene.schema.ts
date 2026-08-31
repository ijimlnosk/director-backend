import { z } from 'zod';

export const nextSceneParams = z.object({ sessionId: z.uuid() });

export const sceneView = z.object({
  id: z.uuid(),
  sessionId: z.uuid(),
  seq: z.number().int(),
  type: z.enum(['move', 'choose', 'photo', 'observe', 'split']),
  title: z.string(),
  body: z.string(),
  hint: z.string(),
  distanceM: z.number().int(),
  timeLimitMin: z.number().int(),
  revealNameAfterArrival: z.boolean(),
  target: z.object({ lat: z.number(), lng: z.number() }),
  createdAt: z.string(),
});

export type SceneView = z.infer<typeof sceneView>;

export const sceneResponse = z.object({ scene: sceneView });

export interface SceneRow {
  id: string;
  sessionId: string;
  seq: number;
  type: SceneView['type'];
  title: string;
  body: string;
  hint: string;
  distanceM: number;
  timeLimitMin: number;
  revealNameAfterArrival: boolean;
  targetLat: number;
  targetLng: number;
  createdAt: Date;
}

export function toSceneView(row: SceneRow): SceneView {
  return {
    id: row.id,
    sessionId: row.sessionId,
    seq: row.seq,
    type: row.type,
    title: row.title,
    body: row.body,
    hint: row.hint,
    distanceM: row.distanceM,
    timeLimitMin: row.timeLimitMin,
    revealNameAfterArrival: row.revealNameAfterArrival,
    target: { lat: row.targetLat, lng: row.targetLng },
    createdAt: row.createdAt.toISOString(),
  };
}
