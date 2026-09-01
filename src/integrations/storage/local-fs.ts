import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';

import {
  StorageError,
  type HeadResult,
  type StorageProvider,
} from './storage.types.js';

const KEY_RE = /^[A-Za-z0-9][A-Za-z0-9/_.-]{0,255}$/;

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

/**
 * Filesystem-backed storage for local dev and tests. It fakes the presigned
 * flow: `presignPut` returns a URL to the app's own `PUT /media-upload/*`
 * route, reads are served as static files at `MEDIA_BASE_URL`.
 */
export function createLocalStorage(opts: { dir: string; baseUrl: string }): StorageProvider {
  const root = resolve(opts.dir);
  const getBase = opts.baseUrl.replace(/\/+$/, '');
  const putBase = getBase.replace(/\/media$/, '/media-upload');

  const pathFor = (key: string): string => {
    if (!KEY_RE.test(key) || key.includes('..')) {
      throw new StorageError(`invalid storage key: ${key}`);
    }
    const path = join(root, key);
    if (relative(root, path).startsWith('..')) {
      throw new StorageError('storage key escapes the media root');
    }
    return path;
  };

  return {
    kind: 'local',
    presignPut(key): Promise<string> {
      pathFor(key);
      return Promise.resolve(`${putBase}/${key}`);
    },
    async head(key): Promise<HeadResult | null> {
      try {
        const info = await stat(pathFor(key));
        return {
          contentType: CONTENT_TYPE_BY_EXT[extname(key).toLowerCase()] ?? null,
          contentLength: info.size,
        };
      } catch {
        return null;
      }
    },
    presignGet(key): Promise<string> {
      pathFor(key);
      return Promise.resolve(`${getBase}/${key}`);
    },
  };
}

/** Used only by the local dev `PUT /media-upload/*` route. */
export async function writeLocalObject(dir: string, key: string, body: Buffer): Promise<void> {
  const root = resolve(dir);
  if (!KEY_RE.test(key) || key.includes('..')) {
    throw new StorageError(`invalid storage key: ${key}`);
  }
  const path = join(root, key);
  if (relative(root, path).startsWith('..')) {
    throw new StorageError('storage key escapes the media root');
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, body);
}
