import { env } from '../../shared/config/env.js';
import { createAnthropicDirector } from './anthropic-director.js';
import type { AiDirector } from './ai-director.types.js';

const disabledDirector: AiDirector = {
  enabled: false,
  decide() {
    return Promise.reject(new Error('AI director is disabled (AI_API_KEY not set)'));
  },
};

/** Process-wide AI Director. Falls back to a disabled stub when no key is configured. */
export const aiDirector: AiDirector = env.AI_API_KEY
  ? createAnthropicDirector({
      apiKey: env.AI_API_KEY,
      model: env.AI_MODEL,
      timeoutMs: env.AI_TIMEOUT_MS,
    })
  : disabledDirector;

export { AiDirectorError } from './ai-director.types.js';
export type { AiDirector, DirectorDecision, DirectorRequest } from './ai-director.types.js';
