import { formatDistance } from '../../shared/geo/distance.js';

export interface CutSummaryInput {
  endedAt: Date;
  arrivedCount: number;
  skippedCount: number;
  totalWalkedM: number;
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** Deterministic End Credits copy. An AI pass can rewrite this later. */
export function buildCutCopy(input: CutSummaryInput): { title: string; summaryLine: string } {
  const { endedAt, arrivedCount, skippedCount, totalWalkedM } = input;
  const date = `${endedAt.getFullYear()}.${pad(endedAt.getMonth() + 1)}.${pad(endedAt.getDate())}`;
  return {
    title: `${date}의 여정`,
    summaryLine: `도착 ${arrivedCount} · 건너뜀 ${skippedCount} · ${formatDistance(totalWalkedM)}`,
  };
}
