import 'dotenv/config';
import { z } from 'zod';

/** Treat an empty env var (common from `${VAR:-}` in compose) as unset. */
const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().min(1).optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().max(65_535).default(3000),
  DATABASE_URL: z.url().startsWith('postgres'),
  JWT_SECRET: z.string().min(32),
  AI_API_KEY: optionalString,
  AI_WORKSPACE_ID: optionalString,
  AI_MODEL: z.string().default('claude-opus-5'),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().max(60_000).default(8000),
});

export const env = envSchema.parse(process.env);
