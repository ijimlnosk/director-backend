import { randomUUID } from 'node:crypto';

import { storage } from '../../integrations/storage/index.js';
import { conflict, forbidden, notFound, validationFailed } from '../../shared/errors/app-error.js';
import {
  insertPhoto,
  loadSceneResultForPhoto,
  photoExists,
} from './photo.repository.js';
import { toPhotoView, type PhotoView } from './photo.schema.js';
import { validateImage } from './photo.validate.js';

export interface PhotoUpload {
  buffer: Buffer;
  mimetype: string;
  truncated: boolean;
}

/** Attach a photo to the caller's arrived result for a scene. */
export async function attachPhoto(
  userId: string,
  sceneId: string,
  upload: PhotoUpload,
): Promise<PhotoView> {
  if (upload.truncated) {
    throw validationFailed('Image exceeds the maximum allowed size');
  }

  const result = await loadSceneResultForPhoto(sceneId, userId);
  if (result === undefined) {
    throw notFound('scene result');
  }
  if (result.hostUserId !== userId) {
    throw forbidden('You do not have access to this scene');
  }
  if (result.outcome !== 'arrived') {
    throw conflict(`Scene result is "${result.outcome}"; a photo needs an arrival`);
  }
  if (await photoExists(result.sceneResultId)) {
    throw conflict('This scene already has a photo');
  }

  let image;
  try {
    image = validateImage(upload.buffer, upload.mimetype);
  } catch (error) {
    throw validationFailed(error instanceof Error ? error.message : 'invalid image');
  }

  const key = `sessions/${result.sessionId}/scenes/${sceneId}/${randomUUID()}.${image.ext}`;
  await storage.put(key, upload.buffer, upload.mimetype);

  const row = await insertPhoto({
    sceneResultId: result.sceneResultId,
    storageKey: key,
    width: image.width,
    height: image.height,
  });
  return toPhotoView(row, await storage.urlFor(key));
}
