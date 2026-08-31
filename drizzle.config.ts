import { defineConfig } from 'drizzle-kit';

import { env } from './src/shared/config/env.js';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/shared/database/schema.ts',
  out: './drizzle',
  extensionsFilters: ['postgis'],
  dbCredentials: {
    url: env.DATABASE_URL,
  },
});
