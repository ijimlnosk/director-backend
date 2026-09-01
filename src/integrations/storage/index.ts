import { env } from '../../shared/config/env.js';
import { createLocalStorage } from './local-fs.js';
import { createR2Storage } from './r2.js';
import type { StorageProvider } from './storage.types.js';

/** Presigned upload URLs live for 5 minutes, download URLs for 10. */
export const PUT_URL_TTL_SEC = 300;
export const GET_URL_TTL_SEC = 600;

function pickStorage(): StorageProvider {
  if (
    env.R2_ENDPOINT &&
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY &&
    env.R2_BUCKET
  ) {
    return createR2Storage({
      endpoint: env.R2_ENDPOINT,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      bucket: env.R2_BUCKET,
    });
  }
  return createLocalStorage({ dir: env.MEDIA_DIR, baseUrl: env.MEDIA_BASE_URL });
}

/** Process-wide object storage: R2 when configured, else local filesystem. */
export const storage: StorageProvider = pickStorage();

export { StorageError } from './storage.types.js';
export { writeLocalObject } from './local-fs.js';
export type { HeadResult, StorageProvider } from './storage.types.js';
