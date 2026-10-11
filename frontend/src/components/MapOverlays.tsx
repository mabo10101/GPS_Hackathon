import { useEffect, useRef } from 'react';
import { AttributionControl, LngLatBounds, Marker, type Map, type GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import type { CampusPoi } from '../data/pois';
import type { UserLocation } from '../services/location';
import type { NearestRoute } from '../services/routing';
import bishopPin from '../assets/W_Bishop.png';
import './MapOverlays.css';

interface MapOverlaysProps {
  map: Map | null;
  pois: CampusPoi[];
  location: UserLocation | null;
  route: NearestRoute | null;
}

const SOURCE_ROUTE = 'campus-walking-route';
const SOURCE_LOCATION = 'campus-user-location';
const LAYERS = ['campus-route-outline', 'campus-route-line', 'campus-location-point', 'campus-route-glow'];

export default function MapOverlays({ map, pois, location, route }: MapOverlaysProps) {
  const fittedDestination = useRef<string | null>(null);
  useEffect(() => {
    if (!map) return;
    const markers = pois.map((poi) => {
      const element = document.createElement('div');
      const destination = poi.id === route?.poi.id;
      element.className = `campus-poi-pin${destination ? ' campus-poi-pin-destination' : ''}`;
      element.title = `${poi.name}${destination ? ' · Destination' : ''}`;
      const icon = document.createElement('img');
      icon.src = bishopPin;
      icon.alt = element.title;
      icon.draggable = false;
      element.append(icon);
      return new Marker({ element, anchor: 'bottom' }).setLngLat(poi.coordinates).addTo(map);
    });
    return () => { for (const marker of markers) marker.remove(); };
  }, [map, pois, route?.poi.id]);
  useEffect(() => {
    if (!map) return;
    const locationData: FeatureCollection<Point> = {
      type: 'FeatureCollection',
      features: location ? [{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: location.coordinates },
        properties: {},
      }] : [],
    };

    let synced = false;
    const sync = () => {
      if (synced) return;
      synced = true;
      if (!map.getSource(SOURCE_LOCATION)) map.addSource(SOURCE_LOCATION, { type: 'geojson', data: locationData });
      else (map.getSource(SOURCE_LOCATION) as GeoJSONSource).setData(locationData);
      if (route && !map.getSource(SOURCE_ROUTE)) {
        map.addSource(SOURCE_ROUTE, { type: 'geojson', data: route.feature });
        map.addLayer({
          id: LAYERS[3], type: 'line', source: SOURCE_ROUTE,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#ffc904', 'line-width': 18, 'line-blur': 7, 'line-opacity': 0.35 },
        });
        map.addLayer({
          id: LAYERS[0], type: 'line', source: SOURCE_ROUTE,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#111111', 'line-width': 9 },
        });
        map.addLayer({
          id: LAYERS[1], type: 'line', source: SOURCE_ROUTE,
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#ffc904', 'line-width': 5 },
        });
      }
      if (!map.getLayer(LAYERS[2])) map.addLayer({
        id: LAYERS[2], type: 'circle', source: SOURCE_LOCATION,
        paint: { 'circle-radius': 7, 'circle-color': '#68c8ff', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 },
      });
    };

    const onStyleLoad = () => { synced = false; sync(); };
    map.on('style.load', onStyleLoad);
    // A source may still be loading after a category change. Wait for idle
    // too, since that does not cause another style.load event.
    map.once('idle', sync);
    if (map.isStyleLoaded()) sync();
    const attribution = route ? new AttributionControl({
      compact: true,
      customAttribution: 'Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Geoapify</a>',
    }) : null;
    if (attribution) map.addControl(attribution, 'bottom-left');

    return () => {
      map.off('style.load', onStyleLoad);
      map.off('idle', sync);
      // MapView may have already removed the map during React cleanup.
      if (!map.getStyle()) return;
      if (attribution && map.hasControl(attribution)) map.removeControl(attribution);
      for (const id of [...LAYERS].reverse()) if (map.getLayer(id)) map.removeLayer(id);
      for (const id of [SOURCE_ROUTE, SOURCE_LOCATION]) if (map.getSource(id)) map.removeSource(id);
    };
  }, [map, location, route]);

  useEffect(() => {
    if (!route) { fittedDestination.current = null; return; }
    if (!map || fittedDestination.current === route.poi.id) return;
    fittedDestination.current = route.poi.id;
    const geometry = route.feature.geometry;
    const points = geometry.type === 'LineString' ? geometry.coordinates : geometry.coordinates.flat();
    const bounds = new LngLatBounds();
    for (const point of points) bounds.extend([point[0], point[1]]);
    bounds.extend(route.poi.coordinates);
    const { clientWidth: width, clientHeight: height } = map.getContainer();
    const mobile = width < 640;
    map.fitBounds(bounds, {
      padding: {
        top: 50, right: 50,
        bottom: mobile ? Math.min(height * 0.5, 340) : 50,
        left: mobile ? 40 : Math.min(360, width * 0.45),
      },
      maxZoom: 18,
      duration: 700,
    });
  }, [map, route]);

  return null;
}
