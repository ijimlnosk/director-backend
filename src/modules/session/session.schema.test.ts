import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createSessionBody, toSessionView, type SessionRow } from './session.schema.js';

const baseRow: SessionRow = {
  id: '11111111-1111-4111-8111-111111111111',
  hostUserId: '22222222-2222-4222-8222-222222222222',
  mode: 'solo',
  status: 'draft',
  durationMin: 90,
  budgetKrw: null,
  transport: 'walk',
  lat: 37.5665,
  lng: 126.978,
  areaId: '33333333-3333-4333-8333-333333333333',
  startedAt: null,
  endedAt: null,
};

test('toSessionView reshapes point into origin and drops hostUserId', () => {
  const view = toSessionView(baseRow);
  assert.deepEqual(view.origin, { lat: 37.5665, lng: 126.978 });
  assert.equal(view.startedAt, null);
  assert.ok(!('hostUserId' in view));
});

test('toSessionView serialises timestamps to ISO strings', () => {
  const view = toSessionView({ ...baseRow, startedAt: new Date('2026-09-01T10:00:00Z') });
  assert.equal(view.startedAt, '2026-09-01T10:00:00.000Z');
});

test('createSessionBody rejects out-of-range latitude', () => {
  const result = createSessionBody.safeParse({
    mode: 'solo',
    durationMin: 90,
    transport: 'walk',
    origin: { lat: 200, lng: 0 },
    areaId: '33333333-3333-4333-8333-333333333333',
  });
  assert.equal(result.success, false);
});

test('createSessionBody rejects duration below minimum', () => {
  const result = createSessionBody.safeParse({
    mode: 'date',
    durationMin: 5,
    transport: 'transit',
    origin: { lat: 37.5, lng: 127 },
    areaId: '33333333-3333-4333-8333-333333333333',
  });
  assert.equal(result.success, false);
});

test('createSessionBody accepts a valid draft payload', () => {
  const result = createSessionBody.safeParse({
    mode: 'friends',
    durationMin: 120,
    budgetKrw: 40000,
    transport: 'car',
    origin: { lat: 37.5, lng: 127 },
    areaId: '33333333-3333-4333-8333-333333333333',
  });
  assert.equal(result.success, true);
});
