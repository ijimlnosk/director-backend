import assert from 'node:assert/strict';
import { test } from 'node:test';

import { summariseKakaoRoute } from './kakao-directions.js';

test('summariseKakaoRoute reduces a route to distance, duration, roads and first step', () => {
  const summary = summariseKakaoRoute({
    routes: [
      {
        result_code: 0,
        summary: { distance: 2345, duration: 780 },
        sections: [
          {
            roads: [
              { name: '강남대로', distance: 1200 },
              { name: '테헤란로', distance: 900 },
              { name: '강남대로', distance: 200 },
              { name: '', distance: 45 },
            ],
            guides: [
              { type: 100, guidance: '출발' },
              { type: 2, guidance: '우회전', distance: 1200 },
              { type: 1000, guidance: '목적지' },
            ],
          },
        ],
      },
    ],
  });
  assert.deepEqual(summary, {
    distanceM: 2345,
    durationSec: 780,
    mainRoads: ['강남대로', '테헤란로'],
    firstStep: { instruction: '우회전', roadName: '강남대로', distanceM: 1200 },
  });
});

test('summariseKakaoRoute returns null on a non-zero result code', () => {
  assert.equal(
    summariseKakaoRoute({ routes: [{ result_code: 104, summary: { distance: 1, duration: 1 } }] }),
    null,
  );
});

test('summariseKakaoRoute returns null when there is no route', () => {
  assert.equal(summariseKakaoRoute({}), null);
  assert.equal(summariseKakaoRoute({ routes: [] }), null);
});

test('summariseKakaoRoute tolerates a route with no named roads or manoeuvres', () => {
  const summary = summariseKakaoRoute({
    routes: [{ result_code: 0, summary: { distance: 500, duration: 120 }, sections: [{}] }],
  });
  assert.deepEqual(summary, {
    distanceM: 500,
    durationSec: 120,
    mainRoads: [],
    firstStep: null,
  });
});
