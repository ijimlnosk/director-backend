import { GET_URL_TTL_SEC, storage } from '../../integrations/storage/index.js';
import { conflict, forbidden, notFound } from '../../shared/errors/app-error.js';
import { buildCutCopy } from './cut.templates.js';
import {
  coverPhoto,
  endSessionAndInsertCut,
  findCutRow,
  loadSessionForEnd,
  sessionSceneBreakdown,
  sessionTotals,
} from './cut.repository.js';
import { toCutView, type CutRow, type CutView } from './cut.schema.js';

async function assembleCutView(sessionId: string, cut: CutRow): Promise<CutView> {
  const [scenes, cover] = await Promise.all([
    sessionSceneBreakdown(sessionId),
    coverPhoto(sessionId),
  ]);
  const coverUrl = cover ? await storage.presignGet(cover.storageKey, GET_URL_TTL_SEC) : null;
  return toCutView(cut, scenes, coverUrl);
}

/** End an active session and produce its Cut (End Credits). Idempotent on retry. */
export async function endSession(userId: string, sessionId: string): Promise<CutView> {
  const session = await loadSessionForEnd(sessionId);
  if (session === undefined) {
    throw notFound('session');
  }
  if (session.hostUserId !== userId) {
    throw forbidden('You do not have access to this session');
  }

  if (session.status === 'completed') {
    const existing = await findCutRow(sessionId);
    if (existing !== undefined) {
      return assembleCutView(sessionId, existing);
    }
  } else if (session.status !== 'active') {
    throw conflict(`Session is ${session.status}; only an active session can be ended`);
  }

  const totals = await sessionTotals(sessionId);
  const endedAt = new Date();
  const runtimeSec =
    session.startedAt !== null
      ? Math.max(0, Math.round((endedAt.getTime() - session.startedAt.getTime()) / 1000))
      : totals.totalElapsedSec;

  const copy = buildCutCopy({
    endedAt,
    arrivedCount: totals.arrivedCount,
    skippedCount: totals.skippedCount,
    totalWalkedM: totals.totalWalkedM,
  });

  const cut = await endSessionAndInsertCut({
    sessionId,
    title: copy.title,
    summaryLine: copy.summaryLine,
    totalDistanceM: totals.totalWalkedM,
    runtimeSec,
    coverPhotoId: (await coverPhoto(sessionId))?.id ?? null,
  });
  return assembleCutView(sessionId, cut);
}

/** Read an existing Cut; the caller must be the session host. */
export async function getCut(userId: string, sessionId: string): Promise<CutView> {
  const session = await loadSessionForEnd(sessionId);
  if (session === undefined) {
    throw notFound('session');
  }
  if (session.hostUserId !== userId) {
    throw forbidden('You do not have access to this session');
  }
  const cut = await findCutRow(sessionId);
  if (cut === undefined) {
    throw notFound('cut');
  }
  return assembleCutView(sessionId, cut);
}
