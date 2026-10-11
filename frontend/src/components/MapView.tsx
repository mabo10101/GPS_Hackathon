import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { AttributionControl, Map, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { createUcfRetroStyle } from '../map/ucfRetroTheme';
import 'maplibre-gl/dist/maplibre-gl.css';
import './MapView.css';

// Bundle the worker explicitly so Vite serves it in development and production.
setWorkerUrl(mapWorkerUrl);

export interface MapViewHandle {
  /** Returns the live map, or null before initialization and after cleanup. */
  getMap: () => Map | null;
}

export interface MapViewProps {
  className?: string;
  /** Called after initialization, and with null when the map is cleaned up. */
  onMapReady?: (map: Map | null) => void;
}

const UCF_CENTER: [number, number] = [-81.2001, 28.6024];
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

/** The parent must provide a height. Native mouse and touch controls are enabled. */
const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
  { className, onMapReady },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);

  useImperativeHandle(ref, () => ({ getMap: () => mapRef.current }), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = new Map({
      container,
      center: UCF_CENTER,
      zoom: 15,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new AttributionControl({ compact: true }), 'bottom-left');
    map.setStyle(MAP_STYLE, {
      transformStyle: (_previousStyle, nextStyle) => createUcfRetroStyle(nextStyle),
    });
    map.addControl(
      new NavigationControl({ showZoom: true, showCompass: true }),
      'top-right',
    );

    // Observe parent layout changes as well as browser window resizing.
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    onMapReady?.(mapRef.current);
    return () => onMapReady?.(null);
  }, [onMapReady]);

  return (
    <div
      ref={containerRef}
      className={['map-view', className].filter(Boolean).join(' ')}
      role="region"
      aria-label="Interactive map of the University of Central Florida campus"
    />
  );
});

export default MapView;
