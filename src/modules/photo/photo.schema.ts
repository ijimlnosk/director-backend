import { z } from 'zod';

export const sceneIdParams = z.object({ sceneId: z.uuid() });
export const photoIdParams = z.object({ photoId: z.uuid() });

const latLng = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const uploadUrlBody = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

export type UploadUrlInput = z.infer<typeof uploadUrlBody>;

export const uploadUrlResponse = z.object({
  photoId: z.uuid(),
  uploadUrl: z.url(),
  /** Header the client must send on the PUT for the signature to match. */
  requiredHeaders: z.object({ 'Content-Type': z.string() }),
  expiresInSec: z.number().int(),
});

export const completePhotoBody = z.preprocess(
  (value) => value ?? {},
  z.object({
    width: z.number().int().positive().max(20_000).optional(),
    height: z.number().int().positive().max(20_000).optional(),
    title: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(2_000).optional(),
    capturedAt: z.iso.datetime({ offset: true }).optional(),
    location: latLng.optional(),
  }),
);

export type CompletePhotoInput = z.infer<typeof completePhotoBody>;

export const updatePhotoBody = z
  .object({
    includeInCredits: z.boolean().optional(),
    title: z.string().min(1).max(200).optional(),
    description: z.string().min(1).max(2_000).optional(),
    capturedAt: z.iso.datetime({ offset: true }).optional(),
    location: latLng.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'provide at least one field to update',
  });

export type UpdatePhotoInput = z.infer<typeof updatePhotoBody>;

export const photoView = z.object({
  id: z.uuid(),
  url: z.url(),
  sceneId: z.uuid(),
  sceneTitle: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  contentType: z.string().nullable(),
  bytes: z.number().int().nullable(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  capturedAt: z.string().nullable(),
  location: latLng.nullable(),
  takenAt: z.string(),
  includeInCredits: z.boolean(),
});

export type PhotoView = z.infer<typeof photoView>;

export const photoResponse = z.object({ photo: photoView });

export interface PhotoRow {
  id: string;
  sceneId: string;
  sceneTitle: string;
  title: string | null;
  description: string | null;
  contentType: string | null;
  bytes: number | null;
  width: number | null;
  height: number | null;
  capturedAt: Date | null;
  lat: number | null;
  lng: number | null;
  takenAt: Date;
  includeInCredits: boolean;
}

export function toPhotoView(row: PhotoRow, url: string): PhotoView {
  return {
    id: row.id,
    url,
    sceneId: row.sceneId,
    sceneTitle: row.sceneTitle,
    title: row.title,
    description: row.description,
    contentType: row.contentType,
    bytes: row.bytes,
    width: row.width,
    height: row.height,
    capturedAt: row.capturedAt?.toISOString() ?? null,
    location:
      row.lat !== null && row.lng !== null ? { lat: row.lat, lng: row.lng } : null,
    takenAt: row.takenAt.toISOString(),
    includeInCredits: row.includeInCredits,
  };
}
