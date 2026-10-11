import { useEffect, useRef } from 'react';
import { AttributionControl, LngLatBounds, type Map, type GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection, Point } from 'geojson';
import type { CampusPoi } from '../data/pois';
import type { UserLocation } from '../services/location';
import type { NearestRoute } from '../services/routing';

interface MapOverlaysProps {
  map: Map | null;
  pois: CampusPoi[];
  location: UserLocation | null;
  route: NearestRoute | null;
}

const SOURCE_POIS = 'campus-custom-pois';
const SOURCE_ROUTE = 'campus-walking-route';
const SOURCE_LOCATION = 'campus-user-location';
const LAYERS = ['campus-route-outline', 'campus-route-line', 'campus-poi-points', 'campus-location-point'];

export default function MapOverlays({ map, pois, location, route }: MapOverlaysProps) {
  const fittedDestination = useRef<string | null>(null);
  useEffect(() => {
    if (!map) return;
    const poiData: FeatureCollection<Point> = {
      type: 'FeatureCollection',
      features: pois.map((poi) => ({
        type: 'Feature',
        id: poi.id,
        geometry: { type: 'Point', coordinates: poi.coordinates },
        properties: { id: poi.id, name: poi.name, nearest: poi.id === route?.poi.id },
      })),
    };
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
      if (!map.getSource(SOURCE_POIS)) map.addSource(SOURCE_POIS, { type: 'geojson', data: poiData });
      else (map.getSource(SOURCE_POIS) as GeoJSONSource).setData(poiData);
      if (!map.getSource(SOURCE_LOCATION)) map.addSource(SOURCE_LOCATION, { type: 'geojson', data: locationData });
      else (map.getSource(SOURCE_LOCATION) as GeoJSONSource).setData(locationData);
      if (route && !map.getSource(SOURCE_ROUTE)) {
        map.addSource(SOURCE_ROUTE, { type: 'geojson', data: route.feature });
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
      if (!map.getLayer(LAYERS[2])) map.addLayer({ // POI highlight
        id: LAYERS[2], type: 'circle', source: SOURCE_POIS,
        paint: {
          'circle-radius': ['case', ['get', 'nearest'], 11, 7],
          'circle-color': '#ffffff',
          'circle-stroke-color': ['case', ['get', 'nearest'], '#ffffff', '#111111'],
          'circle-stroke-width': 3,
        },
      });
      if (!map.getLayer(LAYERS[3])) map.addLayer({
        id: LAYERS[3], type: 'circle', source: SOURCE_LOCATION,
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
    if (attribution) map.addControl(attribution, 'bottom-right');

    return () => {
      map.off('style.load', onStyleLoad);
      map.off('idle', sync);
      // MapView may have already removed the map during React cleanup.
      if (!map.getStyle()) return;
      if (attribution && map.hasControl(attribution)) map.removeControl(attribution);
      for (const id of [...LAYERS].reverse()) if (map.getLayer(id)) map.removeLayer(id);
      for (const id of [SOURCE_POIS, SOURCE_ROUTE, SOURCE_LOCATION]) if (map.getSource(id)) map.removeSource(id);
    };
  }, [map, pois, location, route]);

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
