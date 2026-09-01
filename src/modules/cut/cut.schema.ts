import { z } from 'zod';

export const cutParams = z.object({ sessionId: z.uuid() });

export const cutSceneLine = z.object({
  seq: z.number().int(),
  type: z.enum(['move', 'choose', 'photo', 'observe', 'split']),
  title: z.string(),
  outcome: z.enum(['arrived', 'skipped', 'timeout']).nullable(),
  placeName: z.string().nullable(),
  distanceM: z.number().int(),
});

export const cutView = z.object({
  sessionId: z.uuid(),
  title: z.string(),
  summaryLine: z.string(),
  totalDistanceM: z.number().int(),
  runtimeSec: z.number().int(),
  coverPhotoId: z.uuid().nullable(),
  visibility: z.enum(['private', 'link']),
  scenes: z.array(cutSceneLine),
});

export type CutView = z.infer<typeof cutView>;

export const cutResponse = z.object({ cut: cutView });

export interface CutRow {
  sessionId: string;
  title: string;
  summaryLine: string;
  totalDistanceM: number;
  runtimeSec: number;
  coverPhotoId: string | null;
  visibility: 'private' | 'link';
}

export interface CutSceneRow {
  seq: number;
  type: CutView['scenes'][number]['type'];
  title: string;
  outcome: 'arrived' | 'skipped' | 'timeout' | null;
  placeName: string | null;
  distanceM: number;
}

export function toCutView(cut: CutRow, scenes: CutSceneRow[]): CutView {
  return { ...cut, scenes };
}
