import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { feedbackParams, feedbackResponse, submitFeedbackBody } from './feedback.schema.js';
import { getFeedback, submitFeedback } from './feedback.service.js';

export async function feedbackRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post(
    '/sessions/:sessionId/feedback',
    {
      schema: {
        tags: ['feedback'],
        summary: 'Submit feedback for a finished session',
        security: [{ bearerAuth: [] }],
        params: feedbackParams,
        body: submitFeedbackBody,
        response: { 200: feedbackResponse },
      },
      onRequest: app.authenticate,
    },
    async (request) => ({
      feedback: await submitFeedback(request.user.sub, request.params.sessionId, request.body),
    }),
  );

  app.get(
    '/sessions/:sessionId/feedback',
    {
      schema: {
        tags: ['feedback'],
        summary: "Read a session's feedback",
        security: [{ bearerAuth: [] }],
        params: feedbackParams,
        response: { 200: feedbackResponse },
      },
      onRequest: app.authenticate,
    },
    async (request) => ({
      feedback: await getFeedback(request.user.sub, request.params.sessionId),
    }),
  );
}
