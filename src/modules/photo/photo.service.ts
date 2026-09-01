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
  findPhotoForScene,
  loadSceneResultForPhoto,
  markPhotoReady,
  updatePhotoMeta,
  upsertPendingPhoto,
  type PhotoFull,
  type PhotoMetaPatch,
} from './photo.repository.js';
import {
  toPhotoView,
  type CompletePhotoInput,
  type PhotoView,
  type UpdatePhotoInput,
} from './photo.schema.js';

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
  const existing = await findPhotoForScene(sceneId);
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

async function viewOf(photo: PhotoFull): Promise<PhotoView> {
  return toPhotoView(photo, await storage.presignGet(photo.storageKey, GET_URL_TTL_SEC));
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

  await markPhotoReady({
    photoId,
    contentType: head.contentType,
    bytes: head.contentLength,
    width: body.width ?? null,
    height: body.height ?? null,
    title: body.title ?? null,
    description: body.description ?? null,
    capturedAt: body.capturedAt ? new Date(body.capturedAt) : null,
    lat: body.location?.lat ?? null,
    lng: body.location?.lng ?? null,
  });
  return viewOf((await findPhotoById(photoId))!);
}

async function readablePhoto(userId: string, photo: PhotoFull | undefined): Promise<PhotoView> {
  if (photo === undefined || photo.status !== 'ready') {
    throw notFound('photo');
  }
  if (photo.hostUserId !== userId) {
    throw forbidden('You do not have access to this photo');
  }
  return viewOf(photo);
}

/** Fresh signed URL + metadata for a scene's photo. */
export async function getScenePhoto(userId: string, sceneId: string): Promise<PhotoView> {
  return readablePhoto(userId, await findPhotoForScene(sceneId));
}

export async function getPhoto(userId: string, photoId: string): Promise<PhotoView> {
  return readablePhoto(userId, await findPhotoById(photoId));
}

/** Update a ready photo's credits flag and/or its metadata. */
export async function updatePhoto(
  userId: string,
  photoId: string,
  body: UpdatePhotoInput,
): Promise<PhotoView> {
  const photo = await findPhotoById(photoId);
  if (photo === undefined || photo.status !== 'ready') {
    throw notFound('photo');
  }
  if (photo.hostUserId !== userId) {
    throw forbidden('You do not have access to this photo');
  }

  const patch: PhotoMetaPatch = {};
  if (body.includeInCredits !== undefined) patch.includeInCredits = body.includeInCredits;
  if (body.title !== undefined) patch.title = body.title;
  if (body.description !== undefined) patch.description = body.description;
  if (body.capturedAt !== undefined) patch.capturedAt = new Date(body.capturedAt);
  if (body.location !== undefined) {
    patch.lat = body.location.lat;
    patch.lng = body.location.lng;
  }

  await updatePhotoMeta(photoId, patch);
  return viewOf((await findPhotoById(photoId))!);
}
