import { POI_CATEGORIES, type CampusPoi, type PoiCategory } from '../data/pois';
import type { NearestRoute } from '../services/routing';
import type { UserLocation } from '../services/location';
import './PoiPanel.css';

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
  const destination = props.pois.find((poi) => poi.id === props.destinationId);
  const choosing = !props.route && !props.busy;
  return <section className="poi-panel" aria-label="Campus navigation">
    <p className="panel-eyebrow">{props.arrived ? 'YOU MADE IT' : props.route ? 'ON YOUR WAY' : 'EXPLORE CAMPUS'}</p>
    <h1>{props.route ? props.route.poi.name : 'Where are we going?'}</h1>
    {choosing && <>
      <label htmlFor="poi-category">What are you looking for?</label>
      <select id="poi-category" value={props.category} onChange={(event) => props.onCategoryChange(event.target.value as PoiCategory)}>
        {POI_CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
      <p className="setup-note">Find the nearest spot, or choose one below.</p>
      <ul className="poi-list" aria-label={categoryName}>
        {props.pois.map((poi) => <li key={poi.id}>
          <button onClick={() => props.onFocusPoi(poi)} aria-pressed={poi.id === props.destinationId}>
            {poi.name}{poi.id === props.destinationId && <span> · Selected</span>}
          </button>
        </li>)}
      </ul>
      {props.pois.length === 0 && <p>No destinations in this category yet.</p>}
      <button className="route-button" onClick={destination ? props.onNavigate : props.onRouteNearest} disabled={!props.hasRouting || props.pois.length === 0}>
        {destination ? 'Start walking' : 'Take me to the nearest'}
      </button>
      {destination && <button className="quiet-button" onClick={() => props.onDestinationChange('')}>Use nearest instead</button>}
    </>}
    {props.busy && <button className="secondary-button" onClick={props.onClearRoute}>Cancel</button>}
    <p className="route-status" role="status" aria-live="polite">{props.status}</p>
    {props.error && <p className="route-error" role="alert">{props.error}</p>}
    {!props.hasRouting && <p className="setup-note">Walking routes are temporarily unavailable.</p>}
    {props.route && <div className="route-result">
      <p className="route-summary">{Math.max(1, Math.ceil(props.route.feature.properties.time / 60))} min walk · {Math.round(props.route.feature.properties.distance)} m</p>
      {props.arrived && props.route.poi.indoorRoute && <button className="route-button" onClick={props.onOpenIndoor}>Continue inside</button>}
      <button className="secondary-button" onClick={props.onClearRoute}>{props.arrived ? 'Choose another destination' : 'End navigation'}</button>
      <details className="panel-details">
        <summary>Destination details</summary>
        {props.route.poi.building && <p>{props.route.poi.building}{props.route.poi.floor !== undefined ? ` · Floor ${props.route.poi.floor}` : ''}</p>}
        {props.route.poi.description && <p>{props.route.poi.description}</p>}
        {props.route.poi.entranceCoordinates && <p>The walking route ends at the building entrance. Continue inside to your destination.</p>}
        {props.route.unreachableCount > 0 && <p>{props.route.unreachableCount} destinations had no walking route.</p>}
      </details>
    </div>}
    <details className="panel-details">
      <summary>Navigation options</summary>
      <button className="secondary-button" onClick={props.onToggleCompass}>{props.compassEnabled ? 'Disable compass' : 'Show facing direction'}</button>
      {props.compassMessage && <p className="setup-note" role="status">{props.compassMessage}</p>}
      {props.compassEnabled && !props.location && <p className="setup-note">The direction cone appears when you start walking navigation.</p>}
      {props.location && <p className="setup-note">GPS accuracy: approximately {Math.round(props.location.accuracy)} m.</p>}
    </details>
    {props.invalidCount > 0 && <p className="setup-note" role="alert">Some destinations are unavailable.</p>}
  </section>;
}
