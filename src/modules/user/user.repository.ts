import { eq } from 'drizzle-orm';

import { db } from '../../shared/database/client.js';
import { users } from '../../shared/database/schema.js';
import type { RegisterDeviceInput, UserView } from './user.schema.js';

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
