import { and, eq, sql } from 'drizzle-orm';

import { db } from '../../shared/database/client.js';
import {
  participants,
  places,
  sceneResults,
  scenes,
  sessions,
  vetoes,
} from '../../shared/database/schema.js';
import type { SceneResultRow } from './scene.schema.js';

export interface SceneForResolve {
  id: string;
  sessionId: string;
  placeId: string | null;
  placeCategory: string | null;
  hostUserId: string;
  sessionStatus: string;
  /** The caller is the host or a joined participant. */
  canResolve: boolean;
  placeLat: number | null;
  placeLng: number | null;
}

const geo = (lng: number, lat: number) =>
  sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;

export async function loadSceneForResolve(
  sceneId: string,
  userId: string,
): Promise<SceneForResolve | undefined> {
  const rows = await db.execute(sql`
    select ${scenes.id} as "id",
           ${scenes.sessionId} as "sessionId",
           ${scenes.placeId} as "placeId",
           ${places.category} as "placeCategory",
           ${sessions.hostUserId} as "hostUserId",
           ${sessions.status} as "sessionStatus",
           (${sessions.hostUserId} = ${userId} or ${participants.userId} is not null) as "canResolve",
           ST_Y(${places.point}::geometry) as "placeLat",
           ST_X(${places.point}::geometry) as "placeLng"
    from ${scenes}
    join ${sessions} on ${sessions.id} = ${scenes.sessionId}
    left join ${places} on ${places.id} = ${scenes.placeId}
    left join ${participants} on ${participants.sessionId} = ${scenes.sessionId}
      and ${participants.userId} = ${userId}
      and ${participants.state} = 'joined'
    where ${scenes.id} = ${sceneId}
    limit 1
  `);
  return (rows as unknown as SceneForResolve[])[0];
}

export async function sceneResultExists(sceneId: string, userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: sceneResults.id })
    .from(sceneResults)
    .where(and(eq(sceneResults.sceneId, sceneId), eq(sceneResults.userId, userId)))
    .limit(1);
  return rows.length > 0;
}

/** Persist a scene result; on arrival also bump the user's visit history. */
export async function insertSceneResult(args: {
  sceneId: string;
  userId: string;
  placeId: string | null;
  outcome: 'arrived' | 'skipped' | 'vetoed' | 'aborted';
  verifiedBy: 'gps' | 'manual';
  arrivedPoint?: { lat: number; lng: number };
  skipReason: string | null;
  elapsedSec: number;
  walkedM: number;
}): Promise<SceneResultRow> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(sceneResults)
      .values({
        sceneId: args.sceneId,
        userId: args.userId,
        outcome: args.outcome,
        verifiedBy: args.verifiedBy,
        arrivedPoint: args.arrivedPoint
          ? geo(args.arrivedPoint.lng, args.arrivedPoint.lat)
          : null,
        skipReason: args.skipReason,
        elapsedSec: args.elapsedSec,
        walkedM: args.walkedM,
      })
      .returning({
        id: sceneResults.id,
        sceneId: sceneResults.sceneId,
        outcome: sceneResults.outcome,
        verifiedBy: sceneResults.verifiedBy,
        skipReason: sceneResults.skipReason,
        elapsedSec: sceneResults.elapsedSec,
        walkedM: sceneResults.walkedM,
        recordedAt: sceneResults.recordedAt,
      });

    if (args.outcome === 'arrived' && args.placeId !== null) {
      await tx.execute(sql`
        insert into visit_history (user_id, place_id, last_visited_at, visit_count)
        values (${args.userId}, ${args.placeId}, now(), 1)
        on conflict (user_id, place_id)
        do update set last_visited_at = now(),
                      visit_count = visit_history.visit_count + 1
      `);
    }

    return row!;
  });
}

/** Record user-scoped vetoes (place and/or category). Idempotent. */
export async function insertVetoes(args: {
  userId: string;
  sceneId: string;
  placeId: string | null;
  category: string | null;
  reason: string | null;
}): Promise<void> {
  const rows: (typeof vetoes.$inferInsert)[] = [];
  if (args.placeId !== null) {
    rows.push({
      userId: args.userId,
      sceneId: args.sceneId,
      placeId: args.placeId,
      reason: args.reason,
    });
  }
  if (args.category !== null) {
    rows.push({
      userId: args.userId,
      sceneId: args.sceneId,
      category: args.category,
      reason: args.reason,
    });
  }
  if (rows.length === 0) return;
  await db.insert(vetoes).values(rows).onConflictDoNothing();
}
