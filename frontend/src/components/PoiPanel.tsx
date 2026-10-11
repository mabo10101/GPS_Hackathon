import { POI_CATEGORIES, type CampusPoi, type PoiCategory } from '../data/pois';
import type { NearestRoute } from '../services/routing';
import type { UserLocation } from '../services/location';
import './PoiPanel.css';
import SpriteGuide from './SpriteGuide';

interface PoiPanelProps {
  compassEnabled: boolean;
  compassMessage: string;
  onToggleCompass: () => void;
  category: PoiCategory;
  destinationId: string;
  onDestinationChange: (id: string) => void;
  onNavigate: () => void;
  navigating: boolean;
  arrived: boolean;
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
  hasRouting: boolean;
  invalidCount: number;
  onOpenIndoor: () => void;
}

export default function PoiPanel(props: PoiPanelProps) {
  const categoryName = POI_CATEGORIES.find((item) => item.id === props.category)?.label ?? '';
  const hasDestination = props.pois.some((poi) => poi.id === props.destinationId);
  return (
    <section className="poi-panel" aria-label="Campus points of interest">
      <h1>Campus spots</h1>
      <button className="secondary-button indoor-entry" onClick={props.onOpenIndoor}>Find a room inside</button>
      <button className="secondary-button" onClick={props.onToggleCompass}>{props.compassEnabled ? 'Disable compass' : 'Enable compass'}</button>
      {props.compassMessage && <p className="setup-note" role="status">{props.compassMessage}</p>}
      {props.compassEnabled && !props.location && <p className="setup-note">Start GPS navigation to show the direction cone at your location.</p>}
      <label htmlFor="poi-category">Category</label>
      <select id="poi-category" value={props.category} onChange={(event) => props.onCategoryChange(event.target.value as PoiCategory)}>
        {POI_CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
      <p className="poi-count">{props.pois.length} {categoryName.toLowerCase()} highlighted</p>
      <label htmlFor="destination">Destination</label>
      <select id="destination" value={props.pois.some((poi) => poi.id === props.destinationId) ? props.destinationId : ''} onChange={(event) => props.onDestinationChange(event.target.value)}>
        <option value="">Choose a destination</option>
        {props.pois.map((poi) => <option key={poi.id} value={poi.id}>{poi.name}</option>)}
      </select>
      <button className="route-button" onClick={props.onNavigate} aria-describedby={!hasDestination ? 'destination-hint' : undefined} disabled={props.busy || !hasDestination || !props.hasRouting}>Navigate with GPS</button>
      {!hasDestination && props.pois.length > 0 && <p id="destination-hint" className="setup-note">Choose a destination above or click a place in the list to enable GPS navigation.</p>}
      {props.pois.length === 0 && <p>No points in this category yet. Add your campus locations to get started.</p>}
      <button className="route-button" onClick={props.onRouteNearest} disabled={props.busy || props.pois.length === 0 || !props.hasRouting}>
        {props.busy ? 'Finding route…' : 'Route to nearest'}
      </button>
      {(props.busy || props.route) && <button className="secondary-button" onClick={props.onClearRoute}>{props.busy ? 'Cancel' : props.navigating ? 'Stop navigation' : 'Clear route'}</button>}
      {!props.hasRouting && <p className="setup-note">Walking routes unavailable. Start the backend and configure its Geoapify key.</p>}
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
        <SpriteGuide route={props.route} location={props.location} navigating={props.navigating} arrived={props.arrived} />
      </div>}
      {props.pois.length > 0 && <ul className="poi-list" aria-label={categoryName}>
        {props.pois.map((poi) => <li key={poi.id}>
          <button onClick={() => props.onFocusPoi(poi)} aria-pressed={poi.id === props.destinationId} aria-label={`Select ${poi.name} and show on map`}>
            {poi.name}{poi.id === props.destinationId && <span> · Selected</span>}
          </button>
        </li>)}
      </ul>}
    </section>
  );
}
