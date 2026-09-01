import type { WeatherSnapshot } from '../../integrations/weather/weather.types.js';

/** ok | caution | avoid — a coarse outdoor-safety read of the weather. */
export function outdoorAdvisory(w: WeatherSnapshot): 'ok' | 'caution' | 'avoid' {
  if (w.summary === 'thunder' || w.summary === 'snow') return 'avoid';
  if (w.summary === 'rain' || w.precipitationMm >= 1 || w.windSpeedMs >= 9) return 'caution';
  return 'ok';
}
