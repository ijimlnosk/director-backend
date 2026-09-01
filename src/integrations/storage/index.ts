import { env } from '../../shared/config/env.js';
import { createLocalStorage } from './local-fs.js';
import { createR2Storage } from './r2.js';
import type { StorageProvider } from './storage.types.js';

function pickStorage(): StorageProvider {
  if (
    env.R2_ACCOUNT_ID &&
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY &&
    env.R2_BUCKET
  ) {
    return createR2Storage({
      accountId: env.R2_ACCOUNT_ID,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      bucket: env.R2_BUCKET,
      signedUrlTtlSec: env.SIGNED_URL_TTL_SEC,
    });
  }
  return createLocalStorage({ dir: env.MEDIA_DIR, baseUrl: env.MEDIA_BASE_URL });
}

/** Process-wide object storage: R2 when configured, else local filesystem. */
export const storage: StorageProvider = pickStorage();

export { StorageError } from './storage.types.js';
export type { StorageProvider, StoredObject } from './storage.types.js';
