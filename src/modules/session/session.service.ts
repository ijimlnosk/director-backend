import { AppError, notFound } from '../../shared/errors/app-error.js';
import { toSessionView, type CreateSessionInput, type SessionView } from './session.schema.js';
import { areaExists, findSessionById, insertDraftSession } from './session.repository.js';

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
