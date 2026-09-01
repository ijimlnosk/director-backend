import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { StorageError, type StorageProvider, type StoredObject } from './storage.types.js';

export interface R2Options {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  signedUrlTtlSec: number;
}

/** Cloudflare R2 (S3-compatible). Objects stay private; reads go through a
 *  time-limited presigned GET URL. */
export function createR2Storage(opts: R2Options): StorageProvider {
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${opts.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: opts.accessKeyId,
      secretAccessKey: opts.secretAccessKey,
    },
  });

  return {
    kind: 'r2',
    async put(key, body, contentType): Promise<StoredObject> {
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: opts.bucket,
            Key: key,
            Body: body,
            ContentType: contentType,
          }),
        );
      } catch (error) {
        throw new StorageError(
          `R2 put failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      return { key };
    },
    async urlFor(key): Promise<string> {
      try {
        return await getSignedUrl(
          client,
          new GetObjectCommand({ Bucket: opts.bucket, Key: key }),
          { expiresIn: opts.signedUrlTtlSec },
        );
      } catch (error) {
        throw new StorageError(
          `R2 presign failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  };
}
