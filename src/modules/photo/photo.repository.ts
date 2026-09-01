import { eq } from 'drizzle-orm';

import { db } from '../../shared/database/client.js';
import { photos, sceneResults, scenes, sessions } from '../../shared/database/schema.js';
import type { PhotoRow } from './photo.schema.js';

export interface SceneResultForPhoto {
  sceneResultId: string;
  sessionId: string;
  hostUserId: string;
  outcome: 'arrived' | 'skipped' | 'timeout' | 'vetoed';
}

/** The caller's own result for a scene, with owner and outcome. */
export async function loadSceneResultForPhoto(
  sceneId: string,
  userId: string,
): Promise<SceneResultForPhoto | undefined> {
  const [row] = await db
    .select({
      sceneResultId: sceneResults.id,
      sessionId: scenes.sessionId,
      hostUserId: sessions.hostUserId,
      outcome: sceneResults.outcome,
    })
    .from(sceneResults)
    .innerJoin(scenes, eq(scenes.id, sceneResults.sceneId))
    .innerJoin(sessions, eq(sessions.id, scenes.sessionId))
    .where(eq(sceneResults.sceneId, sceneId))
    .limit(1);
  if (row === undefined || row.hostUserId === null) return undefined;
  return row as SceneResultForPhoto;
}

export async function photoExists(sceneResultId: string): Promise<boolean> {
  const rows = await db
    .select({ id: photos.id })
    .from(photos)
    .where(eq(photos.sceneResultId, sceneResultId))
    .limit(1);
  return rows.length > 0;
}

export async function insertPhoto(args: {
  sceneResultId: string;
  storageKey: string;
  width: number;
  height: number;
}): Promise<PhotoRow> {
  const [row] = await db
    .insert(photos)
    .values({
      sceneResultId: args.sceneResultId,
      storageKey: args.storageKey,
      width: args.width,
      height: args.height,
      takenAt: new Date(),
    })
    .returning({
      id: photos.id,
      storageKey: photos.storageKey,
      width: photos.width,
      height: photos.height,
      takenAt: photos.takenAt,
      includeInCredits: photos.includeInCredits,
    });
  return row!;
}
