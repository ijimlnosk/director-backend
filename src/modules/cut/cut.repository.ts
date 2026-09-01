import { eq, sql } from 'drizzle-orm';

import { db } from '../../shared/database/client.js';
import { cuts, sessions } from '../../shared/database/schema.js';
import type { CutRow, CutSceneRow } from './cut.schema.js';

export interface SessionForEnd {
  id: string;
  hostUserId: string;
  status: string;
  startedAt: Date | null;
}

export interface SessionTotals {
  totalWalkedM: number;
  totalElapsedSec: number;
  arrivedCount: number;
  skippedCount: number;
}

export async function loadSessionForEnd(sessionId: string): Promise<SessionForEnd | undefined> {
  const rows = await db
    .select({
      id: sessions.id,
      hostUserId: sessions.hostUserId,
      status: sessions.status,
      startedAt: sessions.startedAt,
    })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);
  return rows[0];
}

export async function sessionTotals(sessionId: string): Promise<SessionTotals> {
  const rows = await db.execute(sql`
    select
      coalesce(sum(r.walked_m), 0)::int as "totalWalkedM",
      coalesce(sum(r.elapsed_sec), 0)::int as "totalElapsedSec",
      count(*) filter (where r.outcome = 'arrived')::int as "arrivedCount",
      count(*) filter (where r.outcome = 'skipped')::int as "skippedCount"
    from scene s
    join scene_result r on r.scene_id = s.id
    where s.session_id = ${sessionId}
  `);
  return (rows as unknown as SessionTotals[])[0]!;
}

export async function sessionSceneBreakdown(sessionId: string): Promise<CutSceneRow[]> {
  const rows = await db.execute(sql`
    select s.seq as "seq",
           s.type as "type",
           s.title as "title",
           r.outcome as "outcome",
           p.name as "placeName",
           s.distance_m as "distanceM"
    from scene s
    left join scene_result r on r.scene_id = s.id
    left join place p on p.id = s.place_id
    where s.session_id = ${sessionId}
    order by s.seq
  `);
  return rows as unknown as CutSceneRow[];
}

export async function coverPhotoId(sessionId: string): Promise<string | null> {
  const rows = await db.execute(sql`
    select ph.id as "id"
    from photo ph
    join scene_result r on r.id = ph.scene_result_id
    join scene s on s.id = r.scene_id
    where s.session_id = ${sessionId} and ph.include_in_credits = true
    order by ph.taken_at
    limit 1
  `);
  return (rows as unknown as { id: string }[])[0]?.id ?? null;
}

export async function findCutRow(sessionId: string): Promise<CutRow | undefined> {
  const rows = await db
    .select({
      sessionId: cuts.sessionId,
      title: cuts.title,
      summaryLine: cuts.summaryLine,
      totalDistanceM: cuts.totalDistanceM,
      runtimeSec: cuts.runtimeSec,
      coverPhotoId: cuts.coverPhotoId,
      visibility: cuts.visibility,
    })
    .from(cuts)
    .where(eq(cuts.sessionId, sessionId))
    .limit(1);
  return rows[0];
}

/** Mark an active session completed and insert its Cut, in one transaction. */
export async function endSessionAndInsertCut(args: {
  sessionId: string;
  title: string;
  summaryLine: string;
  totalDistanceM: number;
  runtimeSec: number;
  coverPhotoId: string | null;
}): Promise<CutRow> {
  return db.transaction(async (tx) => {
    await tx
      .update(sessions)
      .set({ status: 'completed', endedAt: new Date() })
      .where(eq(sessions.id, args.sessionId));

    await tx
      .insert(cuts)
      .values({
        sessionId: args.sessionId,
        title: args.title,
        summaryLine: args.summaryLine,
        totalDistanceM: args.totalDistanceM,
        runtimeSec: args.runtimeSec,
        coverPhotoId: args.coverPhotoId,
      })
      .onConflictDoNothing({ target: cuts.sessionId });

    const [row] = await tx
      .select({
        sessionId: cuts.sessionId,
        title: cuts.title,
        summaryLine: cuts.summaryLine,
        totalDistanceM: cuts.totalDistanceM,
        runtimeSec: cuts.runtimeSec,
        coverPhotoId: cuts.coverPhotoId,
        visibility: cuts.visibility,
      })
      .from(cuts)
      .where(eq(cuts.sessionId, args.sessionId));
    return row!;
  });
}
