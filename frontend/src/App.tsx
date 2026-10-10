import { useEffect, useMemo, useRef, useState } from 'react';
import type { Map } from 'maplibre-gl';
import MapView from './components/MapView';
import MapOverlays from './components/MapOverlays';
import PoiPanel from './components/PoiPanel';
import { campusPois, validatePois, type PoiCategory } from './data/pois';
import { getUserLocation, type UserLocation } from './services/location';
import { findNearestWalkingRoute, type NearestRoute } from './services/routing';

const API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY?.trim() ?? '';

export default function App() {
  const [map, setMap] = useState<Map | null>(null);
  const [category, setCategory] = useState<PoiCategory>('vending');
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [route, setRoute] = useState<NearestRoute | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const pendingRequest = useRef<AbortController | null>(null);
  const { valid, errors } = useMemo(() => validatePois(campusPois), []);
  const filteredPois = useMemo(() => valid.filter((poi) => poi.category === category), [valid, category]);

  useEffect(() => () => pendingRequest.current?.abort(), []);

  const clearRoute = () => {
    pendingRequest.current?.abort();
    pendingRequest.current = null;
    setRoute(null);
    setBusy(false);
    setStatus('');
    setError(null);
  };

  const routeNearest = async () => {
    if (!API_KEY || filteredPois.length === 0 || pendingRequest.current) return;
    const controller = new AbortController();
    pendingRequest.current = controller;
    setBusy(true);
    setError(null);
    setRoute(null);
    setStatus('Finding your location…');
    try {
      const userLocation = await getUserLocation(controller.signal);
      if (controller.signal.aborted) return;
      setLocation(userLocation);
      setStatus(`Comparing walking routes: 0 of ${filteredPois.length}…`);
      const nearest = await findNearestWalkingRoute(userLocation.coordinates, filteredPois, API_KEY, controller.signal,
        (completed, total) => {
          if (!controller.signal.aborted) setStatus(`Comparing walking routes: ${completed} of ${total}…`);
        });
      if (controller.signal.aborted) return;
      setRoute(nearest);
      setStatus('Shortest available walking route found.');
    } catch (cause) {
      if (!controller.signal.aborted) {
        setStatus('');
        setError(cause instanceof Error ? cause.message : 'Could not calculate a walking route.');
      }
    } finally {
      if (pendingRequest.current === controller) {
        pendingRequest.current = null;
        setBusy(false);
      }
    }
  };

  return (
    <main className="app" aria-label="UCF campus navigation">
      <MapView onMapReady={setMap} />
      <MapOverlays map={map} pois={filteredPois} location={location} route={route} />
      <PoiPanel
        category={category}
        onCategoryChange={(next) => { clearRoute(); setCategory(next); }}
        pois={filteredPois}
        onFocusPoi={(poi) => map?.flyTo({ center: poi.coordinates, zoom: 18 })}
        onRouteNearest={() => { void routeNearest(); }}
        onClearRoute={clearRoute}
        busy={busy}
        status={status}
        error={error}
        route={route}
        location={location}
        hasApiKey={Boolean(API_KEY)}
        invalidCount={errors.length}
      />
    </main>
  );
}
