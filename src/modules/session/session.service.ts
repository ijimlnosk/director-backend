import { WeatherProviderError, weatherProvider, type WeatherSnapshot } from '../../integrations/weather/index.js';
import { AppError, conflict, notFound } from '../../shared/errors/app-error.js';
import { toSessionView, type CreateSessionInput, type SessionView } from './session.schema.js';
import {
  activateSession,
  areaExists,
  findSessionById,
  insertDraftSession,
} from './session.repository.js';

/** Create a DRAFT session owned by the given user. */
export async function createDraftSession(
  userId: string,
  input: CreateSessionInput,
): Promise<SessionView> {
  if (!(await areaExists(input.areaId))) {
    throw notFound('area');
  }
  const row = await insertDraftSession(userId, input);
  return toSessionView(row);
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

/** SAFETY CHECK: capture weather at the origin and move the session to active. */
export async function startSession(userId: string, sessionId: string): Promise<SessionView> {
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
  return toSessionView(activated);
}
