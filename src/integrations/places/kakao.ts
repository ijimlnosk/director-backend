import {
  KAKAO_CATEGORY_GROUPS,
  PlacesProviderError,
  type PlaceCandidate,
  type PlacesProvider,
  type PlacesSearchArgs,
} from './places.types.js';

const ENDPOINT = 'https://dapi.kakao.com/v2/local/search/category.json';
const PAGE_SIZE = 15;
const MAX_PAGES = 3;
const KAKAO_MAX_RADIUS_M = 20_000;

interface KakaoDoc {
  id?: string;
  place_name?: string;
  category_group_code?: string;
  category_group_name?: string;
  category_name?: string;
  x?: string;
  y?: string;
  road_address_name?: string;
  address_name?: string;
}

interface KakaoResponse {
  documents?: KakaoDoc[];
  meta?: { is_end?: boolean };
}

/** Map one Kakao document to a PlaceCandidate, or null if it is unusable. */
export function mapKakaoDoc(doc: KakaoDoc): PlaceCandidate | null {
  const lat = Number(doc.y);
  const lng = Number(doc.x);
  if (
    doc.id === undefined ||
    doc.place_name === undefined ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return null;
  }
  const category =
    (doc.category_group_code !== undefined
      ? KAKAO_CATEGORY_GROUPS[doc.category_group_code]
      : undefined) ??
    doc.category_group_name ??
    doc.category_name?.split('>').pop()?.trim() ??
    'etc';
  return {
    providerPlaceId: doc.id,
    name: doc.place_name,
    category,
    lat,
    lng,
    address: doc.road_address_name || doc.address_name || null,
  };
}

export function createKakaoPlacesProvider(opts: {
  apiKey: string;
  timeoutMs: number;
}): PlacesProvider {
  async function fetchPage(
    code: string,
    args: PlacesSearchArgs,
    page: number,
  ): Promise<KakaoResponse> {
    const url =
      `${ENDPOINT}?category_group_code=${code}` +
      `&x=${args.lng}&y=${args.lat}` +
      `&radius=${Math.min(args.radiusM, KAKAO_MAX_RADIUS_M)}` +
      `&size=${PAGE_SIZE}&page=${page}&sort=distance`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Authorization: `KakaoAK ${opts.apiKey}` },
        signal: AbortSignal.timeout(opts.timeoutMs),
      });
    } catch (error) {
      throw new PlacesProviderError(
        `Kakao request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 200);
      throw new PlacesProviderError(`Kakao responded ${response.status}: ${detail}`);
    }
    return (await response.json()) as KakaoResponse;
  }

  return {
    enabled: true,
    async searchAround(args: PlacesSearchArgs): Promise<PlaceCandidate[]> {
      const byId = new Map<string, PlaceCandidate>();
      for (const code of args.categoryGroupCodes) {
        for (let page = 1; page <= MAX_PAGES; page += 1) {
          const body = await fetchPage(code, args, page);
          for (const doc of body.documents ?? []) {
            const mapped = mapKakaoDoc(doc);
            if (mapped !== null) byId.set(mapped.providerPlaceId, mapped);
          }
          if (body.meta?.is_end !== false) break;
        }
      }
      return [...byId.values()];
    },
  };
}
