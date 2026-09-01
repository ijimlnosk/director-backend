import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildCutCopy } from './cut.templates.js';

test('buildCutCopy formats the date title and a stats summary line', () => {
  const copy = buildCutCopy({
    endedAt: new Date('2026-09-01T12:30:00Z'),
    arrivedCount: 3,
    skippedCount: 1,
    totalWalkedM: 2450,
  });
  assert.match(copy.title, /^2026\.09\.0[12]의 여정$/);
  assert.equal(copy.summaryLine, '도착 3 · 건너뜀 1 · 2.5km');
});

test('buildCutCopy handles a zero-distance session', () => {
  const copy = buildCutCopy({
    endedAt: new Date('2026-01-05T00:00:00Z'),
    arrivedCount: 0,
    skippedCount: 0,
    totalWalkedM: 0,
  });
  assert.equal(copy.summaryLine, '도착 0 · 건너뜀 0 · 0m');
});
