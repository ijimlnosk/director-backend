import { z } from 'zod';

export const photoParams = z.object({ sceneId: z.uuid() });

export const photoView = z.object({
  id: z.uuid(),
  url: z.url(),
  width: z.number().int(),
  height: z.number().int(),
  takenAt: z.string(),
  includeInCredits: z.boolean(),
});

export type PhotoView = z.infer<typeof photoView>;

export const photoResponse = z.object({ photo: photoView });

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export interface PhotoRow {
  id: string;
  storageKey: string;
  width: number;
  height: number;
  takenAt: Date;
  includeInCredits: boolean;
}

export function toPhotoView(row: PhotoRow, url: string): PhotoView {
  return {
    id: row.id,
    url,
    width: row.width,
    height: row.height,
    takenAt: row.takenAt.toISOString(),
    includeInCredits: row.includeInCredits,
  };
}
