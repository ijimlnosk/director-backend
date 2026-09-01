import { z } from 'zod';

import { DEFAULT_CATEGORY_GROUPS } from '../../integrations/places/places.types.js';
import { openHoursSchema } from '../../shared/opening-hours.js';

export const areaView = z.object({
  id: z.uuid(),
  name: z.string(),
  center: z.object({ lat: z.number(), lng: z.number() }),
});

export type AreaView = z.infer<typeof areaView>;

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

export const placeHoursParams = z.object({ areaId: z.uuid(), placeId: z.uuid() });

export const setPlaceHoursBody = z.object({ openHours: openHoursSchema });

export type SetPlaceHoursInput = z.infer<typeof setPlaceHoursBody>;

export const placeHoursResponse = z.object({
  placeId: z.uuid(),
  openHours: openHoursSchema,
});
