import { sql, type SQL } from 'drizzle-orm';

import { places } from '../../shared/database/schema.js';

/**
 * `AND place.id <> ALL (array[...]::uuid[])` for a non-empty list, else empty.
 * Interpolating a JS array straight into `any(...)` makes drizzle emit
 * `any(($1, $2))`, which Postgres cannot cast to uuid[] — hence the explicit
 * array constructor.
 */
export function excludePlaceIdsSql(ids: string[]): SQL {
  if (ids.length === 0) return sql``;
  return sql`and ${places.id} <> all (array[${sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  )}]::uuid[])`;
}
