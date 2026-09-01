import { and, eq, gt, isNull, sql } from 'drizzle-orm';

import { db } from '../../shared/database/client.js';
import { refreshTokens, users } from '../../shared/database/schema.js';

export async function storeRefreshToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<void> {
  await db.insert(refreshTokens).values({ userId, tokenHash, expiresAt });
}

export interface RefreshRecord {
  id: string;
  userId: string;
}

export async function findValidRefreshToken(tokenHash: string): Promise<RefreshRecord | undefined> {
  const [row] = await db
    .select({ id: refreshTokens.id, userId: refreshTokens.userId })
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return row;
}

export async function revokeRefreshToken(tokenHash: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)));
}

export async function findUserIdByProvider(
  provider: string,
  providerUserId: string,
): Promise<string | undefined> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.provider, provider), eq(users.providerUserId, providerUserId)))
    .limit(1);
  return row?.id;
}

/** Attach a social identity to a user, filling in handle if it is empty. */
export async function linkProvider(args: {
  userId: string;
  provider: string;
  providerUserId: string;
  email: string | null;
  nickname: string | null;
}): Promise<void> {
  await db
    .update(users)
    .set({
      provider: args.provider,
      providerUserId: args.providerUserId,
      email: args.email,
      handle: sql`coalesce(${users.handle}, ${args.nickname})`,
    })
    .where(eq(users.id, args.userId));
}
