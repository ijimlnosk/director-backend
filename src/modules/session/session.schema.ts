import { z } from 'zod';

import { weatherSnapshotSchema } from '../../integrations/weather/weather.types.js';

export const createSessionBody = z.object({
  mode: z.enum(['solo', 'date', 'friends']),
  mood: z.enum(['chill', 'adventurous']).optional(),
  durationMin: z.number().int().min(15).max(480),
  budgetKrw: z.number().int().min(0).max(10_000_000).optional(),
  transport: z.enum(['walk', 'transit', 'car']),
  origin: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  areaId: z.uuid(),
});

export type CreateSessionInput = z.infer<typeof createSessionBody>;

export const sessionParams = z.object({ sessionId: z.uuid() });

export const sessionView = z.object({
  id: z.uuid(),
  mode: z.enum(['solo', 'date', 'friends']),
  mood: z.enum(['chill', 'adventurous']).nullable(),
  status: z.enum(['draft', 'checking', 'active', 'completed', 'abandoned', 'archived']),
  durationMin: z.number().int(),
  budgetKrw: z.number().int().nullable(),
  transport: z.enum(['walk', 'transit', 'car']),
  origin: z.object({ lat: z.number(), lng: z.number() }),
  areaId: z.uuid(),
  weather: weatherSnapshotSchema.nullable(),
  startedAt: z.string().nullable(),
  endedAt: z.string().nullable(),
});

export type SessionView = z.infer<typeof sessionView>;

export const sessionResponse = z.object({ session: sessionView });

export interface SessionRow {
  id: string;
  hostUserId: string;
  mode: SessionView['mode'];
  mood: SessionView['mood'];
  status: SessionView['status'];
  durationMin: number;
  budgetKrw: number | null;
  transport: SessionView['transport'];
  lat: number;
  lng: number;
  areaId: string;
  weatherSnapshot: unknown;
  startedAt: Date | null;
  endedAt: Date | null;
}

export function toSessionView(row: SessionRow): SessionView {
  const weather = weatherSnapshotSchema.safeParse(row.weatherSnapshot);
  return {
    id: row.id,
    mode: row.mode,
    mood: row.mood,
    status: row.status,
    durationMin: row.durationMin,
    budgetKrw: row.budgetKrw,
    transport: row.transport,
    origin: { lat: row.lat, lng: row.lng },
    areaId: row.areaId,
    weather: weather.success ? weather.data : null,
    startedAt: row.startedAt?.toISOString() ?? null,
    endedAt: row.endedAt?.toISOString() ?? null,
  };
}
