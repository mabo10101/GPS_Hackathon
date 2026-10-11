import { useEffect, useMemo, useRef, useState } from 'react';
import type { Map } from 'maplibre-gl';
import MapView from './components/MapView';
import MapOverlays from './components/MapOverlays';
import PoiPanel from './components/PoiPanel';
import LocationHeading from './components/LocationHeading';
import IndoorApp from './indoor/IndoorApp';
import { useCompass } from './services/compass';
import { campusPois, validatePois, type CampusPoi, type PoiCategory } from './data/pois';
import { distanceMeters, getUserLocation, watchUserLocation, type UserLocation } from './services/location';
import { getWalkingRoute, findNearestWalkingRoute, type NearestRoute } from './services/routing';

const API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY?.trim() ?? '';

export default function App() {
  const compass = useCompass();
  const [map, setMap] = useState<Map | null>(null);
  const [category, setCategory] = useState<PoiCategory>('vending');
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [route, setRoute] = useState<NearestRoute | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [destinationId, setDestinationId] = useState('');
  const [navigating, setNavigating] = useState(false);
  const [indoorOpen, setIndoorOpen] = useState(false);
  const navigation = useRef<AbortController | null>(null);
  const pendingRequest = useRef<AbortController | null>(null);
  const { valid, errors } = useMemo(() => validatePois(campusPois), []);
  const filteredPois = useMemo(() => valid.filter((poi) => poi.category === category), [valid, category]);

  useEffect(() => () => { pendingRequest.current?.abort(); navigation.current?.abort(); }, []);

  const clearRoute = () => {
    navigation.current?.abort();
    navigation.current = null;
    setNavigating(false);
    pendingRequest.current?.abort();
    pendingRequest.current = null;
    setRoute(null);
    setBusy(false);
    setStatus('');
    setError(null);
  };

  const startTracking = (initial: UserLocation, destination: CampusPoi) => {
    const session = new AbortController();
    navigation.current = session;
    setNavigating(true);
    let origin = initial.coordinates;
    let lastRequest = Date.now();
    let updating = false;
    watchUserLocation(session.signal, (current) => {
      setLocation(current);
      setError(null);
      const end = destination.entranceCoordinates ?? destination.coordinates;
      if (current.accuracy <= 25 && distanceMeters(current.coordinates, end) <= 15) {
        session.abort();
        setNavigating(false);
        setStatus(destination.entranceCoordinates ? 'You have reached the entrance. Continue inside to your destination.' : 'You have reached your destination.');
        return;
      }
      if (updating || Date.now() - lastRequest < 10000 ||
        distanceMeters(origin, current.coordinates) < Math.max(15, current.accuracy)) return;
      updating = true;
      lastRequest = Date.now();
      setStatus('Updating your walking route…');
      void getWalkingRoute(current.coordinates, end, API_KEY, session.signal).then((updated) => {
        if (session.signal.aborted) return;
        if (!updated) throw new Error('No walking route from your current location.');
        origin = current.coordinates;
        setRoute({ ...updated, poi: destination, unreachableCount: 0 });
        setStatus('GPS navigation active. Route updates as you move.');
      }).catch((cause) => {
        if (!session.signal.aborted) { setError(cause instanceof Error ? cause.message : 'Route update failed.'); setStatus('GPS tracking active. Route update will retry as you move.'); }
      }).finally(() => { updating = false; });
    }, (message) => { setError(message); });
  };

  const routeNearest = async (destination?: CampusPoi) => {
    if (!API_KEY || filteredPois.length === 0 || pendingRequest.current) return;
    clearRoute();
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
      const selected = destination ? await getWalkingRoute(userLocation.coordinates, destination.entranceCoordinates ?? destination.coordinates, API_KEY, controller.signal) : null;
      if (destination && !selected) throw new Error('No walking route found to this destination.');
      const nearest: NearestRoute = destination && selected ? { ...selected, poi: destination, unreachableCount: 0 } : await findNearestWalkingRoute(userLocation.coordinates, filteredPois, API_KEY, controller.signal,
        (completed, total) => {
          if (!controller.signal.aborted) setStatus(`Comparing walking routes: ${completed} of ${total}…`);
        });
      if (controller.signal.aborted) return;
      setRoute(nearest);
      setDestinationId(nearest.poi.id);
      setStatus('GPS navigation active. Route updates as you move.');
      startTracking(userLocation, nearest.poi);
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
      <LocationHeading map={map} location={location} heading={compass.heading} />
      <PoiPanel
        compassEnabled={compass.enabled}
        compassMessage={compass.message}
        onToggleCompass={() => { if (compass.enabled) compass.disable(); else void compass.enable(); }}
        category={category}
        onCategoryChange={(next) => { clearRoute(); setDestinationId(''); setCategory(next); }}
        destinationId={destinationId}
        onDestinationChange={(id) => { clearRoute(); setDestinationId(id); }}
        onNavigate={() => { const destination = valid.find((poi) => poi.id === destinationId); if (destination) void routeNearest(destination); }}
        navigating={navigating}
        pois={filteredPois}
        onFocusPoi={(poi) => {
          if (poi.id !== destinationId) { clearRoute(); setDestinationId(poi.id); }
          map?.flyTo({ center: poi.coordinates, zoom: 18 });
        }}
        onRouteNearest={() => { void routeNearest(); }}
        onClearRoute={clearRoute}
        busy={busy}
        status={status}
        error={error}
        route={route}
        location={location}
        hasApiKey={Boolean(API_KEY)}
        invalidCount={errors.length}
        onOpenIndoor={() => setIndoorOpen(true)}
      />
      {indoorOpen && <IndoorApp onClose={() => setIndoorOpen(false)} />}
    </main>
  );
}
