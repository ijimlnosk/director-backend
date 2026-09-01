import { eq } from 'drizzle-orm';

import { db } from '../../shared/database/client.js';
import { userPreferences, users } from '../../shared/database/schema.js';
import type { PreferencesView, RegisterDeviceInput, UserView } from './user.schema.js';

const VIEW_COLUMNS = {
  id: users.id,
  handle: users.handle,
  subscription: users.subscription,
  locationPermission: users.locationPermission,
} as const;

/** Insert-or-update a user keyed by its device id. */
export async function upsertUserByDeviceId(input: RegisterDeviceInput): Promise<UserView> {
  const [row] = await db
    .insert(users)
    .values({
      deviceId: input.deviceId,
      handle: input.handle ?? null,
      locationPermission: input.locationPermission,
    })
    .onConflictDoUpdate({
      target: users.deviceId,
      set: {
        locationPermission: input.locationPermission,
        ...(input.handle !== undefined ? { handle: input.handle } : {}),
      },
    })
    .returning(VIEW_COLUMNS);

  return row!;
}

export async function findUserById(id: string): Promise<UserView | undefined> {
  const [row] = await db.select(VIEW_COLUMNS).from(users).where(eq(users.id, id)).limit(1);
  return row;
}

export async function getUserPreferences(userId: string): Promise<PreferencesView> {
  const rows = await db
    .select({ category: userPreferences.category, weight: userPreferences.weight })
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId));
  return {
    liked: rows.filter((r) => r.weight > 0).map((r) => r.category),
    disliked: rows.filter((r) => r.weight < 0).map((r) => r.category),
  };
}

/** Replace all of a user's explicit category preferences. */
export async function replaceUserPreferences(
  userId: string,
  liked: string[],
  disliked: string[],
): Promise<void> {
  const rows = [
    ...new Map<string, number>([
      ...liked.map((c) => [c, 1] as const),
      ...disliked.map((c) => [c, -1] as const),
    ]).entries(),
  ].map(([category, weight]) => ({ userId, category, weight }));

  await db.transaction(async (tx) => {
    await tx.delete(userPreferences).where(eq(userPreferences.userId, userId));
    if (rows.length > 0) await tx.insert(userPreferences).values(rows);
  });
}

