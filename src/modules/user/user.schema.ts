import { z } from 'zod';

export const registerDeviceBody = z.object({
  deviceId: z.string().min(1).max(200),
  handle: z.string().min(1).max(50).optional(),
  locationPermission: z.enum(['granted', 'denied']),
});

export type RegisterDeviceInput = z.infer<typeof registerDeviceBody>;

export interface UserView {
  id: string;
  handle: string | null;
  subscription: 'free' | 'plus';
  locationPermission: 'granted' | 'denied';
}
