import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import {
  StorageError,
  type HeadResult,
  type StorageProvider,
} from './storage.types.js';

export interface R2Options {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

/** Cloudflare R2 (S3-compatible). The bucket is private: the client uploads
 *  with a presigned PUT and reads with a presigned GET; the binary never
 *  touches this server. */
export function createR2Storage(opts: R2Options): StorageProvider {
  const client = new S3Client({
    region: 'auto',
    endpoint: opts.endpoint,
    // R2's TLS cert is *.r2.cloudflarestorage.com (one level); a virtual-hosted
    // bucket subdomain would break TLS, so force path-style.
    forcePathStyle: true,
    credentials: {
      accessKeyId: opts.accessKeyId,
      secretAccessKey: opts.secretAccessKey,
    },
  });

  return {
    kind: 'r2',
    presignPut(key, contentType, expiresInSec): Promise<string> {
      return getSignedUrl(
        client,
        new PutObjectCommand({ Bucket: opts.bucket, Key: key, ContentType: contentType }),
        { expiresIn: expiresInSec, signableHeaders: new Set(['content-type']) },
      );
    },
    async head(key): Promise<HeadResult | null> {
      try {
        const out = await client.send(
          new HeadObjectCommand({ Bucket: opts.bucket, Key: key }),
        );
        return {
          contentType: out.ContentType ?? null,
          contentLength: out.ContentLength ?? 0,
        };
      } catch (error) {
        const name = (error as { name?: string }).name;
        if (name === 'NotFound' || name === 'NoSuchKey') return null;
        throw new StorageError(
          `R2 head failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
    presignGet(key, expiresInSec): Promise<string> {
      return getSignedUrl(client, new GetObjectCommand({ Bucket: opts.bucket, Key: key }), {
        expiresIn: expiresInSec,
      });
    },
  };
}
