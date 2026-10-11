import { useEffect, useRef, useState } from 'react';

type CompassEvent = DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number };

/** Heading clockwise from north; relative gyroscope readings cannot identify north. */
export function compassHeading(event: CompassEvent, screenAngle = 0): number | null {
  if (typeof event.webkitCompassAccuracy === 'number' && event.webkitCompassAccuracy < 0) return null;
  const heading = typeof event.webkitCompassHeading === 'number' ? event.webkitCompassHeading
    : event.absolute && event.alpha !== null ? 360 - event.alpha : null;
  return heading !== null && Number.isFinite(heading) ? ((heading + screenAngle) % 360 + 360) % 360 : null;
}

export function useCompass() {
  const [heading, setHeading] = useState<number | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const enable = async () => {
    if (!window.isSecureContext) { setMessage('Compass needs HTTPS or localhost.'); return; }
    if (!('DeviceOrientationEvent' in window)) { setMessage('This device does not support compass orientation.'); return; }
    try {
      const api = DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: (absolute?: boolean) => Promise<string> };
      if (api.requestPermission && await api.requestPermission(true) !== 'granted') {
        if (mounted.current) setMessage('Compass permission denied. Allow motion and orientation access to try again.');
        return;
      }
      if (mounted.current) { setEnabled(true); setMessage('Waiting for compass. Hold your phone flat, with the screen facing up.'); }
    } catch {
      if (mounted.current) setMessage('Could not enable compass. Check browser sensor permissions.');
    }
  };

  useEffect(() => {
    if (!enabled) return;
    let stale: ReturnType<typeof setTimeout>;
    const onOrientation = (event: DeviceOrientationEvent) => {
      const next = compassHeading(event, window.screen.orientation?.angle ?? 0);
      if (next === null) return;
      clearTimeout(noSignal);
      setHeading(next);
      setMessage('Compass active. Hold your phone flat for the best direction estimate.');
      clearTimeout(stale);
      stale = setTimeout(() => { setHeading(null); setMessage('Compass signal unavailable. Keep your phone flat or check sensor permissions.'); }, 5000);
    };
    const noSignal = setTimeout(() => setMessage('No compass readings. This browser may not support a compass, or sensor access is blocked.'), 8000);
    const listener = onOrientation;
    // Android commonly supplies absolute events; Safari supplies webkitCompassHeading.
    window.addEventListener('deviceorientationabsolute', listener);
    window.addEventListener('deviceorientation', listener);
    return () => {
      window.removeEventListener('deviceorientationabsolute', listener);
      window.removeEventListener('deviceorientation', listener);
      clearTimeout(noSignal);
      clearTimeout(stale);
    };
  }, [enabled]);

  return { heading, enabled, message, enable, disable: () => { setEnabled(false); setHeading(null); setMessage(''); } };
}
