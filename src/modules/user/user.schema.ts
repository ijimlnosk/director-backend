import { z } from 'zod';

export const registerDeviceBody = z.object({
  deviceId: z.string().min(1).max(200),
  handle: z.string().min(1).max(50).optional(),
  locationPermission: z.enum(['granted', 'denied']),
});

export type RegisterDeviceInput = z.infer<typeof registerDeviceBody>;

export const userView = z.object({
  id: z.uuid(),
  handle: z.string().nullable(),
  subscription: z.enum(['free', 'plus']),
  locationPermission: z.enum(['granted', 'denied']),
});

export type UserView = z.infer<typeof userView>;

export const registerDeviceResponse = z.object({
  token: z.string(),
  user: userView,
});
