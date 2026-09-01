import type { FastifyInstance } from 'fastify';

import { signAccessToken } from '../../app/plugins/auth.js';
import { env } from '../../shared/config/env.js';
import { AppError, notFound } from '../../shared/errors/app-error.js';
import { findUserById } from '../user/user.repository.js';
import type { UserView } from '../user/user.schema.js';
import {
  findUserIdByProvider,
  findValidRefreshToken,
  linkProvider,
  revokeRefreshToken,
  storeRefreshToken,
} from './auth.repository.js';
import { generateRefreshToken, hashRefreshToken } from './auth.token.js';
import { fetchKakaoProfile, KakaoAuthError } from './kakao.js';

export interface TokenPair {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

async function issueTokens(app: FastifyInstance, userId: string): Promise<TokenPair> {
  const refreshToken = generateRefreshToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
  await storeRefreshToken(userId, hashRefreshToken(refreshToken), expiresAt);
  return {
    token: signAccessToken(app, userId),
    refreshToken,
    expiresIn: env.ACCESS_TOKEN_TTL_SEC,
  };
}

/** Device registration issues a token pair too. */
export function issueForUser(app: FastifyInstance, userId: string): Promise<TokenPair> {
  return issueTokens(app, userId);
}

/** Log in with Kakao. Links Kakao to the caller's device user on first use;
 *  afterwards resolves to that same canonical user from any device. */
export async function loginWithKakao(
  app: FastifyInstance,
  callerUserId: string | null,
  kakaoAccessToken: string,
): Promise<TokenPair & { user: UserView }> {
  let profile;
  try {
    profile = await fetchKakaoProfile(kakaoAccessToken);
  } catch (error) {
    if (error instanceof KakaoAuthError) {
      throw new AppError('AUTHENTICATION', error.message);
    }
    throw error;
  }

  let userId = await findUserIdByProvider('kakao', profile.providerUserId);
  if (userId === undefined) {
    if (callerUserId === null) {
      throw new AppError(
        'AUTHENTICATION',
        'Register a device account first, then link Kakao with that token',
      );
    }
    await linkProvider({
      userId: callerUserId,
      provider: 'kakao',
      providerUserId: profile.providerUserId,
      email: profile.email,
      nickname: profile.nickname,
    });
    userId = callerUserId;
  }

  const user = await findUserById(userId);
  if (user === undefined) {
    throw notFound('user');
  }
  return { ...(await issueTokens(app, userId)), user };
}

/** Rotate a refresh token: the old one is revoked, a fresh pair returned. */
export async function refreshTokens(
  app: FastifyInstance,
  refreshToken: string,
): Promise<TokenPair> {
  const hash = hashRefreshToken(refreshToken);
  const record = await findValidRefreshToken(hash);
  if (record === undefined) {
    throw new AppError('AUTHENTICATION', 'Refresh token is invalid or expired');
  }
  await revokeRefreshToken(hash);
  return issueTokens(app, record.userId);
}

export async function logout(refreshToken: string): Promise<void> {
  await revokeRefreshToken(hashRefreshToken(refreshToken));
}
