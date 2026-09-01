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

export async function loadSceneResultForPhoto(
  sceneId: string,
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
  return row as SceneResultForPhoto | undefined;
}

export interface PhotoFull extends PhotoRow {
  sceneResultId: string;
  storageKey: string;
  status: 'pending' | 'ready';
  hostUserId: string;
}

const READY_RETURN = {
  id: photos.id,
  contentType: photos.contentType,
  bytes: photos.bytes,
  width: photos.width,
  height: photos.height,
  takenAt: photos.takenAt,
  includeInCredits: photos.includeInCredits,
} as const;

const PHOTO_FULL = {
  id: photos.id,
  sceneResultId: photos.sceneResultId,
  storageKey: photos.storageKey,
  status: photos.status,
  hostUserId: sessions.hostUserId,
  contentType: photos.contentType,
  bytes: photos.bytes,
  width: photos.width,
  height: photos.height,
  takenAt: photos.takenAt,
  includeInCredits: photos.includeInCredits,
} as const;

function photoQuery() {
  return db
    .select(PHOTO_FULL)
    .from(photos)
    .innerJoin(sceneResults, eq(sceneResults.id, photos.sceneResultId))
    .innerJoin(scenes, eq(scenes.id, sceneResults.sceneId))
    .innerJoin(sessions, eq(sessions.id, scenes.sessionId));
}

export async function findPhotoForScene(sceneId: string): Promise<PhotoFull | undefined> {
  const [row] = await photoQuery().where(eq(scenes.id, sceneId)).limit(1);
  return row as PhotoFull | undefined;
}

export async function findPhotoById(photoId: string): Promise<PhotoFull | undefined> {
  const [row] = await photoQuery().where(eq(photos.id, photoId)).limit(1);
  return row as PhotoFull | undefined;
}

/** Create (or re-key) the pending photo row for a scene result. */
export async function upsertPendingPhoto(
  sceneResultId: string,
  storageKey: string,
): Promise<string> {
  const [row] = await db
    .insert(photos)
    .values({ sceneResultId, storageKey, status: 'pending' })
    .onConflictDoUpdate({
      target: photos.sceneResultId,
      set: { storageKey, status: 'pending', contentType: null, bytes: null },
    })
    .returning({ id: photos.id });
  return row!.id;
}

export async function markPhotoReady(args: {
  photoId: string;
  contentType: string;
  bytes: number;
  width: number | null;
  height: number | null;
}): Promise<PhotoRow> {
  const [row] = await db
    .update(photos)
    .set({
      status: 'ready',
      contentType: args.contentType,
      bytes: args.bytes,
      width: args.width,
      height: args.height,
    })
    .where(eq(photos.id, args.photoId))
    .returning(READY_RETURN);
  return row!;
}

export async function setIncludeInCredits(
  photoId: string,
  includeInCredits: boolean,
): Promise<PhotoRow> {
  const [row] = await db
    .update(photos)
    .set({ includeInCredits })
    .where(eq(photos.id, photoId))
    .returning(READY_RETURN);
  return row!;
}
