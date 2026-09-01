import { and, eq, isNull, sql } from 'drizzle-orm';

import { db } from '../../shared/database/client.js';
import { cuts, sessions } from '../../shared/database/schema.js';
import type { CutRow, CutSceneRow } from './cut.schema.js';

const CUT_COLUMNS = {
  sessionId: cuts.sessionId,
  title: cuts.title,
  summaryLine: cuts.summaryLine,
  totalDistanceM: cuts.totalDistanceM,
  runtimeSec: cuts.runtimeSec,
  coverPhotoId: cuts.coverPhotoId,
  visibility: cuts.visibility,
  shareSlug: cuts.shareSlug,
} as const;

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
           s.distance_m as "distanceM",
           ph.storage_key as "photoStorageKey"
    from scene s
    left join scene_result r on r.scene_id = s.id
    left join place p on p.id = s.place_id
    left join photo ph on ph.scene_result_id = r.id and ph.status = 'ready'
    where s.session_id = ${sessionId}
    order by s.seq
  `);
  return rows as unknown as CutSceneRow[];
}

export async function coverPhoto(
  sessionId: string,
): Promise<{ id: string; storageKey: string } | null> {
  const rows = await db.execute(sql`
    select ph.id as "id", ph.storage_key as "storageKey"
    from photo ph
    join scene_result r on r.id = ph.scene_result_id
    join scene s on s.id = r.scene_id
    where s.session_id = ${sessionId}
      and ph.include_in_credits = true
      and ph.status = 'ready'
    order by ph.taken_at
    limit 1
  `);
  return (rows as unknown as { id: string; storageKey: string }[])[0] ?? null;
}

export async function findCutRow(sessionId: string): Promise<CutRow | undefined> {
  const [row] = await db.select(CUT_COLUMNS).from(cuts).where(eq(cuts.sessionId, sessionId)).limit(1);
  return row;
}

/** A shared cut by its slug, only while its visibility is 'link'. */
export async function findSharedCut(slug: string): Promise<CutRow | undefined> {
  const [row] = await db
    .select(CUT_COLUMNS)
    .from(cuts)
    .where(and(eq(cuts.shareSlug, slug), eq(cuts.visibility, 'link')))
    .limit(1);
  return row;
}

/** Assign a share slug (once) and make the cut link-visible. */
export async function shareCutRow(sessionId: string, slug: string): Promise<CutRow | undefined> {
  await db
    .update(cuts)
    .set({ shareSlug: slug })
    .where(and(eq(cuts.sessionId, sessionId), isNull(cuts.shareSlug)));
  const [row] = await db
    .update(cuts)
    .set({ visibility: 'link' })
    .where(eq(cuts.sessionId, sessionId))
    .returning(CUT_COLUMNS);
  return row;
}

export async function unshareCutRow(sessionId: string): Promise<CutRow | undefined> {
  const [row] = await db
    .update(cuts)
    .set({ visibility: 'private' })
    .where(eq(cuts.sessionId, sessionId))
    .returning(CUT_COLUMNS);
  return row;
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

    const [row] = await tx.select(CUT_COLUMNS).from(cuts).where(eq(cuts.sessionId, args.sessionId));
    return row!;
  });
}
