import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import { db } from '../../shared/database/client.js';
import { places, sceneResults, scenes, sessions } from '../../shared/database/schema.js';
import { excludePlaceIdsSql } from './scene.candidates.js';
import type { Transport } from './scene.constants.js';
import type { MoveSceneDraft } from './scene.templates.js';
import type { SceneRow } from './scene.schema.js';

export interface SessionContext {
  id: string;
  hostUserId: string;
  status: string;
  mode: 'solo' | 'date' | 'friends';
  mood: 'chill' | 'adventurous' | null;
  transport: Transport;
  areaId: string;
  durationMin: number;
  originLat: number;
  originLng: number;
}

export interface Candidate {
  placeId: string;
  category: string;
  distanceM: number;
  lat: number;
  lng: number;
}

const geo = (lng: number, lat: number) =>
  sql`ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;

export async function loadSessionContext(sessionId: string): Promise<SessionContext | undefined> {
  const rows = await db.execute(sql`
    select ${sessions.id} as "id",
           ${sessions.hostUserId} as "hostUserId",
           ${sessions.status} as "status",
           ${sessions.mode} as "mode",
           ${sessions.mood} as "mood",
           ${sessions.transport} as "transport",
           ${sessions.areaId} as "areaId",
           ${sessions.durationMin} as "durationMin",
           ST_Y(${sessions.originPoint}::geometry) as "originLat",
           ST_X(${sessions.originPoint}::geometry) as "originLng"
    from ${sessions}
    where ${sessions.id} = ${sessionId}
    limit 1
  `);
  return (rows as unknown as SessionContext[])[0];
}

/** Prior scenes of a session, ordered by seq. */
export async function priorScenes(
  sessionId: string,
): Promise<{ placeId: string | null; timeLimitMin: number }[]> {
  return db
    .select({ placeId: scenes.placeId, timeLimitMin: scenes.timeLimitMin })
    .from(scenes)
    .where(eq(scenes.sessionId, sessionId))
    .orderBy(scenes.seq);
}

/** Seq of the most recent scene that has no scene_result yet, if any. */
export async function unresolvedSceneSeq(sessionId: string): Promise<number | undefined> {
  const rows = await db
    .select({ seq: scenes.seq })
    .from(scenes)
    .leftJoin(sceneResults, eq(sceneResults.sceneId, scenes.id))
    .where(and(eq(scenes.sessionId, sessionId), isNull(sceneResults.id)))
    .orderBy(desc(scenes.seq))
    .limit(1);
  return rows[0]?.seq;
}

/** Trusted places within radius, nearest first, excluding used and cooled-down places. */
export async function listCandidates(
  args: {
    areaId: string;
    originLat: number;
    originLng: number;
    radiusM: number;
    excludePlaceIds: string[];
    userId: string;
  },
  limit = 12,
): Promise<Candidate[]> {
  const origin = geo(args.originLng, args.originLat);
  const exclude = excludePlaceIdsSql(args.excludePlaceIds);

  // TODO: opening-hours filter once open_hours shape + session timezone are settled.
  const rows = await db.execute(sql`
    select ${places.id} as "placeId",
           ${places.category} as "category",
           ST_Distance(${places.point}, ${origin}) as "distanceM",
           ST_Y(${places.point}::geometry) as "lat",
           ST_X(${places.point}::geometry) as "lng"
    from ${places}
    left join visit_history v on v.place_id = ${places.id} and v.user_id = ${args.userId}
    where ${places.areaId} = ${args.areaId}
      and ST_DWithin(${places.point}, ${origin}, ${args.radiusM})
      ${exclude}
      and (v.place_id is null
           or v.last_visited_at < now() - make_interval(days => ${places.cooldownDays}))
      and not exists (
        select 1 from veto vt
        where vt.user_id = ${args.userId}
          and (vt.place_id = ${places.id} or vt.category = ${places.category})
      )
    order by "distanceM" asc
    limit ${limit}
  `);
  return rows as unknown as Candidate[];
}

/** Insert the next scene for an active session. */
export async function insertNextScene(args: {
  sessionId: string;
  draft: MoveSceneDraft;
  placeId: string;
  distanceM: number;
  generatedBy: 'template' | 'llm';
}): Promise<SceneRow> {
  return db.transaction(async (tx) => {
    const [seqRow] = await tx
      .select({ seq: sql<number>`coalesce(max(${scenes.seq}), 0) + 1` })
      .from(scenes)
      .where(eq(scenes.sessionId, args.sessionId));
    const seq = seqRow!.seq;

    const [inserted] = await tx
      .insert(scenes)
      .values({
        sessionId: args.sessionId,
        seq,
        type: args.draft.type,
        title: args.draft.title,
        body: args.draft.body,
        hint: args.draft.hint,
        placeId: args.placeId,
        distanceM: args.distanceM,
        timeLimitMin: args.draft.timeLimitMin,
        revealNameAfterArrival: args.draft.revealNameAfterArrival,
        generatedBy: args.generatedBy,
      })
      .returning({
        id: scenes.id,
        sessionId: scenes.sessionId,
        seq: scenes.seq,
        type: scenes.type,
        title: scenes.title,
        body: scenes.body,
        hint: scenes.hint,
        distanceM: scenes.distanceM,
        timeLimitMin: scenes.timeLimitMin,
        revealNameAfterArrival: scenes.revealNameAfterArrival,
        createdAt: scenes.createdAt,
      });

    const coordRows = await tx.execute(sql`
      select ST_Y(${places.point}::geometry) as "targetLat",
             ST_X(${places.point}::geometry) as "targetLng"
      from ${places}
      where ${places.id} = ${args.placeId}
    `);
    const { targetLat, targetLng } = (
      coordRows as unknown as { targetLat: number; targetLng: number }[]
    )[0]!;

    return { ...inserted!, targetLat, targetLng };
  });
}
