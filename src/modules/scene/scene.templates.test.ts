import assert from 'node:assert/strict';
import { test } from 'node:test';

import { formatDistance } from '../../shared/geo/distance.js';
import { MIN_TIME_LIMIT_MIN } from './scene.constants.js';
import { buildTemplateScene, estimateTimeLimitMin } from './scene.templates.js';

test('formatDistance uses metres below 1km, rounded to 10m', () => {
  assert.equal(formatDistance(342), '340m');
  assert.equal(formatDistance(999), '1000m');
});

test('formatDistance uses km at or above 1km', () => {
  assert.equal(formatDistance(1000), '1.0km');
  assert.equal(formatDistance(2450), '2.5km');
});

test('estimateTimeLimitMin never drops below the floor', () => {
  assert.equal(estimateTimeLimitMin(10, 'car'), MIN_TIME_LIMIT_MIN);
});

test('estimateTimeLimitMin scales with distance and adds the buffer', () => {
  // 1500m walk at 75 m/min = 20 min travel + 5 buffer
  assert.equal(estimateTimeLimitMin(1500, 'walk'), 25);
  // 5000m transit at 250 m/min = 20 min + 5 buffer
  assert.equal(estimateTimeLimitMin(5000, 'transit'), 25);
});

test('buildTemplateScene hides the place name and marks reveal-after-arrival', () => {
  const scene = buildTemplateScene({ type: 'move', category: '카페', direction: '북동쪽으로 약 800m', distanceM: 800, transport: 'walk' });
  assert.equal(scene.type, 'move');
  assert.equal(scene.revealNameAfterArrival, true);
  assert.equal(scene.title, '다음 장소로 이동');
  assert.match(scene.body, /도보/);
  assert.match(scene.hint, /카페/);
  assert.match(scene.body, /북동쪽/);
  assert.equal(scene.timeLimitMin, estimateTimeLimitMin(800, 'walk', 'move'));
});

test('buildTemplateScene varies copy and time by scene type', () => {
  const photo = buildTemplateScene({ type: 'photo', category: '문화시설', direction: '동쪽으로 약 800m', distanceM: 800, transport: 'walk' });
  const observe = buildTemplateScene({ type: 'observe', category: '공원', direction: '남쪽으로 약 800m', distanceM: 800, transport: 'walk' });
  assert.equal(photo.type, 'photo');
  assert.match(photo.body, /사진/);
  assert.ok(observe.timeLimitMin > photo.timeLimitMin);
  assert.ok(photo.timeLimitMin > buildTemplateScene({ type: 'move', category: 'x', direction: '서쪽으로 약 800m', distanceM: 800, transport: 'walk' }).timeLimitMin);
});
