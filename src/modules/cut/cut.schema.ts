import { z } from 'zod';

export const cutParams = z.object({ sessionId: z.uuid() });

export const cutSceneLine = z.object({
  seq: z.number().int(),
  type: z.enum(['move', 'choose', 'photo', 'observe', 'split']),
  title: z.string(),
  outcome: z.enum(['arrived', 'skipped', 'timeout', 'vetoed']).nullable(),
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
  coverPhotoUrl: z.url().nullable(),
  visibility: z.enum(['private', 'link']),
  shareSlug: z.string().nullable(),
  scenes: z.array(cutSceneLine),
});

export type CutView = z.infer<typeof cutView>;

export const cutResponse = z.object({ cut: cutView });

export const slugParams = z.object({ slug: z.string().min(8).max(64) });

export const shareResponse = z.object({
  shareSlug: z.string(),
  visibility: z.enum(['private', 'link']),
});

export const unshareResponse = z.object({
  shareSlug: z.string().nullable(),
  visibility: z.enum(['private', 'link']),
});

export interface CutRow {
  sessionId: string;
  title: string;
  summaryLine: string;
  totalDistanceM: number;
  runtimeSec: number;
  coverPhotoId: string | null;
  visibility: 'private' | 'link';
  shareSlug: string | null;
}

export interface CutSceneRow {
  seq: number;
  type: CutView['scenes'][number]['type'];
  title: string;
  outcome: 'arrived' | 'skipped' | 'timeout' | 'vetoed' | null;
  placeName: string | null;
  distanceM: number;
}

export function toCutView(
  cut: CutRow,
  scenes: CutSceneRow[],
  coverPhotoUrl: string | null,
): CutView {
  return { ...cut, coverPhotoUrl, scenes };
}
