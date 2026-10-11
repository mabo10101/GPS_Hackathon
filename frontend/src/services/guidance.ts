import type { NavigationStep } from './routing';
import { distanceMeters, type UserLocation } from './location';

/** Advance only to the next maneuver, and only with a reasonably accurate fix. */
export function advanceGuidance(steps: NavigationStep[], index: number, location: UserLocation): number {
  const next = steps[index + 1];
  if (!next?.coordinates || location.accuracy > 25) return index;
  return distanceMeters(location.coordinates, next.coordinates) <= 20 ? index + 1 : index;
}
