import { env } from '../../shared/config/env.js';
import { createOpenMeteoProvider } from './open-meteo.js';
import type { WeatherProvider } from './weather.types.js';

/** Process-wide weather provider (keyless Open-Meteo). */
export const weatherProvider: WeatherProvider = createOpenMeteoProvider({
  timeoutMs: env.WEATHER_TIMEOUT_MS,
});

export { WeatherProviderError, weatherSnapshotSchema } from './weather.types.js';
export type { WeatherSnapshot } from './weather.types.js';
