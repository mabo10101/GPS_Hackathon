/** All coordinates use [longitude, latitude], matching MapLibre and GeoJSON. */
export type Coordinates = [number, number];

export const POI_CATEGORIES = [
  { id: 'vending', label: 'Vending machines' },
  { id: 'bus-stop', label: 'Bus stops' },
  { id: 'classroom', label: 'Classrooms' },
] as const;

export type PoiCategory = typeof POI_CATEGORIES[number]['id'];

export interface CampusPoi {
  id: string;
  name: string;
  category: PoiCategory;
  coordinates: Coordinates;
  /** For indoor POIs, route outdoors to this entrance instead. */
  entranceCoordinates?: Coordinates;
  building?: string;
  floor?: number;
  description?: string;
}

// DEMO DATA: approximate UCF-area coordinates, not verified real POIs or entrances.
// Replace these records with your surveyed campus locations before publishing.
export const campusPois: CampusPoi[] = [
  {
    id: 'demo-vending-central',
    name: 'Demo vending machine · Central',
    category: 'vending',
    coordinates: [-81.2001, 28.6024],
    description: 'Test destination near the map center. Not a verified vending machine.',
  },
  {
    id: 'demo-vending-north',
    name: 'Demo vending machine · North',
    category: 'vending',
    coordinates: [-81.2005, 28.6045],
    description: 'Test destination north of the map center. Not a verified vending machine.',
  },
  {
    id: 'demo-vending-south',
    name: 'Demo vending machine · South',
    category: 'vending',
    coordinates: [-81.2006, 28.6003],
    description: 'Test destination south of the map center. Not a verified vending machine.',
  },
  {
    id: 'demo-bus-stop-east',
    name: 'Demo bus stop · East',
    category: 'bus-stop',
    coordinates: [-81.1969, 28.6027],
    description: 'Test destination only. Not a verified bus stop.',
  },
  {
    id: 'demo-classroom-west',
    name: 'Demo classroom · West',
    category: 'classroom',
    coordinates: [-81.2032, 28.6024],
    entranceCoordinates: [-81.2030, 28.6021],
    building: 'Demo building',
    floor: 2,
    description: 'Tests an indoor POI with a separate outdoor entrance. Neither location is verified.',
  },
];

export function isValidCoordinates(value: unknown): value is Coordinates {
  return Array.isArray(value) && value.length === 2 &&
    typeof value[0] === 'number' && Number.isFinite(value[0]) && Math.abs(value[0]) <= 180 &&
    typeof value[1] === 'number' && Number.isFinite(value[1]) && Math.abs(value[1]) <= 90;
}

/** Invalid records stay off the map and out of routing requests. */
export function validatePois(pois: CampusPoi[]): { valid: CampusPoi[]; errors: string[] } {
  const ids = new Set<string>();
  const valid: CampusPoi[] = [];
  const errors: string[] = [];
  for (const poi of pois) {
    if (!poi.id?.trim() || ids.has(poi.id) || !poi.name?.trim() ||
      !POI_CATEGORIES.some((category) => category.id === poi.category) ||
      !isValidCoordinates(poi.coordinates) ||
      (poi.entranceCoordinates !== undefined && !isValidCoordinates(poi.entranceCoordinates))) {
      errors.push(`Invalid or duplicate POI: ${poi.id || '(missing id)'}`);
      continue;
    }
    ids.add(poi.id);
    valid.push(poi);
  }
  return { valid, errors };
}
