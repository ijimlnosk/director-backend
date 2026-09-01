import assert from 'node:assert/strict';
import { test } from 'node:test';

import { validateImage } from './photo.validate.js';

// 1x1 transparent PNG
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

test('validateImage reads a real PNG', () => {
  const result = validateImage(PNG_1x1, 'image/png');
  assert.deepEqual(result, { ext: 'png', width: 1, height: 1 });
});

test('validateImage rejects a non-image mimetype', () => {
  assert.throws(() => validateImage(PNG_1x1, 'application/pdf'), /unsupported image type/);
});

test('validateImage rejects bytes that are not an image', () => {
  assert.throws(
    () => validateImage(Buffer.from('not an image at all'), 'image/png'),
    /not a readable image/,
  );
});
