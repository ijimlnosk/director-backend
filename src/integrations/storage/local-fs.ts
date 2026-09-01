import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

import { StorageError, type StorageProvider } from './storage.types.js';

const KEY_RE = /^[A-Za-z0-9][A-Za-z0-9/_.-]{0,255}$/;

/** Stores objects on the local filesystem under `dir`, served from `baseUrl`. */
export function createLocalStorage(opts: { dir: string; baseUrl: string }): StorageProvider {
  const root = resolve(opts.dir);
  const base = opts.baseUrl.replace(/\/+$/, '');
  const urlFor = (key: string): string => `${base}/${key}`;

  return {
    urlFor,
    async put(key, body, _contentType): Promise<{ key: string; url: string }> {
      if (!KEY_RE.test(key) || key.includes('..')) {
        throw new StorageError(`invalid storage key: ${key}`);
      }
      const path = join(root, key);
      if (relative(root, path).startsWith('..')) {
        throw new StorageError('storage key escapes the media root');
      }
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, body);
      return { key, url: urlFor(key) };
    },
  };
}
