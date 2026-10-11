import type { Feature, LineString, MultiLineString } from 'geojson';
import { isValidCoordinates, type CampusPoi, type Coordinates } from '../data/pois';

export interface RouteProperties {
  distance: number;
  time: number;
}

export interface WalkingRoute {
  feature: Feature<LineString | MultiLineString, RouteProperties>;
  instructions: string[];
  steps: NavigationStep[];
}

export interface NavigationStep {
  instruction: string;
  coordinates: Coordinates | null;
}

export interface NearestRoute extends WalkingRoute {
  poi: CampusPoi;
  unreachableCount: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseWalkingRoute(data: unknown): WalkingRoute | null {
  if (!isRecord(data) || !Array.isArray(data.features)) throw new Error('Unexpected routing response.');
  if (data.features.length === 0) return null;
  const feature = data.features[0];
  if (!isRecord(feature) || !isRecord(feature.geometry) || !isRecord(feature.properties)) {
    throw new Error('Unexpected route geometry.');
  }
  const { geometry, properties } = feature;
  const lines = geometry.type === 'LineString' ? [geometry.coordinates]
    : geometry.type === 'MultiLineString' ? geometry.coordinates : null;
  if (!Array.isArray(lines) || lines.length === 0 ||
    !lines.every((line) => Array.isArray(line) && line.length >= 2 && line.every(isValidCoordinates)) ||
    typeof properties.distance !== 'number' || !Number.isFinite(properties.distance) || properties.distance < 0 ||
    typeof properties.time !== 'number' || !Number.isFinite(properties.time) || properties.time < 0) {
    throw new Error('The routing service returned an invalid route.');
  }

  const instructions: string[] = [];
  const steps: NavigationStep[] = [];
  if (Array.isArray(properties.legs)) {
    for (const [legIndex, leg] of properties.legs.entries()) {
      if (!isRecord(leg) || !Array.isArray(leg.steps)) continue;
      for (const step of leg.steps) {
        if (isRecord(step) && isRecord(step.instruction) && typeof step.instruction.text === 'string') {
          instructions.push(step.instruction.text);
          const line = lines[legIndex];
          const point = Array.isArray(line) && typeof step.from_index === 'number' && Number.isInteger(step.from_index)
            ? line[step.from_index] : null;
          steps.push({ instruction: step.instruction.text, coordinates: isValidCoordinates(point) ? point : null });
        }
      }
    }
  }
  return {
    feature: {
      type: 'Feature',
      geometry: geometry as unknown as LineString | MultiLineString,
      properties: { distance: properties.distance, time: properties.time },
    },
    instructions,
    steps,
  };
}

export async function getWalkingRoute(
  start: Coordinates,
  end: Coordinates,
  signal: AbortSignal,
): Promise<WalkingRoute | null> {
  let response: Response;
  try {
    response = await fetch('/api/routes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ start, end }), signal,
    });
  } catch (error) {
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    throw new Error('Could not reach the routing service. Check your connection and try again.', { cause: error });
  }
  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null);
    const message = isRecord(data) && typeof data.message === 'string' ? data.message : '';
    if (message) throw new Error(message);
    throw new Error(`Walking route request failed (${response.status}). Try again later.`);
  }
  return parseWalkingRoute(await response.json());
}

function pause(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('Cancelled', 'AbortError'));
    const cancel = () => {
      clearTimeout(timer);
      reject(new DOMException('Cancelled', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', cancel);
      resolve();
    }, 300);
    signal.addEventListener('abort', cancel, { once: true });
  });
}

/** Compare actual walking distances, rather than picking by straight-line distance. */
export async function findNearestWalkingRoute(
  start: Coordinates,
  pois: CampusPoi[],
  signal: AbortSignal,
  onProgress: (completed: number, total: number) => void,
): Promise<NearestRoute> {
  let best: Omit<NearestRoute, 'unreachableCount'> | null = null;
  let unreachableCount = 0;
  for (let index = 0; index < pois.length; index++) {
    await pause(signal);
    const poi = pois[index];
    const route = await getWalkingRoute(start, poi.entranceCoordinates ?? poi.coordinates, signal);
    if (!route) unreachableCount++;
    else if (!best || route.feature.properties.distance < best.feature.properties.distance) best = { ...route, poi };
    onProgress(index + 1, pois.length);
  }
  if (!best) throw new Error('No walking routes were found. Check the points and their entrance coordinates.');
  return { ...best, unreachableCount };
}
