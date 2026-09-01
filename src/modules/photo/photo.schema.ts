import { z } from 'zod';

export const sceneIdParams = z.object({ sceneId: z.uuid() });
export const photoIdParams = z.object({ photoId: z.uuid() });

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

export const completePhotoBody = z.object({
  width: z.number().int().positive().max(20_000).optional(),
  height: z.number().int().positive().max(20_000).optional(),
});

export type CompletePhotoInput = z.infer<typeof completePhotoBody>;

export const photoView = z.object({
  id: z.uuid(),
  url: z.url(),
  contentType: z.string().nullable(),
  bytes: z.number().int().nullable(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  takenAt: z.string(),
  includeInCredits: z.boolean(),
});

export type PhotoView = z.infer<typeof photoView>;

export const photoResponse = z.object({ photo: photoView });

export interface PhotoRow {
  id: string;
  contentType: string | null;
  bytes: number | null;
  width: number | null;
  height: number | null;
  takenAt: Date;
  includeInCredits: boolean;
}

export function toPhotoView(row: PhotoRow, url: string): PhotoView {
  return {
    id: row.id,
    url,
    contentType: row.contentType,
    bytes: row.bytes,
    width: row.width,
    height: row.height,
    takenAt: row.takenAt.toISOString(),
    includeInCredits: row.includeInCredits,
  };
}
