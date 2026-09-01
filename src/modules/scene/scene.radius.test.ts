import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MIN_STEP_M, SEARCH_RADIUS_M } from './scene.constants.js';
import { hopRadiusM } from './scene.templates.js';

test('hopRadiusM shrinks as the session runs down', () => {
  const early = hopRadiusM('walk', 180);
  const late = hopRadiusM('walk', 30);
  assert.ok(late < early, `${late} should be < ${early}`);
});

test('hopRadiusM never exceeds the transport ceiling', () => {
  assert.equal(hopRadiusM('walk', 100_000), SEARCH_RADIUS_M.walk);
  assert.equal(hopRadiusM('transit', 100_000), SEARCH_RADIUS_M.transit);
});

test('hopRadiusM keeps a usable floor when almost no time is left', () => {
  const r = hopRadiusM('walk', 0);
  assert.ok(r >= MIN_STEP_M.walk * 3);
});

test('transit reaches farther than walk for the same time', () => {
  assert.ok(hopRadiusM('transit', 60) > hopRadiusM('walk', 60));
});
