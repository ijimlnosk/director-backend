import assert from 'node:assert/strict';
import { test } from 'node:test';

import { haversineM } from './distance.js';

test('haversineM is zero for identical points', () => {
  assert.equal(haversineM({ lat: 37.5665, lng: 126.978 }, { lat: 37.5665, lng: 126.978 }), 0);
});

test('haversineM matches a known short distance within 1%', () => {
  // Seoul City Hall -> Deoksugung, ~250 m
  const d = haversineM({ lat: 37.5663, lng: 126.9779 }, { lat: 37.5658, lng: 126.9751 });
  assert.ok(d > 240 && d < 260, `expected ~250 m, got ${d}`);
});

test('haversineM is symmetric', () => {
  const a = { lat: 37.5, lng: 127.0 };
  const b = { lat: 37.6, lng: 127.1 };
  assert.equal(haversineM(a, b), haversineM(b, a));
});
