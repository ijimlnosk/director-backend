import { env } from '../../shared/config/env.js';
import { createLocalStorage } from './local-fs.js';
import type { StorageProvider } from './storage.types.js';

/** Process-wide object storage (local filesystem for now). */
export const storage: StorageProvider = createLocalStorage({
  dir: env.MEDIA_DIR,
  baseUrl: env.MEDIA_BASE_URL,
});

export { StorageError } from './storage.types.js';
export type { StorageProvider, StoredObject } from './storage.types.js';
