import { useEffect, useRef } from 'react';
import { Marker, type Map } from 'maplibre-gl';
import type { UserLocation } from '../services/location';

export default function LocationHeading({ map, location, heading }: { map: Map | null; location: UserLocation | null; heading: number | null }) {
  const marker = useRef<Marker | null>(null);
  useEffect(() => {
    if (!map) return;
    const element = document.createElement('div');
    element.style.cssText = 'width:80px;height:80px;pointer-events:none;display:none;';
    const cone = document.createElement('div');
    cone.style.cssText = 'position:absolute;inset:0;clip-path:polygon(50% 50%,15% 0,85% 0);background:linear-gradient(to top,rgba(104,200,255,.65),rgba(104,200,255,.08));';
    element.append(cone);
    const current = new Marker({ element, rotationAlignment: 'map', pitchAlignment: 'map' }).setLngLat([0, 0]).addTo(map);
    marker.current = current;
    return () => { current.remove(); marker.current = null; };
  }, [map]);
  useEffect(() => {
    const current = marker.current;
    if (!current) return;
    current.getElement().style.display = location && heading !== null ? 'block' : 'none';
    if (location && heading !== null) current.setLngLat(location.coordinates).setRotation(heading);
  }, [map, location, heading]);
  return null;
}
