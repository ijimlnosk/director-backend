import { eq } from 'drizzle-orm';

import { db } from '../../shared/database/client.js';
import { sessionFeedback, sessions } from '../../shared/database/schema.js';
import type { FeedbackRow, SubmitFeedbackInput } from './feedback.schema.js';

const RETURN = {
  sessionId: sessionFeedback.sessionId,
  rating: sessionFeedback.rating,
  funLevel: sessionFeedback.funLevel,
  distanceFeel: sessionFeedback.distanceFeel,
  difficultyFeel: sessionFeedback.difficultyFeel,
  freeText: sessionFeedback.freeText,
  createdAt: sessionFeedback.createdAt,
} as const;

export async function sessionOwnerStatus(
  sessionId: string,
): Promise<{ hostUserId: string; status: string } | undefined> {
  const [row] = await db
    .select({ hostUserId: sessions.hostUserId, status: sessions.status })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);
  return row;
}

export async function findFeedback(sessionId: string): Promise<FeedbackRow | undefined> {
  const [row] = await db
    .select(RETURN)
    .from(sessionFeedback)
    .where(eq(sessionFeedback.sessionId, sessionId))
    .limit(1);
  return row;
}

export async function upsertFeedback(
  sessionId: string,
  input: SubmitFeedbackInput,
): Promise<FeedbackRow> {
  const values = {
    sessionId,
    rating: input.rating,
    funLevel: input.funLevel ?? null,
    distanceFeel: input.distanceFeel ?? null,
    difficultyFeel: input.difficultyFeel ?? null,
    freeText: input.freeText ?? null,
  };
  const [row] = await db
    .insert(sessionFeedback)
    .values(values)
    .onConflictDoUpdate({ target: sessionFeedback.sessionId, set: values })
    .returning(RETURN);
  return row!;
}
