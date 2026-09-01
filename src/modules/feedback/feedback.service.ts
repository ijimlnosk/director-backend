import { conflict, forbidden, notFound } from '../../shared/errors/app-error.js';
import {
  findFeedback,
  sessionOwnerStatus,
  upsertFeedback,
} from './feedback.repository.js';
import { toFeedbackView, type FeedbackView, type SubmitFeedbackInput } from './feedback.schema.js';

const FEEDBACK_STATUS = new Set(['completed', 'abandoned', 'archived']);

async function ownedFinishedSession(userId: string, sessionId: string): Promise<void> {
  const session = await sessionOwnerStatus(sessionId);
  if (session === undefined) {
    throw notFound('session');
  }
  if (session.hostUserId !== userId) {
    throw forbidden('You do not have access to this session');
  }
  if (!FEEDBACK_STATUS.has(session.status)) {
    throw conflict(`Session is ${session.status}; feedback is only for a finished session`);
  }
}

/** Create or replace the feedback for a finished session. */
export async function submitFeedback(
  userId: string,
  sessionId: string,
  body: SubmitFeedbackInput,
): Promise<FeedbackView> {
  await ownedFinishedSession(userId, sessionId);
  return toFeedbackView(await upsertFeedback(sessionId, body));
}

export async function getFeedback(userId: string, sessionId: string): Promise<FeedbackView> {
  const session = await sessionOwnerStatus(sessionId);
  if (session === undefined) {
    throw notFound('session');
  }
  if (session.hostUserId !== userId) {
    throw forbidden('You do not have access to this session');
  }
  const row = await findFeedback(sessionId);
  if (row === undefined) {
    throw notFound('feedback');
  }
  return toFeedbackView(row);
}
