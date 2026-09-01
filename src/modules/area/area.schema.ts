import { z } from 'zod';

import { DEFAULT_CATEGORY_GROUPS } from '../../integrations/places/places.types.js';

export const areaView = z.object({
  id: z.uuid(),
  name: z.string(),
  center: z.object({ lat: z.number(), lng: z.number() }),
  /** Metres from the query point to the area, when `near` is given. */
  distanceM: z.number().nullable(),
  /** Whether the query point falls inside the area, when `near` is given. */
  containsPoint: z.boolean(),
});

export type AreaView = z.infer<typeof areaView>;

export const listAreasQuery = z.object({
  near: z
    .string()
    .regex(/^-?\d{1,2}(\.\d+)?,-?\d{1,3}(\.\d+)?$/, 'near must be "lat,lng"')
    .optional(),
});

export type ListAreasQuery = z.infer<typeof listAreasQuery>;

export const areasResponse = z.object({ areas: z.array(areaView) });

export const areaResponse = z.object({ area: areaView });

export const areaParams = z.object({ areaId: z.uuid() });

export const createAreaBody = z.object({
  name: z.string().min(1).max(80),
  center: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
  radiusM: z.number().int().min(200).max(20_000).default(2000),
  isLive: z.boolean().default(true),
});

export type CreateAreaInput = z.infer<typeof createAreaBody>;

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
