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
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 },
    );
  });
}
