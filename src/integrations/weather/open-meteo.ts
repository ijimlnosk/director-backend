import {
  WeatherProviderError,
  weatherSnapshotSchema,
  type WeatherProvider,
  type WeatherSnapshot,
} from './weather.types.js';

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

const CURRENT_FIELDS = [
  'temperature_2m',
  'apparent_temperature',
  'precipitation',
  'wind_speed_10m',
  'weather_code',
  'is_day',
].join(',');

/** Map a WMO weather code to a coarse summary bucket. */
export function wmoSummary(code: number): WeatherSnapshot['summary'] {
  if (code === 0 || code === 1) return 'clear';
  if (code === 2 || code === 3) return 'cloud';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'thunder';
  return 'cloud';
}

interface OpenMeteoResponse {
  current?: {
    time?: string;
    temperature_2m?: number;
    apparent_temperature?: number;
    precipitation?: number;
    wind_speed_10m?: number;
    weather_code?: number;
    is_day?: number;
  };
}

/** Parse the Open-Meteo `current` block into a normalised snapshot. */
export function parseOpenMeteo(payload: OpenMeteoResponse): WeatherSnapshot {
  const c = payload.current;
  if (
    c === undefined ||
    c.temperature_2m === undefined ||
    c.weather_code === undefined
  ) {
    throw new WeatherProviderError('Open-Meteo response missing current weather');
  }
  return weatherSnapshotSchema.parse({
    fetchedAt: new Date().toISOString(),
    tempC: c.temperature_2m,
    apparentTempC: c.apparent_temperature ?? c.temperature_2m,
    precipitationMm: c.precipitation ?? 0,
    windSpeedMs: c.wind_speed_10m ?? 0,
    weatherCode: c.weather_code,
    isDay: (c.is_day ?? 1) === 1,
    summary: wmoSummary(c.weather_code),
  });
}

export function createOpenMeteoProvider(opts: { timeoutMs: number }): WeatherProvider {
  return {
    async current(lat: number, lng: number): Promise<WeatherSnapshot> {
      const url = `${ENDPOINT}?latitude=${lat}&longitude=${lng}&current=${CURRENT_FIELDS}&wind_speed_unit=ms`;
      let response: Response;
      try {
        response = await fetch(url, { signal: AbortSignal.timeout(opts.timeoutMs) });
      } catch (error) {
        throw new WeatherProviderError(
          `Open-Meteo request failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      if (!response.ok) {
        throw new WeatherProviderError(`Open-Meteo responded ${response.status}`);
      }
      return parseOpenMeteo((await response.json()) as OpenMeteoResponse);
    },
  };
}
