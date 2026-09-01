import { z } from 'zod';

export interface DirectorCandidate {
  placeId: string;
  category: string;
  distanceM: number;
}

export interface DirectorRequest {
  mode: 'solo' | 'date' | 'friends';
  mood: 'chill' | 'adventurous' | null;
  purpose: 'explore' | 'walk' | 'food' | 'culture';
  transport: 'walk' | 'transit' | 'car';
  remainingMin: number;
  priorSceneCount: number;
  /** Categories of the last few scenes; the Director should vary away from these. */
  recentCategories: string[];
  /** Categories the player tends to enjoy - lean toward these. */
  preferredCategories: string[];
  /** Categories the player tends to dislike - use only as a last resort. */
  avoidedCategories: string[];
  /** Scene types the Director may choose for this scene. */
  allowedSceneTypes: ('move' | 'photo' | 'observe')[];
  /** Current weather read, when known. */
  weather: { advisory: 'ok' | 'caution' | 'avoid'; summary: string } | null;
  candidates: DirectorCandidate[];
}

/** Shape the model must return. Untrusted until it also passes the caller's
 *  deterministic checks (placeId in the candidate set, time budget). */
export const directorDecisionSchema = z.object({
  placeId: z.string().min(1),
  sceneType: z.enum(['move', 'photo', 'observe']),
  title: z.string().min(1).max(80),
  body: z.string().min(1).max(500),
  hint: z.string().min(1).max(300),
});

export type DirectorDecision = z.infer<typeof directorDecisionSchema>;

export interface AiDirector {
  readonly enabled: boolean;
  decide(request: DirectorRequest): Promise<DirectorDecision>;
}

export class AiDirectorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiDirectorError';
  }
}
