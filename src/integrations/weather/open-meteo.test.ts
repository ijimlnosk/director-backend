import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseOpenMeteo, wmoSummary } from './open-meteo.js';
import { WeatherProviderError } from './weather.types.js';

test('wmoSummary buckets WMO codes', () => {
  assert.equal(wmoSummary(0), 'clear');
  assert.equal(wmoSummary(3), 'cloud');
  assert.equal(wmoSummary(48), 'fog');
  assert.equal(wmoSummary(55), 'drizzle');
  assert.equal(wmoSummary(65), 'rain');
  assert.equal(wmoSummary(81), 'rain');
  assert.equal(wmoSummary(73), 'snow');
  assert.equal(wmoSummary(96), 'thunder');
});

test('parseOpenMeteo normalises the current block', () => {
  const snap = parseOpenMeteo({
    current: {
      time: '2026-09-01T12:00',
      temperature_2m: 24.3,
      apparent_temperature: 25.0,
      precipitation: 0.2,
      wind_speed_10m: 3.1,
      weather_code: 61,
      is_day: 1,
    },
  });
  assert.equal(snap.tempC, 24.3);
  assert.equal(snap.summary, 'rain');
  assert.equal(snap.isDay, true);
  assert.ok(typeof snap.fetchedAt === 'string');
});

test('parseOpenMeteo defaults optional fields', () => {
  const snap = parseOpenMeteo({ current: { temperature_2m: 10, weather_code: 0 } });
  assert.equal(snap.apparentTempC, 10);
  assert.equal(snap.precipitationMm, 0);
  assert.equal(snap.windSpeedMs, 0);
  assert.equal(snap.isDay, true);
});

test('parseOpenMeteo throws on a missing current block', () => {
  assert.throws(() => parseOpenMeteo({}), WeatherProviderError);
});
