import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkUploadedObject, extForContentType, photoObjectKey } from './photo.keys.js';

test('extForContentType maps allowed types and ignores parameters', () => {
  assert.equal(extForContentType('image/jpeg'), 'jpg');
  assert.equal(extForContentType('image/png; charset=binary'), 'png');
  assert.equal(extForContentType('image/webp'), 'webp');
  assert.equal(extForContentType('image/gif'), undefined);
  assert.equal(extForContentType('application/pdf'), undefined);
});

test('photoObjectKey is filename-free, scoped, and unique', () => {
  const a = photoObjectKey('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'image/jpeg');
  const b = photoObjectKey('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'image/jpeg');
  assert.match(a, /^sessions\/11111111-1111-4111-8111-111111111111\/scenes\/22222222-2222-4222-8222-222222222222\/[0-9a-f-]{36}\.jpg$/);
  assert.notEqual(a, b);
});

test('photoObjectKey rejects an unsupported content type', () => {
  assert.throws(() => photoObjectKey('s', 'c', 'image/gif'), /unsupported content type/);
});

test('checkUploadedObject enforces the upload contract', () => {
  const max = 8_388_608;
  assert.equal(checkUploadedObject(null, max).ok, false);
  assert.equal(checkUploadedObject({ contentType: 'image/jpeg', contentLength: 0 }, max).ok, false);
  assert.equal(checkUploadedObject({ contentType: 'text/plain', contentLength: 10 }, max).ok, false);
  assert.equal(checkUploadedObject({ contentType: 'image/jpeg', contentLength: max + 1 }, max).ok, false);
  assert.equal(checkUploadedObject({ contentType: 'image/jpeg', contentLength: 1234 }, max).ok, true);
});
