import { z } from 'zod';

import { SKIP_REASONS } from './scene.constants.js';

export const nextSceneParams = z.object({ sessionId: z.uuid() });

export const sceneIdParams = z.object({ sceneId: z.uuid() });

const latLng = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const completeSceneBody = z.object({
  verifiedBy: z.enum(['gps', 'manual']),
  point: latLng.optional(),
  elapsedSec: z.number().int().min(0).max(86_400),
  walkedM: z.number().int().min(0).max(200_000),
});

export type CompleteSceneInput = z.infer<typeof completeSceneBody>;

export const skipSceneBody = z.object({
  reason: z.enum(SKIP_REASONS),
  elapsedSec: z.number().int().min(0).max(86_400).default(0),
  walkedM: z.number().int().min(0).max(200_000).default(0),
});

export type SkipSceneInput = z.infer<typeof skipSceneBody>;

export const sceneResultView = z.object({
  id: z.uuid(),
  sceneId: z.uuid(),
  outcome: z.enum(['arrived', 'skipped', 'timeout']),
  verifiedBy: z.enum(['gps', 'manual']),
  skipReason: z.string().nullable(),
  elapsedSec: z.number().int(),
  walkedM: z.number().int(),
  recordedAt: z.string(),
});

export type SceneResultView = z.infer<typeof sceneResultView>;

export const sceneResultResponse = z.object({ result: sceneResultView });

export interface SceneResultRow {
  id: string;
  sceneId: string;
  outcome: 'arrived' | 'skipped' | 'timeout';
  verifiedBy: 'gps' | 'manual';
  skipReason: string | null;
  elapsedSec: number;
  walkedM: number;
  recordedAt: Date;
}

export function toSceneResultView(row: SceneResultRow): SceneResultView {
  return {
    id: row.id,
    sceneId: row.sceneId,
    outcome: row.outcome,
    verifiedBy: row.verifiedBy,
    skipReason: row.skipReason,
    elapsedSec: row.elapsedSec,
    walkedM: row.walkedM,
    recordedAt: row.recordedAt.toISOString(),
  };
}

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
