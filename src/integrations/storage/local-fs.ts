import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

import { StorageError, type StorageProvider, type StoredObject } from './storage.types.js';

const KEY_RE = /^[A-Za-z0-9][A-Za-z0-9/_.-]{0,255}$/;

function assertSafeKey(root: string, key: string): void {
  if (!KEY_RE.test(key) || key.includes('..')) {
    throw new StorageError(`invalid storage key: ${key}`);
  }
  if (relative(root, join(root, key)).startsWith('..')) {
    throw new StorageError('storage key escapes the media root');
  }
}

/** Stores objects on the local filesystem under `dir`, served from `baseUrl`. */
export function createLocalStorage(opts: { dir: string; baseUrl: string }): StorageProvider {
  const root = resolve(opts.dir);
  const base = opts.baseUrl.replace(/\/+$/, '');

  return {
    kind: 'local',
    async put(key, body): Promise<StoredObject> {
      assertSafeKey(root, key);
      const path = join(root, key);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, body);
      return { key };
    },
    urlFor(key): Promise<string> {
      assertSafeKey(root, key);
      return Promise.resolve(`${base}/${key}`);
    },
  };
}
