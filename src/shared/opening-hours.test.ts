import assert from 'node:assert/strict';
import { test } from 'node:test';

import { openStateAt } from './opening-hours.js';

// 2026-09-01 is a Tuesday. Times below are UTC; tz shifts them to Asia/Seoul (+9).
const tueLunchUtc = new Date('2026-09-01T03:00:00Z'); // 12:00 KST Tue
const tueNightUtc = new Date('2026-09-01T16:00:00Z'); // 01:00 KST Wed

test('no weekly data is unknown', () => {
  assert.equal(openStateAt(null, tueLunchUtc), 'unknown');
  assert.equal(openStateAt({ tz: 'Asia/Seoul' }, tueLunchUtc), 'unknown');
  assert.equal(openStateAt({ tz: 'Asia/Seoul', weekly: {} }, tueLunchUtc), 'unknown');
});

test('within a range is open, outside is closed', () => {
  const h = { tz: 'Asia/Seoul', weekly: { '2': [['09:00', '18:00'] as [string, string]] } };
  assert.equal(openStateAt(h, tueLunchUtc), 'open');
  assert.equal(openStateAt(h, tueNightUtc), 'closed'); // 01:00 Wed, Wed has no entry
});

test('a day present but empty is closed', () => {
  const h = { tz: 'Asia/Seoul', weekly: { '2': [] as [string, string][] } };
  assert.equal(openStateAt(h, tueLunchUtc), 'closed');
});

test('an overnight range from the previous day counts', () => {
  // Tue 20:00 -> 02:00; at 01:00 KST Wed that Tuesday range is still open.
  const h = { tz: 'Asia/Seoul', weekly: { '2': [['20:00', '02:00'] as [string, string]] } };
  assert.equal(openStateAt(h, tueNightUtc), 'open');
});

test('closedDates overrides the weekly schedule', () => {
  const h = {
    tz: 'Asia/Seoul',
    weekly: { '2': [['09:00', '18:00'] as [string, string]] },
    closedDates: ['2026-09-01'],
  };
  assert.equal(openStateAt(h, tueLunchUtc), 'closed');
});
