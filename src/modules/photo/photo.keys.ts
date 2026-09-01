import { randomUUID } from 'node:crypto';

/** Allowed upload types and the extension used in the object key. */
export const IMAGE_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function extForContentType(contentType: string): string | undefined {
  return IMAGE_EXT[contentType.toLowerCase().split(';')[0]?.trim() ?? ''];
}

/** Opaque, filename-free object key. */
export function photoObjectKey(sessionId: string, sceneId: string, contentType: string): string {
  const ext = extForContentType(contentType);
  if (ext === undefined) {
    throw new Error(`unsupported content type: ${contentType}`);
  }
  return `sessions/${sessionId}/scenes/${sceneId}/${randomUUID()}.${ext}`;
}

export interface UploadCheck {
  ok: boolean;
  reason?: string;
}

/** Validate a HeadObject result against the upload contract. */
export function checkUploadedObject(
  head: { contentType: string | null; contentLength: number } | null,
  maxBytes: number,
): UploadCheck {
  if (head === null) return { ok: false, reason: 'object has not been uploaded' };
  if (head.contentType === null || extForContentType(head.contentType) === undefined) {
    return { ok: false, reason: `content type "${head.contentType ?? 'unknown'}" is not allowed` };
  }
  if (head.contentLength <= 0) return { ok: false, reason: 'uploaded object is empty' };
  if (head.contentLength > maxBytes) {
    return { ok: false, reason: `object is ${head.contentLength} bytes, over the ${maxBytes} limit` };
  }
  return { ok: true };
}
