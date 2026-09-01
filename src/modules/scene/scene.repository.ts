import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import { db } from '../../shared/database/client.js';
import {
  places,
  sceneResults,
  scenes,
  sessions,
  userPreferences,
} from '../../shared/database/schema.js';
import { excludePlaceIdsSql } from './scene.candidates.js';
import type { Transport } from './scene.constants.js';
import type { MoveSceneDraft } from './scene.templates.js';
import type { SceneListRow, SceneRow } from './scene.schema.js';

const SCENE_ROW_SQL = sql`
  ${scenes.id} as "id",
  ${scenes.sessionId} as "sessionId",
  ${scenes.seq} as "seq",
  ${scenes.type} as "type",
  ${scenes.title} as "title",
  ${scenes.body} as "body",
  ${scenes.hint} as "hint",
  ${scenes.distanceM} as "distanceM",
  ${scenes.timeLimitMin} as "timeLimitMin",
  ${scenes.revealNameAfterArrival} as "revealNameAfterArrival",
  ${scenes.createdAt} as "createdAt",
  ST_Y(${places.point}::geometry) as "targetLat",
  ST_X(${places.point}::geometry) as "targetLng"
`;

/** All scenes of a session, ordered by seq, with their outcome. */
export async function listSceneRows(sessionId: string): Promise<SceneListRow[]> {
  const rows = await db.execute(sql`
    select ${SCENE_ROW_SQL},
           ${sceneResults.outcome} as "outcome",
           ${sceneResults.recordedAt} as "resolvedAt"
    from ${scenes}
    left join ${places} on ${places.id} = ${scenes.placeId}
    left join ${sceneResults} on ${sceneResults.sceneId} = ${scenes.id}
    where ${scenes.sessionId} = ${sessionId}
    order by ${scenes.seq}
  `);
  return rows as unknown as SceneListRow[];
}

/** The latest scene with no result yet, i.e. the one to resume. */
export async function currentSceneRow(sessionId: string): Promise<SceneRow | undefined> {
  const rows = await db.execute(sql`
    select ${SCENE_ROW_SQL}
    from ${scenes}
    left join ${places} on ${places.id} = ${scenes.placeId}
    left join ${sceneResults} on ${sceneResults.sceneId} = ${scenes.id}
    where ${scenes.sessionId} = ${sessionId} and ${sceneResults.id} is null
    order by ${scenes.seq} desc
    limit 1
  `);
  return (rows as unknown as SceneRow[])[0];
}

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

export interface PriorScene {
  placeId: string | null;
  category: string | null;
  timeLimitMin: number;
  lat: number | null;
  lng: number | null;
}

/** Prior scenes of a session with their place location and category, by seq. */
export async function priorScenes(sessionId: string): Promise<PriorScene[]> {
  const rows = await db.execute(sql`
    select ${scenes.placeId} as "placeId",
           ${places.category} as "category",
           ${scenes.timeLimitMin} as "timeLimitMin",
           ST_Y(${places.point}::geometry) as "lat",
           ST_X(${places.point}::geometry) as "lng"
    from ${scenes}
    left join ${places} on ${places.id} = ${scenes.placeId}
    where ${scenes.sessionId} = ${sessionId}
    order by ${scenes.seq}
  `);
  return rows as unknown as PriorScene[];
}

/** Where the player is now: last arrival point, else last scene's place. */
export async function lastSceneAnchor(
  sessionId: string,
): Promise<{ lat: number; lng: number } | undefined> {
  const rows = await db.execute(sql`
    select coalesce(ST_Y(${sceneResults.arrivedPoint}::geometry),
                    ST_Y(${places.point}::geometry)) as "lat",
           coalesce(ST_X(${sceneResults.arrivedPoint}::geometry),
                    ST_X(${places.point}::geometry)) as "lng"
    from ${scenes}
    left join ${sceneResults} on ${sceneResults.sceneId} = ${scenes.id}
    left join ${places} on ${places.id} = ${scenes.placeId}
    where ${scenes.sessionId} = ${sessionId}
    order by ${scenes.seq} desc
    limit 1
  `);
  const row = (rows as unknown as { lat: number | null; lng: number | null }[])[0];
  if (row === undefined || row.lat === null || row.lng === null) return undefined;
  return { lat: row.lat, lng: row.lng };
}

/** Soft category signals for the Director: explicit likes, and dislikes
 *  (explicit + categories skipped "not_interested" at least twice). */
export async function softCategoryPreferences(
  userId: string,
): Promise<{ preferred: string[]; avoided: string[] }> {
  const explicit = await db
    .select({ category: userPreferences.category, weight: userPreferences.weight })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId));

  const behavioural = await db.execute(sql`
    select p.category as "category"
    from scene_result r
    join scene s on s.id = r.scene_id
    join place p on p.id = s.place_id
    where r.user_id = ${userId}
      and r.outcome = 'skipped'
      and r.skip_reason = 'not_interested'
    group by p.category
    having count(*) >= 2
  `);

  const avoided = new Set(explicit.filter((r) => r.weight < 0).map((r) => r.category));
  for (const row of behavioural as unknown as { category: string }[]) avoided.add(row.category);

  return {
    preferred: explicit.filter((r) => r.weight > 0).map((r) => r.category),
    avoided: [...avoided],
  };
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

/**
 * Trusted places for the next scene: within `radiusM` of the anchor but at
 * least `minStepM` away, not already used this session, not within
 * `SAME_SPOT_M` of a place used this session, not cooled down, not vetoed.
 * The nearest `poolSize` are then shuffled and the first `limit` returned, so
 * the same origin does not always yield the same scene.
 */
export async function listCandidates(
  args: {
    areaId: string;
    anchorLat: number;
    anchorLng: number;
    radiusM: number;
    minStepM: number;
    excludePlaceIds: string[];
    avoidPoints: { lat: number; lng: number }[];
    avoidRadiusM: number;
    userId: string;
  },
  limit = 24,
  poolSize = 60,
): Promise<Candidate[]> {
  const anchor = geo(args.anchorLng, args.anchorLat);
  const exclude = excludePlaceIdsSql(args.excludePlaceIds);
  const declutter =
    args.avoidPoints.length === 0
      ? sql``
      : sql`and ${sql.join(
          args.avoidPoints.map(
            (p) =>
              sql`not ST_DWithin(${places.point}, ${geo(p.lng, p.lat)}, ${args.avoidRadiusM})`,
          ),
          sql` and `,
        )}`;

  // TODO: opening-hours filter once open_hours shape + session timezone are settled.
  const rows = await db.execute(sql`
    select "placeId", "category", "distanceM", "lat", "lng"
    from (
      select ${places.id} as "placeId",
             ${places.category} as "category",
             ST_Distance(${places.point}, ${anchor}) as "distanceM",
             ST_Y(${places.point}::geometry) as "lat",
             ST_X(${places.point}::geometry) as "lng"
      from ${places}
      left join visit_history v on v.place_id = ${places.id} and v.user_id = ${args.userId}
      where ${places.areaId} = ${args.areaId}
        and ST_DWithin(${places.point}, ${anchor}, ${args.radiusM})
        and ST_Distance(${places.point}, ${anchor}) >= ${args.minStepM}
        ${exclude}
        ${declutter}
        and (v.place_id is null
             or v.last_visited_at < now() - make_interval(days => ${places.cooldownDays}))
        and not exists (
          select 1 from veto vt
          where vt.user_id = ${args.userId}
            and (vt.place_id = ${places.id} or vt.category = ${places.category})
        )
      order by "distanceM" asc
      limit ${poolSize}
    ) pool
    order by random()
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
