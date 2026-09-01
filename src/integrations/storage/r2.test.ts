import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createR2Storage } from './r2.js';

const r2 = createR2Storage({
  endpoint: 'https://acc123.r2.cloudflarestorage.com',
  accessKeyId: 'test-key',
  secretAccessKey: 'test-secret',
  bucket: 'director-media',
});

test('presignPut signs Content-Type and targets the bucket/key', async () => {
  const url = await r2.presignPut('sessions/a/scenes/b/x.jpg', 'image/jpeg', 300);
  const u = new URL(url);
  assert.equal(u.host, 'acc123.r2.cloudflarestorage.com');
  assert.ok(u.pathname.endsWith('/director-media/sessions/a/scenes/b/x.jpg'));
  assert.equal(u.searchParams.get('X-Amz-Expires'), '300');
  assert.match(u.searchParams.get('X-Amz-SignedHeaders') ?? '', /content-type/);
  assert.ok(u.searchParams.get('X-Amz-Signature'));
});

test('presignGet is time-limited and unsigned for content-type', async () => {
  const url = await r2.presignGet('sessions/a/scenes/b/x.jpg', 600);
  const u = new URL(url);
  assert.equal(u.searchParams.get('X-Amz-Expires'), '600');
  assert.doesNotMatch(u.searchParams.get('X-Amz-SignedHeaders') ?? '', /content-type/);
});
