import { z } from 'zod';

export const areaView = z.object({
  id: z.uuid(),
  name: z.string(),
  center: z.object({ lat: z.number(), lng: z.number() }),
});

export type AreaView = z.infer<typeof areaView>;

export const areasResponse = z.object({ areas: z.array(areaView) });
