import { WeatherProviderError, weatherProvider, type WeatherSnapshot } from '../../integrations/weather/index.js';
import { AppError, conflict, notFound } from '../../shared/errors/app-error.js';
import { randomInt } from 'node:crypto';

import { runStartChecks, type StartChecks } from './session.checks.js';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newInviteCode = (): string =>
  Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
import {
  toSessionListItem,
  toSessionView,
  type CreateSessionInput,
  type ListSessionsQuery,
  type SessionListItem,
  type SessionView,
} from './session.schema.js';
import {
  abandonSession as abandonSessionRow,
  activateSession,
  areaExists,
  areaSummary,
  findSessionById,
  insertDraftSession,
  listSessionsForUser,
} from './session.repository.js';

/** Create a DRAFT session owned by the given user. */
export async function createDraftSession(
  userId: string,
  input: CreateSessionInput,
): Promise<SessionView> {
  if (!(await areaExists(input.areaId))) {
    throw notFound('area');
  }
  const inviteCode = input.mode === 'solo' ? null : newInviteCode();
  const row = await insertDraftSession(userId, input, inviteCode);
  return toSessionView(row);
}

/** The caller's sessions, newest first. */
export async function listSessions(
  userId: string,
  query: ListSessionsQuery,
): Promise<SessionListItem[]> {
  const rows = await listSessionsForUser(userId, query);
  return rows.map(({ sceneCount, ...row }) => toSessionListItem(row, sceneCount));
}

/** Abandon an in-progress session. Idempotent once abandoned. */
export async function abandonSession(userId: string, sessionId: string): Promise<SessionView> {
  const row = await findSessionById(sessionId);
  if (row === undefined) {
    throw notFound('session');
  }
  if (row.hostUserId !== userId) {
    throw new AppError('AUTHORIZATION', 'You do not have access to this session');
  }
  if (row.status === 'abandoned') {
    return toSessionView(row);
  }
  const abandoned = await abandonSessionRow(sessionId);
  if (abandoned === undefined) {
    throw conflict(`Session is ${row.status}; it cannot be abandoned`);
  }
  return toSessionView(abandoned);
}

/** Fetch a session, enforcing that the requester is its host. */
export async function getSessionForUser(userId: string, sessionId: string): Promise<SessionView> {
  const row = await findSessionById(sessionId);
  if (row === undefined) {
    throw notFound('session');
  }
  if (row.hostUserId !== userId) {
    throw new AppError('AUTHORIZATION', 'You do not have access to this session');
  }
  return toSessionView(row);
}

/** SAFETY CHECK: capture weather, run the start checks, move the session to active. */
export async function startSession(
  userId: string,
  sessionId: string,
): Promise<{ session: SessionView; checks: StartChecks }> {
  const row = await findSessionById(sessionId);
  if (row === undefined) {
    throw notFound('session');
  }
  if (row.hostUserId !== userId) {
    throw new AppError('AUTHORIZATION', 'You do not have access to this session');
  }
  if (row.status !== 'draft') {
    throw conflict(`Session is ${row.status}; only a draft session can be started`);
  }

  const area = await areaSummary(row.areaId);
  if (area === undefined) {
    throw notFound('area');
  }

  let weather: WeatherSnapshot | null = null;
  try {
    weather = await weatherProvider.current(row.lat, row.lng);
  } catch (error) {
    if (!(error instanceof WeatherProviderError)) throw error;
    // eslint-disable-next-line no-console -- no shared logger yet; visible in container logs
    console.warn('[weather] snapshot unavailable, starting without it:', error.message);
  }

  const activated = await activateSession(sessionId, weather);
  if (activated === undefined) {
    // Lost a race: someone else started it first.
    throw conflict('Session is no longer a draft');
  }

  const checks = await runStartChecks({
    userId,
    sessionId,
    area,
    transport: row.transport,
    purpose: row.purpose,
    durationMin: row.durationMin,
    originLat: row.lat,
    originLng: row.lng,
    weather,
  });

  return { session: toSessionView(activated), checks };
}
