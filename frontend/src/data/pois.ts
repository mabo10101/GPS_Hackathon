/** All coordinates use [longitude, latitude], matching MapLibre and GeoJSON. */
export type Coordinates = [number, number];

export const POI_CATEGORIES = [
  { id: 'vending', label: 'Vending machines' },
  { id: 'bus-stop', label: 'Bus stops' },
  { id: 'classroom', label: 'Classrooms' },
  { id: 'printer', label: 'Printers' },
  { id: 'library', label: 'Libraries' },
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
  /** True when the indoor photo walkthrough covers the route from this POI's entrance. */
  indoorRoute?: boolean;
}

// DEMO DATA: approximate UCF-area coordinates, not verified real POIs or entrances.
// Replace these records with your surveyed campus locations before publishing.
export const campusPois: CampusPoi[] = [
  {
    id: 'demo-printer-central',
    name: 'Demo printer · Central',
    category: 'printer',
    coordinates: [-81.2008, 28.6018],
    description: 'Unverified test printer location near the campus center.',
  },
  {
    id: 'demo-printer-east',
    name: 'Demo printer · East',
    category: 'printer',
    coordinates: [-81.1978, 28.6021],
    description: 'Unverified test printer location east of the campus center.',
  },
  {
    id: 'demo-printer-north',
    name: 'Demo printer · North',
    category: 'printer',
    coordinates: [-81.2012, 28.6040],
    description: 'Unverified test printer location north of the campus center.',
  },
  {
    id: 'demo-library-south',
    name: 'Demo library · South',
    category: 'library',
    coordinates: [-81.2010, 28.6008],
    description: 'Unverified test library location. Not an actual campus library listing.',
  },
  {
    id: 'demo-library-west',
    name: 'Demo library · West',
    category: 'library',
    coordinates: [-81.2035, 28.6028],
    description: 'Unverified test library location west of the campus center.',
  },
  {
    id: 'demo-library-northeast',
    name: 'Demo library · Northeast',
    category: 'library',
    coordinates: [-81.1985, 28.6040],
    description: 'Unverified test library location northeast of the campus center.',
  },
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
  {
    id: 'eng-118',
    name: 'ENG 118',
    category: 'classroom',
    // APPROXIMATE: verify Engineering 1 and its Business Entrance coordinates on site.
    coordinates: [-81.1985, 28.6015],
    entranceCoordinates: [-81.1981, 28.6015],
    building: 'Engineering 1',
    floor: 1,
    description: 'Enter through the Business Entrance. Lenny guides you inside.',
    indoorRoute: true,
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
