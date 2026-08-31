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

export interface SessionView {
  id: string;
  mode: 'solo' | 'date' | 'friends';
  status: 'draft' | 'checking' | 'active' | 'completed' | 'abandoned' | 'archived';
  durationMin: number;
  budgetKrw: number | null;
  transport: 'walk' | 'transit' | 'car';
  origin: { lat: number; lng: number };
  areaId: string;
  startedAt: string | null;
  endedAt: string | null;
}

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
