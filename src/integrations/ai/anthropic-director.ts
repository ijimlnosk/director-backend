import Anthropic from '@anthropic-ai/sdk';

import {
  AiDirectorError,
  directorDecisionSchema,
  type AiDirector,
  type DirectorDecision,
  type DirectorRequest,
} from './ai-director.types.js';

const SYSTEM_PROMPT = [
  'You are the Director for DIRECTOR, a real-world outing game.',
  'Pick exactly ONE place from the provided candidates for the player\'s next MOVE scene.',
  'Rules:',
  '- placeId MUST be copied verbatim from one of the candidates. Never invent a placeId.',
  '- You are not given place names on purpose; the name is revealed to the player only after arrival.',
  '  Never guess or state a place name in title/body/hint.',
  '- title: a short Korean teaser (<= 20 characters).',
  '- body: 1-2 Korean sentences of direction and mood.',
  '- hint: one Korean sentence hinting at the place category.',
  '- Keep the choice feasible for the given transport and remaining minutes; prefer closer places when time is short.',
  'Answer only by calling the submit_scene tool.',
].join('\n');

const SUBMIT_TOOL: Anthropic.Tool = {
  name: 'submit_scene',
  description: 'Submit the chosen next scene.',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['placeId', 'title', 'body', 'hint'],
    properties: {
      placeId: { type: 'string', description: 'Verbatim placeId of one candidate' },
      title: { type: 'string' },
      body: { type: 'string' },
      hint: { type: 'string' },
    },
  },
};

export interface AnthropicDirectorOptions {
  apiKey: string;
  model: string;
  timeoutMs: number;
  /** Required when AI_API_KEY is an identity-linked key. */
  workspaceId?: string;
}

export function createAnthropicDirector(opts: AnthropicDirectorOptions): AiDirector {
  const client = new Anthropic({
    apiKey: opts.apiKey,
    timeout: opts.timeoutMs,
    maxRetries: 1,
    ...(opts.workspaceId
      ? { defaultHeaders: { 'anthropic-workspace-id': opts.workspaceId } }
      : {}),
  });

  return {
    enabled: true,
    async decide(request: DirectorRequest): Promise<DirectorDecision> {
      let message: Anthropic.Message;
      try {
        message = await client.messages.create({
          model: opts.model,
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          tools: [SUBMIT_TOOL],
          tool_choice: { type: 'tool', name: 'submit_scene' },
          messages: [{ role: 'user', content: JSON.stringify(request) }],
        });
      } catch (error) {
        throw new AiDirectorError(
          `Anthropic request failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      const toolUse = message.content.find((block) => block.type === 'tool_use');
      if (toolUse?.type !== 'tool_use') {
        throw new AiDirectorError('Response contained no tool_use block');
      }

      const parsed = directorDecisionSchema.safeParse(toolUse.input);
      if (!parsed.success) {
        throw new AiDirectorError(`Malformed decision: ${parsed.error.message}`);
      }
      return parsed.data;
    },
  };
}
