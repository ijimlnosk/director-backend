import { GET_URL_TTL_SEC, PUT_URL_TTL_SEC, storage } from '../../integrations/storage/index.js';
import { env } from '../../shared/config/env.js';
import {
  conflict,
  constraintFailed,
  forbidden,
  notFound,
  validationFailed,
} from '../../shared/errors/app-error.js';
import { checkUploadedObject, photoObjectKey } from './photo.keys.js';
import {
  findPhotoById,
  findPhotoBySceneResult,
  loadSceneResultForPhoto,
  markPhotoReady,
  upsertPendingPhoto,
} from './photo.repository.js';
import { toPhotoView, type CompletePhotoInput, type PhotoView } from './photo.schema.js';

export interface UploadUrlResult {
  photoId: string;
  uploadUrl: string;
  requiredHeaders: { 'Content-Type': string };
  expiresInSec: number;
}

/** Issue a presigned PUT URL for the caller's arrived result of a scene. */
export async function createUploadUrl(
  userId: string,
  sceneId: string,
  contentType: string,
): Promise<UploadUrlResult> {
  const result = await loadSceneResultForPhoto(sceneId);
  if (result === undefined) {
    throw notFound('scene result');
  }
  if (result.hostUserId !== userId) {
    throw forbidden('You do not have access to this scene');
  }
  if (result.outcome !== 'arrived') {
    throw conflict(`Scene result is "${result.outcome}"; a photo needs an arrival`);
  }
  const existing = await findPhotoBySceneResult(result.sceneResultId);
  if (existing?.status === 'ready') {
    throw conflict('This scene already has a photo');
  }

  const key = photoObjectKey(result.sessionId, sceneId, contentType);
  const photoId = await upsertPendingPhoto(result.sceneResultId, key);
  const uploadUrl = await storage.presignPut(key, contentType, PUT_URL_TTL_SEC);

  return {
    photoId,
    uploadUrl,
    requiredHeaders: { 'Content-Type': contentType },
    expiresInSec: PUT_URL_TTL_SEC,
  };
}

/** Verify the uploaded object and mark the photo ready. */
export async function completePhoto(
  userId: string,
  photoId: string,
  body: CompletePhotoInput,
): Promise<PhotoView> {
  const photo = await findPhotoById(photoId);
  if (photo === undefined) {
    throw notFound('photo');
  }
  if (photo.hostUserId !== userId) {
    throw forbidden('You do not have access to this photo');
  }
  if (photo.status === 'ready') {
    throw conflict('Photo is already complete');
  }

  const head = await storage.head(photo.storageKey);
  const check = checkUploadedObject(head, env.PHOTO_MAX_BYTES);
  if (!check.ok) {
    throw constraintFailed(check.reason ?? 'uploaded object failed validation');
  }
  if (head === null || head.contentType === null) {
    throw validationFailed('missing content type on the uploaded object');
  }

  const row = await markPhotoReady({
    photoId,
    contentType: head.contentType,
    bytes: head.contentLength,
    width: body.width ?? null,
    height: body.height ?? null,
  });
  return toPhotoView(row, await storage.presignGet(photo.storageKey, GET_URL_TTL_SEC));
}
