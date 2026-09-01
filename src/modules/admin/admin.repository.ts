import { sql } from 'drizzle-orm';

import { db } from '../../shared/database/client.js';

/** Abandon active/checking sessions that ran past duration + grace minutes. */
export async function abandonStaleSessions(graceMin: number): Promise<number> {
  const rows = await db.execute(sql`
    update session
    set status = 'abandoned', ended_at = now()
    where status in ('active', 'checking')
      and started_at is not null
      and started_at < now() - make_interval(mins => duration_min + ${graceMin})
    returning id
  `);
  return (rows as unknown as unknown[]).length;
}

/** Drop photo rows still pending an upload after `olderThanMin` minutes. */
export async function deleteStalePendingPhotos(olderThanMin: number): Promise<number> {
  const rows = await db.execute(sql`
    delete from photo
    where status = 'pending'
      and taken_at < now() - make_interval(mins => ${olderThanMin})
    returning id
  `);
  return (rows as unknown as unknown[]).length;
}

/** Revoke refresh tokens that expired more than `olderThanDays` ago. */
export async function purgeExpiredRefreshTokens(olderThanDays: number): Promise<number> {
  const rows = await db.execute(sql`
    delete from refresh_token
    where expires_at < now() - make_interval(days => ${olderThanDays})
    returning id
  `);
  return (rows as unknown as unknown[]).length;
}
