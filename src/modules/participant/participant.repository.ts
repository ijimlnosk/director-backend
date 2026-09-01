import { and, eq } from 'drizzle-orm';

import { db } from '../../shared/database/client.js';
import { participants, sessions, users } from '../../shared/database/schema.js';
import type { ParticipantRow } from './participant.schema.js';

export interface JoinableSession {
  id: string;
  hostUserId: string;
  mode: 'solo' | 'date' | 'friends';
  status: string;
}

export async function findSessionByInviteCode(
  code: string,
): Promise<JoinableSession | undefined> {
  const [row] = await db
    .select({
      id: sessions.id,
      hostUserId: sessions.hostUserId,
      mode: sessions.mode,
      status: sessions.status,
    })
    .from(sessions)
    .where(eq(sessions.inviteCode, code))
    .limit(1);
  return row;
}

export async function listParticipants(sessionId: string): Promise<ParticipantRow[]> {
  return db
    .select({
      userId: participants.userId,
      handle: users.handle,
      role: participants.role,
      team: participants.team,
      state: participants.state,
      joinedAt: participants.joinedAt,
    })
    .from(participants)
    .innerJoin(users, eq(users.id, participants.userId))
    .where(eq(participants.sessionId, sessionId))
    .orderBy(participants.joinedAt);
}

export async function findParticipant(
  sessionId: string,
  userId: string,
): Promise<ParticipantRow | undefined> {
  const [row] = await db
    .select({
      userId: participants.userId,
      handle: users.handle,
      role: participants.role,
      team: participants.team,
      state: participants.state,
      joinedAt: participants.joinedAt,
    })
    .from(participants)
    .innerJoin(users, eq(users.id, participants.userId))
    .where(and(eq(participants.sessionId, sessionId), eq(participants.userId, userId)))
    .limit(1);
  return row;
}

export async function countJoined(sessionId: string): Promise<number> {
  const rows = await db
    .select({ userId: participants.userId })
    .from(participants)
    .where(and(eq(participants.sessionId, sessionId), eq(participants.state, 'joined')));
  return rows.length;
}

/** Add a member (re-join flips a previous 'left' back to 'joined'). */
export async function addMember(sessionId: string, userId: string): Promise<void> {
  await db
    .insert(participants)
    .values({ sessionId, userId, role: 'member', state: 'joined', joinedAt: new Date() })
    .onConflictDoUpdate({
      target: [participants.sessionId, participants.userId],
      set: { state: 'joined', joinedAt: new Date() },
    });
}

export async function setParticipantState(
  sessionId: string,
  userId: string,
  state: 'joined' | 'left',
): Promise<void> {
  await db
    .update(participants)
    .set({ state })
    .where(and(eq(participants.sessionId, sessionId), eq(participants.userId, userId)));
}
