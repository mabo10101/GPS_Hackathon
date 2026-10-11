import { POI_CATEGORIES, type CampusPoi, type PoiCategory } from '../data/pois';
import type { NearestRoute } from '../services/routing';
import type { UserLocation } from '../services/location';
import './PoiPanel.css';

interface PoiPanelProps {
  category: PoiCategory;
  onCategoryChange: (category: PoiCategory) => void;
  pois: CampusPoi[];
  onFocusPoi: (poi: CampusPoi) => void;
  onRouteNearest: () => void;
  onClearRoute: () => void;
  busy: boolean;
  status: string;
  error: string | null;
  route: NearestRoute | null;
  location: UserLocation | null;
  hasApiKey: boolean;
  invalidCount: number;
  onOpenIndoor: () => void;
}

export default function PoiPanel(props: PoiPanelProps) {
  const categoryName = POI_CATEGORIES.find((item) => item.id === props.category)?.label ?? '';
  return (
    <section className="poi-panel" aria-label="Campus points of interest">
      <h1>Campus spots</h1>
      <button className="secondary-button indoor-entry" onClick={props.onOpenIndoor}>Find a room inside</button>
      <label htmlFor="poi-category">Category</label>
      <select id="poi-category" value={props.category} onChange={(event) => props.onCategoryChange(event.target.value as PoiCategory)}>
        {POI_CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
      <p className="poi-count">{props.pois.length} {categoryName.toLowerCase()} highlighted</p>
      {props.pois.length === 0 && <p>No points in this category yet. Add your campus locations to get started.</p>}
      <button className="route-button" onClick={props.onRouteNearest} disabled={props.busy || props.pois.length === 0 || !props.hasApiKey}>
        {props.busy ? 'Finding route…' : 'Route to nearest'}
      </button>
      {(props.busy || props.route) && <button className="secondary-button" onClick={props.onClearRoute}>{props.busy ? 'Cancel' : 'Clear route'}</button>}
      {!props.hasApiKey && <p className="setup-note">Walking routes are not configured yet.</p>}
      {props.invalidCount > 0 && <p role="alert">{props.invalidCount} invalid POI records were excluded. Check your data.</p>}
      <p className="route-status" role="status" aria-live="polite">{props.status}</p>
      {props.error && <p className="route-error" role="alert">{props.error}</p>}
      {props.route && <div className="route-result">
        <h2>{props.route.poi.name}</h2>
        <p>{Math.round(props.route.feature.properties.distance)} m · {Math.max(1, Math.ceil(props.route.feature.properties.time / 60))} min walk</p>
        {props.route.poi.building && <p>{props.route.poi.building}{props.route.poi.floor !== undefined ? ` · Floor ${props.route.poi.floor}` : ''}</p>}
        {props.route.poi.description && <p>{props.route.poi.description}</p>}
        {props.route.poi.entranceCoordinates && <p>Outdoor route to the building entrance. Continue inside to the destination.</p>}
        {props.route.poi.indoorRoute && <button className="route-button" onClick={props.onOpenIndoor}>Continue inside</button>}
        {props.location && <p className="setup-note">Location accuracy: approximately {Math.round(props.location.accuracy)} m.</p>}
        {props.route.unreachableCount > 0 && <p>{props.route.unreachableCount} points had no walking route. Showing the nearest reachable result.</p>}
        {props.route.instructions.length > 0 && <details>
          <summary>Walking directions</summary>
          <ol>{props.route.instructions.map((instruction, index) => <li key={index}>{instruction}</li>)}</ol>
        </details>}
      </div>}
      {props.pois.length > 0 && <ul className="poi-list" aria-label={categoryName}>
        {props.pois.map((poi) => <li key={poi.id}>
          <button onClick={() => props.onFocusPoi(poi)} aria-label={`Show ${poi.name} on map`}>
            {poi.name}{poi.id === props.route?.poi.id && <span> · Nearest</span>}
          </button>
        </li>)}
      </ul>}
    </section>
  );
}
