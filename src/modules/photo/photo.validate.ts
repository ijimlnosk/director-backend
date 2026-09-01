import { imageSize } from 'image-size';

import { ALLOWED_IMAGE_TYPES } from './photo.schema.js';

export interface ValidatedImage {
  ext: string;
  width: number;
  height: number;
}

/** Check the declared type is an allowed image and the bytes decode to it. */
export function validateImage(buffer: Buffer, mimetype: string): ValidatedImage {
  const ext = ALLOWED_IMAGE_TYPES[mimetype];
  if (ext === undefined) {
    throw new Error(`unsupported image type: ${mimetype || 'unknown'}`);
  }
  let dims: { width?: number; height?: number; type?: string };
  try {
    dims = imageSize(buffer);
  } catch {
    throw new Error('file is not a readable image');
  }
  if (!dims.width || !dims.height) {
    throw new Error('could not read image dimensions');
  }
  return { ext, width: dims.width, height: dims.height };
}
