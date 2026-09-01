import { z } from 'zod';

import { userView } from '../user/user.schema.js';

export const kakaoLoginBody = z.object({
  kakaoAccessToken: z.string().min(10),
});

export const refreshBody = z.object({
  refreshToken: z.string().min(10),
});

export const logoutBody = z.object({
  refreshToken: z.string().min(10),
});

export const tokenPairResponse = z.object({
  token: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int(),
  user: userView,
});

export const refreshResponse = z.object({
  token: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int(),
});

export const logoutResponse = z.object({ ok: z.literal(true) });
