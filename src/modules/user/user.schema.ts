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

const categoryList = z.array(z.string().min(1).max(60)).max(30).default([]);

export const setPreferencesBody = z.object({
  liked: categoryList,
  disliked: categoryList,
});

export type SetPreferencesInput = z.infer<typeof setPreferencesBody>;

export const preferencesView = z.object({
  liked: z.array(z.string()),
  disliked: z.array(z.string()),
});

export type PreferencesView = z.infer<typeof preferencesView>;

export const preferencesResponse = z.object({ preferences: preferencesView });
