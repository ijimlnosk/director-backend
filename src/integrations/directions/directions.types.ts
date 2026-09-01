export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteRequest {
  origin: RoutePoint;
  destination: RoutePoint;
}

export interface RouteStep {
  /** Kakao turn guidance text, e.g. "좌회전". */
  instruction: string;
  /** Road the step puts the driver on, when Kakao names it. */
  roadName: string | null;
  distanceM: number;
}

export interface RouteSummary {
  distanceM: number;
  durationSec: number;
  /** Named roads the route mostly runs on, longest-covered first (max 3). */
  mainRoads: string[];
  /** The first meaningful manoeuvre after departure, when present. */
  firstStep: RouteStep | null;
}

export interface DirectionsProvider {
  readonly enabled: boolean;
  /** A driving route, or null when the provider has no usable route. */
  route(request: RouteRequest): Promise<RouteSummary | null>;
}

export class DirectionsProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DirectionsProviderError';
  }
}
