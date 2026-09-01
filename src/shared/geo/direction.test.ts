import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bearingDeg, compass8, directionPhrase } from './distance.js';

const origin = { lat: 37.5, lng: 127.0 };

test('bearingDeg points north / east / south / west', () => {
  assert.ok(Math.abs(bearingDeg(origin, { lat: 37.51, lng: 127.0 }) - 0) < 1);
  assert.ok(Math.abs(bearingDeg(origin, { lat: 37.5, lng: 127.01 }) - 90) < 1);
  assert.ok(Math.abs(bearingDeg(origin, { lat: 37.49, lng: 127.0 }) - 180) < 1);
  assert.ok(Math.abs(bearingDeg(origin, { lat: 37.5, lng: 126.99 }) - 270) < 1);
});

test('compass8 buckets to the nearest of 8 points', () => {
  assert.equal(compass8(0), '북');
  assert.equal(compass8(44), '북동');
  assert.equal(compass8(90), '동');
  assert.equal(compass8(225), '남서');
  assert.equal(compass8(359), '북');
});

test('directionPhrase combines compass and distance', () => {
  const phrase = directionPhrase(origin, { lat: 37.5, lng: 127.005 });
  assert.match(phrase, /^동쪽으로 약 \d+m$/);
});
