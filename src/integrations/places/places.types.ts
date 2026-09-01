export interface PlaceCandidate {
  providerPlaceId: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  address: string | null;
}

export interface PlacesSearchArgs {
  lat: number;
  lng: number;
  radiusM: number;
  categoryGroupCodes: string[];
}

export interface PlacesProvider {
  readonly enabled: boolean;
  searchAround(args: PlacesSearchArgs): Promise<PlaceCandidate[]>;
}

export class PlacesProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlacesProviderError';
  }
}

/** Kakao category_group_code -> label. Also the default ingest set. */
export const KAKAO_CATEGORY_GROUPS: Record<string, string> = {
  FD6: '음식점',
  CE7: '카페',
  CT1: '문화시설',
  AT4: '관광명소',
  CS2: '편의점',
  MT1: '대형마트',
};

export const DEFAULT_CATEGORY_GROUPS = ['FD6', 'CE7', 'CT1', 'AT4'];
