import assert from 'node:assert/strict';
import { test } from 'node:test';

import { vetoSceneBody } from './scene.schema.js';

test('vetoSceneBody accepts each scope', () => {
  for (const scope of ['place', 'category', 'both']) {
    assert.equal(vetoSceneBody.safeParse({ scope }).success, true, scope);
  }
});

test('vetoSceneBody rejects an unknown scope', () => {
  assert.equal(vetoSceneBody.safeParse({ scope: 'everything' }).success, false);
});

test('vetoSceneBody keeps an optional reason', () => {
  const parsed = vetoSceneBody.parse({ scope: 'both', reason: '너무 시끄러움' });
  assert.equal(parsed.reason, '너무 시끄러움');
});
