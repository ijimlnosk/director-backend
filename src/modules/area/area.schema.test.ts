import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createAreaBody } from './area.schema.js';

test('createAreaBody applies radius and isLive defaults', () => {
  const parsed = createAreaBody.parse({
    name: '금천구 독산동',
    center: { lat: 37.4665, lng: 126.895 },
  });
  assert.equal(parsed.radiusM, 2000);
  assert.equal(parsed.isLive, true);
});

test('createAreaBody rejects an out-of-range centre', () => {
  const result = createAreaBody.safeParse({
    name: 'x',
    center: { lat: 200, lng: 0 },
  });
  assert.equal(result.success, false);
});

test('createAreaBody rejects too-large a radius', () => {
  const result = createAreaBody.safeParse({
    name: 'x',
    center: { lat: 37, lng: 127 },
    radiusM: 999_999,
  });
  assert.equal(result.success, false);
});
