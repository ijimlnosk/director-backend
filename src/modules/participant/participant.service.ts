import { conflict, forbidden, notFound } from '../../shared/errors/app-error.js';
import {
  addMember,
  countJoined,
  findParticipant,
  findSessionByInviteCode,
  listParticipants,
  setParticipantState,
} from './participant.repository.js';
import {
  MODE_CAPACITY,
  toParticipantView,
  type ParticipantView,
} from './participant.schema.js';

const JOINABLE_STATUS = new Set(['draft', 'checking', 'active']);

/** Join a session by its invite code. */
export async function joinSession(
  userId: string,
  inviteCode: string,
): Promise<{ sessionId: string; participants: ParticipantView[] }> {
  const session = await findSessionByInviteCode(inviteCode);
  if (session === undefined) {
    throw notFound('session');
  }
  if (!JOINABLE_STATUS.has(session.status)) {
    throw conflict(`Session is ${session.status}; it can no longer be joined`);
  }

  const existing = await findParticipant(session.id, userId);
  if (existing?.state === 'joined') {
    return { sessionId: session.id, participants: await listView(session.id) };
  }
  if (session.hostUserId === userId) {
    throw conflict('You are the host of this session');
  }
  if ((await countJoined(session.id)) >= MODE_CAPACITY[session.mode]) {
    throw conflict('Session is full');
  }

  await addMember(session.id, userId);
  return { sessionId: session.id, participants: await listView(session.id) };
}

/** A member leaves; the host cannot (they abandon or end instead). */
export async function leaveSession(userId: string, sessionId: string): Promise<ParticipantView[]> {
  const me = await findParticipant(sessionId, userId);
  if (me === undefined) {
    throw notFound('participant');
  }
  if (me.role === 'host') {
    throw conflict('The host cannot leave; abandon or end the session instead');
  }
  if (me.state !== 'left') {
    await setParticipantState(sessionId, userId, 'left');
  }
  return listView(sessionId);
}

/** List participants; the caller must be one of them. */
export async function getParticipants(
  userId: string,
  sessionId: string,
): Promise<ParticipantView[]> {
  const me = await findParticipant(sessionId, userId);
  if (me === undefined) {
    throw forbidden('You are not a participant of this session');
  }
  return listView(sessionId);
}

async function listView(sessionId: string): Promise<ParticipantView[]> {
  return (await listParticipants(sessionId)).map(toParticipantView);
}
