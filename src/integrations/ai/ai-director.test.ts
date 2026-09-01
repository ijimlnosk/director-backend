import assert from 'node:assert/strict';
import { test } from 'node:test';

import { directorDecisionSchema } from './ai-director.types.js';

test('directorDecisionSchema accepts a well-formed decision', () => {
  const result = directorDecisionSchema.safeParse({
    placeId: '33333333-3333-4333-8333-333333333333',
    sceneType: 'photo',
    title: '골목 끝의 무언가',
    body: '10분쯤 걸어가 보세요. 도착하면 알게 됩니다.',
    hint: '커피 냄새가 나는 곳입니다.',
  });
  assert.equal(result.success, true);
});

test('directorDecisionSchema rejects a missing placeId', () => {
  const result = directorDecisionSchema.safeParse({
    title: 't',
    body: 'b',
    hint: 'h',
  });
  assert.equal(result.success, false);
});

test('directorDecisionSchema rejects empty copy', () => {
  const result = directorDecisionSchema.safeParse({
    placeId: 'x',
    title: '',
    body: 'b',
    hint: 'h',
  });
  assert.equal(result.success, false);
});
