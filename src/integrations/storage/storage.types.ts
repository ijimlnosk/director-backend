export interface HeadResult {
  contentType: string | null;
  contentLength: number;
}

export interface StorageProvider {
  readonly kind: 'local' | 'r2';
  /** Presigned URL the client PUTs the binary to. The signature pins
   *  `contentType`, so the client must send exactly that Content-Type. */
  presignPut(key: string, contentType: string, expiresInSec: number): Promise<string>;
  /** Object metadata, or null if it does not exist. */
  head(key: string): Promise<HeadResult | null>;
  /** Time-limited URL the client GETs the binary from. */
  presignGet(key: string, expiresInSec: number): Promise<string>;
}

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}
