export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_M = 6_371_008.8;
const toRad = (deg: number): number => (deg * Math.PI) / 180;

/** Great-circle distance between two WGS84 points, in metres. */
export function haversineM(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Human-readable distance: metres (rounded to 10 m) below 1 km, else km. */
export function formatDistance(distanceM: number): string {
  if (distanceM < 1000) return `${Math.round(distanceM / 10) * 10}m`;
  return `${(distanceM / 1000).toFixed(1)}km`;
}

/** Initial bearing from `a` to `b`, degrees clockwise from north (0-360). */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

const COMPASS_8 = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'] as const;

/** Korean 8-point compass label for a bearing in degrees. */
export function compass8(bearing: number): string {
  return COMPASS_8[Math.round((((bearing % 360) + 360) % 360) / 45) % 8]!;
}

/** "북동쪽으로 약 470m" style phrase from one point to another. */
export function directionPhrase(from: LatLng, to: LatLng): string {
  return `${compass8(bearingDeg(from, to))}쪽으로 약 ${formatDistance(haversineM(from, to))}`;
}
