export interface StoredObject {
  key: string;
}

export interface StorageProvider {
  readonly kind: 'local' | 'r2';
  put(key: string, body: Buffer, contentType: string): Promise<StoredObject>;
  /** A URL a client can GET the object from. For R2 this is a time-limited
   *  presigned URL, so callers must resolve it fresh rather than store it. */
  urlFor(key: string): Promise<string>;
}

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}
