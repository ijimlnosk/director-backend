import { and, eq, sql } from 'drizzle-orm';

import { db } from '../../shared/database/client.js';
import { areas, sessions } from '../../shared/database/schema.js';
import type { WeatherSnapshot } from '../../integrations/weather/weather.types.js';
import type { CreateSessionInput, SessionRow } from './session.schema.js';

const point = (lng: number, lat: number) =>
  sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;

const ROW_SELECT = {
  id: sessions.id,
  hostUserId: sessions.hostUserId,
  mode: sessions.mode,
  mood: sessions.mood,
  status: sessions.status,
  durationMin: sessions.durationMin,
  budgetKrw: sessions.budgetKrw,
  transport: sessions.transport,
  lat: sql<number>`ST_Y(${sessions.originPoint}::geometry)`.as('lat'),
  lng: sql<number>`ST_X(${sessions.originPoint}::geometry)`.as('lng'),
  areaId: sessions.areaId,
  weatherSnapshot: sessions.weatherSnapshot,
  startedAt: sessions.startedAt,
  endedAt: sessions.endedAt,
} as const;

export async function areaExists(areaId: string): Promise<boolean> {
  const [row] = await db.select({ id: areas.id }).from(areas).where(eq(areas.id, areaId)).limit(1);
  return row !== undefined;
}

export async function areaSummary(
  areaId: string,
): Promise<{ id: string; name: string; isLive: boolean } | undefined> {
  const [row] = await db
    .select({ id: areas.id, name: areas.name, isLive: areas.isLive })
    .from(areas)
    .where(eq(areas.id, areaId))
    .limit(1);
  return row;
}

/** How many places in the area the user has visited, and how many are still
 *  inside their cooldown window. */
export async function visitedPlacesInArea(
  userId: string,
  areaId: string,
): Promise<{ visited: number; cooledDown: number }> {
  const rows = await db.execute(sql`
    select
      count(*)::int as "visited",
      count(*) filter (
        where vh.last_visited_at >= now() - make_interval(days => p.cooldown_days)
          and p.cooldown_days > 0
      )::int as "cooledDown"
    from visit_history vh
    join place p on p.id = vh.place_id and p.area_id = ${areaId}
    where vh.user_id = ${userId}
  `);
  return (rows as unknown as { visited: number; cooledDown: number }[])[0] ?? {
    visited: 0,
    cooledDown: 0,
  };
}

export async function insertDraftSession(
  hostUserId: string,
  input: CreateSessionInput,
): Promise<SessionRow> {
  const [row] = await db
    .insert(sessions)
    .values({
      hostUserId,
      mode: input.mode,
      mood: input.mood ?? null,
      durationMin: input.durationMin,
      budgetKrw: input.budgetKrw ?? null,
      transport: input.transport,
      originPoint: point(input.origin.lng, input.origin.lat),
      areaId: input.areaId,
    })
    .returning(ROW_SELECT);

  return row!;
}

export async function findSessionById(id: string): Promise<SessionRow | undefined> {
  const [row] = await db.select(ROW_SELECT).from(sessions).where(eq(sessions.id, id)).limit(1);
  return row;
}

/** Flip a draft session to active, stamping the start time and weather snapshot. */
export async function activateSession(
  sessionId: string,
  weather: WeatherSnapshot | null,
): Promise<SessionRow | undefined> {
  const [row] = await db
    .update(sessions)
    .set({ status: 'active', startedAt: new Date(), weatherSnapshot: weather })
    .where(and(eq(sessions.id, sessionId), eq(sessions.status, 'draft')))
    .returning(ROW_SELECT);
  return row;
}
