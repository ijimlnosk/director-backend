import { placesProvider, PlacesProviderError } from '../../integrations/places/index.js';
import { AppError, notFound } from '../../shared/errors/app-error.js';
import { areaCentroid, areaIsLive, insertPlaces } from './area.repository.js';
import type { IngestPlacesInput } from './area.schema.js';

export interface IngestResult {
  fetched: number;
  inserted: number;
  skipped: number;
}

/** Pull POIs around an area's centroid from the Places provider into `place`. */
export async function ingestAreaPlaces(
  areaId: string,
  input: IngestPlacesInput,
): Promise<IngestResult> {
  if (!placesProvider.enabled) {
    throw new AppError('PROVIDER_FAILED', 'Places provider is not configured');
  }
  if (!(await areaIsLive(areaId))) {
    throw notFound('area');
  }
  const centroid = await areaCentroid(areaId);
  if (centroid === undefined) {
    throw notFound('area');
  }

  let candidates;
  try {
    candidates = await placesProvider.searchAround({
      lat: centroid.lat,
      lng: centroid.lng,
      radiusM: input.radiusM,
      categoryGroupCodes: input.categoryGroupCodes,
    });
  } catch (error) {
    if (error instanceof PlacesProviderError) {
      throw new AppError('PROVIDER_FAILED', error.message);
    }
    throw error;
  }

  const inserted = await insertPlaces(areaId, 'kakao', candidates);
  return { fetched: candidates.length, inserted, skipped: candidates.length - inserted };
}
