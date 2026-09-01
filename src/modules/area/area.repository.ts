import { eq, sql } from 'drizzle-orm';

import { db } from '../../shared/database/client.js';
import { areas, places } from '../../shared/database/schema.js';
import type { PlaceCandidate } from '../../integrations/places/places.types.js';
import type { AreaView, CreateAreaInput } from './area.schema.js';

interface AreaRow {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceM: number | null;
  containsPoint: boolean;
}

const toAreaView = (row: AreaRow): AreaView => ({
  id: row.id,
  name: row.name,
  center: { lat: row.lat, lng: row.lng },
  distanceM: row.distanceM === null ? null : Math.round(row.distanceM),
  containsPoint: row.containsPoint,
});

/** Live areas a session can start in. With `near`, ranked by distance to the
 *  query point and flagged when the point is inside the area. */
export async function listLiveAreas(near?: { lat: number; lng: number }): Promise<AreaView[]> {
  if (near === undefined) {
    const rows = await db.execute(sql`
      select ${areas.id} as "id", ${areas.name} as "name",
             ST_Y(ST_Centroid(${areas.bounds})::geometry) as "lat",
             ST_X(ST_Centroid(${areas.bounds})::geometry) as "lng",
             null::float as "distanceM", false as "containsPoint"
      from ${areas}
      where ${areas.isLive} = true
      order by ${areas.name}
    `);
    return (rows as unknown as AreaRow[]).map(toAreaView);
  }

  const point = sql`ST_SetSRID(ST_MakePoint(${near.lng}, ${near.lat}), 4326)::geography`;
  const rows = await db.execute(sql`
    select ${areas.id} as "id", ${areas.name} as "name",
           ST_Y(ST_Centroid(${areas.bounds})::geometry) as "lat",
           ST_X(ST_Centroid(${areas.bounds})::geometry) as "lng",
           ST_Distance(${areas.bounds}, ${point}) as "distanceM",
           ST_Covers(${areas.bounds}::geometry, ${point}::geometry) as "containsPoint"
    from ${areas}
    where ${areas.isLive} = true
    order by "containsPoint" desc, "distanceM" asc
  `);
  return (rows as unknown as AreaRow[]).map(toAreaView);
}

/** Create an area whose bounds is a circular buffer around the given centre. */
export async function insertArea(input: CreateAreaInput): Promise<AreaView> {
  const rows = await db.execute(sql`
    insert into ${areas} (name, bounds, is_live)
    values (
      ${input.name},
      ST_Buffer(
        ST_SetSRID(ST_MakePoint(${input.center.lng}, ${input.center.lat}), 4326)::geography,
        ${input.radiusM}
      )::geography,
      ${input.isLive}
    )
    returning id,
              name,
              ST_Y(ST_Centroid(bounds)::geometry) as "lat",
              ST_X(ST_Centroid(bounds)::geometry) as "lng"
  `);
  const row = (rows as unknown as { id: string; name: string; lat: number; lng: number }[])[0]!;
  return {
    id: row.id,
    name: row.name,
    center: { lat: row.lat, lng: row.lng },
    distanceM: null,
    containsPoint: false,
  };
}

export async function areaCentroid(
  areaId: string,
): Promise<{ lat: number; lng: number } | undefined> {
  const rows = await db.execute(sql`
    select ST_Y(ST_Centroid(${areas.bounds})::geometry) as "lat",
           ST_X(ST_Centroid(${areas.bounds})::geometry) as "lng"
    from ${areas}
    where ${areas.id} = ${areaId}
    limit 1
  `);
  return (rows as unknown as { lat: number; lng: number }[])[0];
}

/** Insert provider places, skipping any already stored. Returns how many were new. */
export async function insertPlaces(
  areaId: string,
  provider: string,
  candidates: PlaceCandidate[],
): Promise<number> {
  if (candidates.length === 0) return 0;

  const values = candidates.map((c) => ({
    areaId,
    name: c.name,
    category: c.category,
    point: sql`ST_SetSRID(ST_MakePoint(${c.lng}, ${c.lat}), 4326)::geography`,
    openHours: {},
    priceBand: '2' as const,
    provider,
    providerPlaceId: c.providerPlaceId,
    address: c.address,
  }));

  const inserted = await db
    .insert(places)
    .values(values)
    .onConflictDoNothing()
    .returning({ id: places.id });

  return inserted.length;
}

export async function areaIsLive(areaId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: areas.id })
    .from(areas)
    .where(eq(areas.id, areaId))
    .limit(1);
  return row !== undefined;
}
