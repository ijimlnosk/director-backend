import { sql } from 'drizzle-orm';

import { db } from '../../shared/database/client.js';
import { areas } from '../../shared/database/schema.js';
import type { AreaView } from './area.schema.js';

/** Live areas a session can start in, with the polygon centroid. */
export async function listLiveAreas(): Promise<AreaView[]> {
  const rows = await db.execute(sql`
    select ${areas.id} as "id",
           ${areas.name} as "name",
           ST_Y(ST_Centroid(${areas.bounds})::geometry) as "lat",
           ST_X(ST_Centroid(${areas.bounds})::geometry) as "lng"
    from ${areas}
    where ${areas.isLive} = true
    order by ${areas.name}
  `);
  return (rows as unknown as { id: string; name: string; lat: number; lng: number }[]).map(
    (row) => ({ id: row.id, name: row.name, center: { lat: row.lat, lng: row.lng } }),
  );
}
