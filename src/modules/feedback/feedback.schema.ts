import { z } from 'zod';

export const feedbackParams = z.object({ sessionId: z.uuid() });

export const submitFeedbackBody = z.object({
  rating: z.number().int().min(1).max(5),
  funLevel: z.number().int().min(1).max(5).optional(),
  distanceFeel: z.enum(['too_short', 'right', 'too_long']).optional(),
  difficultyFeel: z.enum(['too_easy', 'right', 'too_hard']).optional(),
  freeText: z.string().max(2000).optional(),
});

export type SubmitFeedbackInput = z.infer<typeof submitFeedbackBody>;

export const feedbackView = z.object({
  sessionId: z.uuid(),
  rating: z.number().int(),
  funLevel: z.number().int().nullable(),
  distanceFeel: z.enum(['too_short', 'right', 'too_long']).nullable(),
  difficultyFeel: z.enum(['too_easy', 'right', 'too_hard']).nullable(),
  freeText: z.string().nullable(),
  createdAt: z.string(),
});

export type FeedbackView = z.infer<typeof feedbackView>;

export const feedbackResponse = z.object({ feedback: feedbackView });

export interface FeedbackRow {
  sessionId: string;
  rating: number;
  funLevel: number | null;
  distanceFeel: string | null;
  difficultyFeel: string | null;
  freeText: string | null;
  createdAt: Date;
}

export function toFeedbackView(row: FeedbackRow): FeedbackView {
  return {
    sessionId: row.sessionId,
    rating: row.rating,
    funLevel: row.funLevel,
    distanceFeel: row.distanceFeel as FeedbackView['distanceFeel'],
    difficultyFeel: row.difficultyFeel as FeedbackView['difficultyFeel'],
    freeText: row.freeText,
    createdAt: row.createdAt.toISOString(),
  };
}
