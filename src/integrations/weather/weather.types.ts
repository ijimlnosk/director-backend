import { z } from 'zod';

export const weatherSnapshotSchema = z.object({
  fetchedAt: z.string(),
  tempC: z.number(),
  apparentTempC: z.number(),
  precipitationMm: z.number(),
  windSpeedMs: z.number(),
  weatherCode: z.number().int(),
  isDay: z.boolean(),
  summary: z.enum(['clear', 'cloud', 'fog', 'drizzle', 'rain', 'snow', 'thunder']),
});

export type WeatherSnapshot = z.infer<typeof weatherSnapshotSchema>;

export interface WeatherProvider {
  current(lat: number, lng: number): Promise<WeatherSnapshot>;
}

export class WeatherProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WeatherProviderError';
  }
}
