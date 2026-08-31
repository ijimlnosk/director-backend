import { z } from 'zod';

export const createSessionBody = z.object({
  mode: z.enum(['solo', 'date', 'friends']),
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
  status: z.enum(['draft', 'checking', 'active', 'completed', 'abandoned', 'archived']),
  durationMin: z.number().int(),
  budgetKrw: z.number().int().nullable(),
  transport: z.enum(['walk', 'transit', 'car']),
  origin: z.object({ lat: z.number(), lng: z.number() }),
  areaId: z.uuid(),
  startedAt: z.string().nullable(),
  endedAt: z.string().nullable(),
});

export type SessionView = z.infer<typeof sessionView>;

export const sessionResponse = z.object({ session: sessionView });

export interface SessionRow {
  id: string;
  hostUserId: string;
  mode: SessionView['mode'];
  status: SessionView['status'];
  durationMin: number;
  budgetKrw: number | null;
  transport: SessionView['transport'];
  lat: number;
  lng: number;
  areaId: string;
  startedAt: Date | null;
  endedAt: Date | null;
}

export function toSessionView(row: SessionRow): SessionView {
  return {
    id: row.id,
    mode: row.mode,
    status: row.status,
    durationMin: row.durationMin,
    budgetKrw: row.budgetKrw,
    transport: row.transport,
    origin: { lat: row.lat, lng: row.lng },
    areaId: row.areaId,
    startedAt: row.startedAt?.toISOString() ?? null,
    endedAt: row.endedAt?.toISOString() ?? null,
  };
}
