import type { Coordinates } from '../data/pois';

export interface UserLocation {
  coordinates: Coordinates;
  accuracy: number;
}

export function getUserLocation(signal: AbortSignal): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('Cancelled', 'AbortError'));
    if (!window.isSecureContext) return reject(new Error('Location needs HTTPS or localhost.'));
    if (!navigator.geolocation) return reject(new Error('This browser does not support location.'));

    const cancel = () => reject(new DOMException('Cancelled', 'AbortError'));
    signal.addEventListener('abort', cancel, { once: true });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        signal.removeEventListener('abort', cancel);
        if (signal.aborted) return;
        resolve({
          coordinates: [position.coords.longitude, position.coords.latitude],
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        signal.removeEventListener('abort', cancel);
        if (signal.aborted) return;
        const messages: Record<number, string> = {
          1: 'Location permission was denied. Allow location for this site and try again.',
          2: 'Your location is unavailable. Check device location settings and try again.',
          3: 'Finding your location timed out. Try again outdoors or near a window.',
        };
        reject(new Error(messages[error.code] ?? 'Could not find your location.'));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}

/** Stop tracking by aborting the navigation session. */
export function watchUserLocation(signal: AbortSignal, onLocation: (location: UserLocation) => void, onError: (message: string) => void): void {
  if (signal.aborted) return;
  const id = navigator.geolocation.watchPosition((position) => {
    if (!signal.aborted) onLocation({
      coordinates: [position.coords.longitude, position.coords.latitude],
      accuracy: position.coords.accuracy,
    });
  }, (error) => {
    if (!signal.aborted) onError(error.code === 1
      ? 'Location permission was denied. Allow location and restart navigation.'
      : 'GPS signal unavailable. Waiting for your location…');
  }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  signal.addEventListener('abort', () => navigator.geolocation.clearWatch(id), { once: true });
}

export function distanceMeters(a: Coordinates, b: Coordinates): number {
  const radians = Math.PI / 180;
  const lat = (b[1] - a[1]) * radians;
  const lng = (b[0] - a[0]) * radians;
  const h = Math.sin(lat / 2) ** 2 + Math.cos(a[1] * radians) * Math.cos(b[1] * radians) * Math.sin(lng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
