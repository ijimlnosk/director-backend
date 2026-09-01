import { z } from 'zod';

import { weatherSnapshotSchema } from '../../integrations/weather/weather.types.js';

export const createSessionBody = z.object({
  mode: z.enum(['solo', 'date', 'friends']),
  mood: z.enum(['chill', 'adventurous']).optional(),
  purpose: z.enum(['explore', 'walk', 'food', 'culture']).default('explore'),
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
  purpose: z.enum(['explore', 'walk', 'food', 'culture']),
  status: z.enum(['draft', 'checking', 'active', 'completed', 'abandoned', 'archived']),
  durationMin: z.number().int(),
  budgetKrw: z.number().int().nullable(),
  transport: z.enum(['walk', 'transit', 'car']),
  origin: z.object({ lat: z.number(), lng: z.number() }),
  areaId: z.uuid(),
  inviteCode: z.string().nullable(),
  weather: weatherSnapshotSchema.nullable(),
  startedAt: z.string().nullable(),
  endedAt: z.string().nullable(),
});

export type SessionView = z.infer<typeof sessionView>;

export const sessionResponse = z.object({ session: sessionView });

export const listSessionsQuery = z.object({
  status: z.enum(['draft', 'checking', 'active', 'completed', 'abandoned', 'archived']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ListSessionsQuery = z.infer<typeof listSessionsQuery>;

export const sessionListItem = sessionView.omit({ weather: true }).extend({
  sceneCount: z.number().int(),
});

export type SessionListItem = z.infer<typeof sessionListItem>;

export const sessionListResponse = z.object({ sessions: z.array(sessionListItem) });

export function toSessionListItem(row: SessionRow, sceneCount: number): SessionListItem {
  const { weather: _weather, ...view } = toSessionView(row);
  return { ...view, sceneCount };
}

export interface SessionRow {
  id: string;
  hostUserId: string;
  mode: SessionView['mode'];
  mood: SessionView['mood'];
  purpose: SessionView['purpose'];
  status: SessionView['status'];
  durationMin: number;
  budgetKrw: number | null;
  transport: SessionView['transport'];
  lat: number;
  lng: number;
  areaId: string;
  inviteCode: string | null;
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
    purpose: row.purpose,
    status: row.status,
    durationMin: row.durationMin,
    budgetKrw: row.budgetKrw,
    transport: row.transport,
    origin: { lat: row.lat, lng: row.lng },
    areaId: row.areaId,
    inviteCode: row.inviteCode,
    weather: weather.success ? weather.data : null,
    startedAt: row.startedAt?.toISOString() ?? null,
    endedAt: row.endedAt?.toISOString() ?? null,
  };
}
