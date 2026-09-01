import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { WeatherSnapshot } from '../../integrations/weather/weather.types.js';
import { outdoorAdvisory } from './session.advisory.js';

const base: WeatherSnapshot = {
  fetchedAt: '2026-09-01T00:00:00.000Z',
  tempC: 20,
  apparentTempC: 20,
  precipitationMm: 0,
  windSpeedMs: 2,
  weatherCode: 1,
  isDay: true,
  summary: 'clear',
};

test('clear/cloud weather is ok', () => {
  assert.equal(outdoorAdvisory(base), 'ok');
  assert.equal(outdoorAdvisory({ ...base, summary: 'cloud' }), 'ok');
});

test('rain, heavy precipitation or strong wind is caution', () => {
  assert.equal(outdoorAdvisory({ ...base, summary: 'rain' }), 'caution');
  assert.equal(outdoorAdvisory({ ...base, precipitationMm: 2 }), 'caution');
  assert.equal(outdoorAdvisory({ ...base, windSpeedMs: 10 }), 'caution');
});

test('thunder and snow are avoid', () => {
  assert.equal(outdoorAdvisory({ ...base, summary: 'thunder' }), 'avoid');
  assert.equal(outdoorAdvisory({ ...base, summary: 'snow' }), 'avoid');
});
