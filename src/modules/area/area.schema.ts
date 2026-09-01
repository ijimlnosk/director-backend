import { z } from 'zod';

import { DEFAULT_CATEGORY_GROUPS } from '../../integrations/places/places.types.js';

export const areaView = z.object({
  id: z.uuid(),
  name: z.string(),
  center: z.object({ lat: z.number(), lng: z.number() }),
});

export type AreaView = z.infer<typeof areaView>;

export const areasResponse = z.object({ areas: z.array(areaView) });

export const areaParams = z.object({ areaId: z.uuid() });

export const ingestPlacesBody = z.object({
  radiusM: z.number().int().min(100).max(20_000).default(1500),
  categoryGroupCodes: z.array(z.string().min(1)).min(1).default(DEFAULT_CATEGORY_GROUPS),
});

export type IngestPlacesInput = z.infer<typeof ingestPlacesBody>;

export const ingestPlacesResponse = z.object({
  fetched: z.number().int(),
  inserted: z.number().int(),
  skipped: z.number().int(),
});
