import { z } from 'zod';

export interface DirectorCandidate {
  placeId: string;
  category: string;
  distanceM: number;
}

export interface DirectorRequest {
  mode: 'solo' | 'date' | 'friends';
  transport: 'walk' | 'transit' | 'car';
  remainingMin: number;
  priorSceneCount: number;
  candidates: DirectorCandidate[];
}

/** Shape the model must return. Untrusted until it also passes the caller's
 *  deterministic checks (placeId in the candidate set, time budget). */
export const directorDecisionSchema = z.object({
  placeId: z.string().min(1),
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
