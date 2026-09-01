import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { optionalUserId } from '../../app/plugins/auth.js';
import {
  kakaoLoginBody,
  logoutBody,
  logoutResponse,
  refreshBody,
  refreshResponse,
  tokenPairResponse,
} from './auth.schema.js';
import { loginWithKakao, logout, refreshTokens } from './auth.service.js';

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  app.post(
    '/auth/kakao',
    {
      schema: {
        tags: ['auth'],
        summary: 'Log in with a Kakao access token (link on first use)',
        body: kakaoLoginBody,
        response: { 200: tokenPairResponse },
      },
    },
    async (request) => {
      const callerUserId = await optionalUserId(request);
      return loginWithKakao(app, callerUserId, request.body.kakaoAccessToken);
    },
  );

  app.post(
    '/auth/refresh',
    {
      schema: {
        tags: ['auth'],
        summary: 'Exchange a refresh token for a new token pair',
        body: refreshBody,
        response: { 200: refreshResponse },
      },
    },
    async (request) => refreshTokens(app, request.body.refreshToken),
  );

  app.post(
    '/auth/logout',
    {
      schema: {
        tags: ['auth'],
        summary: 'Revoke a refresh token',
        body: logoutBody,
        response: { 200: logoutResponse },
      },
    },
    async (request) => {
      await logout(request.body.refreshToken);
      return { ok: true as const };
    },
  );
}
