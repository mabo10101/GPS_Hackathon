import step01 from '../assets/indoor/step01.jpg';
import step02 from '../assets/indoor/step02.jpg';
import step03 from '../assets/indoor/step03.jpg';
import step04 from '../assets/indoor/step04.jpg';
import step05 from '../assets/indoor/step05.jpg';
import step06 from '../assets/indoor/step06.jpg';
import step07 from '../assets/indoor/step07.jpg';
import step08 from '../assets/indoor/step08.jpg';
import step09 from '../assets/indoor/step09.jpg';
import step10 from '../assets/indoor/step10.jpg';
import step11 from '../assets/indoor/step11.jpg';
import step12 from '../assets/indoor/step12.jpg';
import lennySprite from '../assets/indoor/lenny.png';
import knightroSprite from '../assets/indoor/knightro.png';
import citronautSprite from '../assets/indoor/citronaut.png';
import forestBackground from '../assets/indoor/forest.jpg';
import canopyLayer from '../assets/indoor/canopy.webp';

/** Position of a landmark in its photo, as percentages of width and height. */
export interface LandmarkHighlight {
  x: number;
  y: number;
}

export interface RouteStep {
  id: number;
  photo: string;
  direction: string;
  lore?: string;
  landmark?: LandmarkHighlight;
}

// Golden path: Engineering 1 Business Entrance -> ENG 118.
// Photos and directions follow data/building.py; step N uses photo N.
export const ROUTE_STEPS: RouteStep[] = [
  {
    id: 1,
    photo: step01,
    direction: 'Welcome to the keep, adventurer! Turn left around the corner.',
    lore: 'Long ago, this realm was called Florida Technological University. It became UCF in 1978.',
  },
  {
    id: 2,
    photo: step02,
    direction: 'Now turn right, brave one, and enter the hallway.',
    lore: 'UCF first opened its gates in 1968. Lenny was but a tiny egg back then.',
  },
  {
    id: 3,
    photo: step03,
    direction: 'Onward! Head straight down the great hall.',
    lore: 'A shrine of snacks guards this hall. Pay your respects on the way back.',
  },
  {
    id: 4,
    photo: step04,
    direction: 'Steady now. Keep marching straight ahead.',
  },
  {
    id: 5,
    photo: step05,
    direction: 'A crossroads! Turn right at the intersection.',
    lore: 'Legend says the shrine of snacks restocks itself. I have never seen it happen. Mysterious.',
  },
  {
    id: 6,
    photo: step06,
    direction: 'Pass the great Engineering gate on your right. Keep going straight.',
  },
  {
    id: 7,
    photo: step07,
    direction: 'The ancient staircase appears on your right. Stay the course, straight on!',
  },
  {
    id: 8,
    photo: step08,
    direction: 'Behold, the hall of Academic Affairs! Turn left into the hallway.',
  },
  {
    id: 9,
    photo: step09,
    direction: 'The final hallway! Continue straight, adventurer.',
  },
  {
    id: 10,
    photo: step10,
    direction: 'Keep walking straight. Your destination draws near.',
  },
  {
    id: 11,
    photo: step11,
    direction: 'Straight ahead to ENG 118. I can smell it!',
  },
];

export const ARRIVAL_PHOTO = step12;
export const FOREST_BACKGROUND = forestBackground;
export const CANOPY_LAYER = canopyLayer;

export const DESTINATION = {
  code: 'ENG 118',
  building: 'Engineering 1',
  floor: 1,
};

export interface Entrance {
  id: string;
  label: string;
  shortLabel: string;
  photo?: string;
  mapped: boolean;
}

// Only the Business Entrance has a route. Other labels are placeholders.
export const ENTRANCES: Entrance[] = [
  { id: 'business', label: 'Business Entrance', shortLabel: 'Business', photo: step01, mapped: true },
  { id: 'main', label: 'Main Entrance', shortLabel: 'Main', photo: step06, mapped: false },
  { id: 'courtyard', label: 'Courtyard Doors', shortLabel: 'Courtyard', mapped: false },
  { id: 'garage', label: 'Garage Side', shortLabel: 'Garage', mapped: false },
];

export type GuideId = 'lenny' | 'knightro' | 'citronaut';

export interface Guide {
  id: GuideId;
  name: string;
  sprite: string;
  available: boolean;
}

export const GUIDES: Guide[] = [
  { id: 'knightro', name: 'Knightro', sprite: knightroSprite, available: false },
  { id: 'lenny', name: 'Lenny', sprite: lennySprite, available: true },
  { id: 'citronaut', name: 'Citronaut', sprite: citronautSprite, available: false },
];

export const LENNY_LINES = {
  tagline: 'A small dragon with a big sense of direction.',
  chosen: "Ah, you've chosen wisely, oh great adventurer! Lenny shall see you through!",
  comingSoon: 'is still training for this quest. Lenny will guide you for now!',
  entrance: 'Through which gate did you enter this mighty keep?',
  unmappedEntrance: 'Alas! Only the Business Entrance is on my map so far. Shall we start from there?',
  arrival: "HUZZAH! You've reached ENG 118! Your quest is complete, oh great adventurer.",
  arrivalLore: 'Check the sign by the door. If it says 118, the quest is truly won.',
  notFound: "Hmm, that chamber isn't on my map. Try another, brave one?",
  notMappedYet: "isn't on my map yet, brave one. Only ENG 118 for now!",
  newQuest: 'A new quest? Lenny is always ready.',
};

export interface CampusPlace {
  code: string;
  name: string;
  mapped: boolean;
}

// Search suggestions. Only ENG 118 has an indoor route; the rest are real UCF buildings shown as "Soon".
export const CAMPUS_PLACES: CampusPlace[] = [
  { code: DESTINATION.code, name: `${DESTINATION.building} · Floor ${DESTINATION.floor}`, mapped: true },
  { code: 'ENG 2', name: 'Engineering II', mapped: false },
  { code: 'HEC', name: 'Harris Corporation Engineering Center', mapped: false },
  { code: 'MSB', name: 'Mathematical Sciences Building', mapped: false },
  { code: 'CB1', name: 'Classroom Building I', mapped: false },
  { code: 'CB2', name: 'Classroom Building II', mapped: false },
  { code: 'BA1', name: 'Business Administration I', mapped: false },
  { code: 'PSY', name: 'Psychology Building', mapped: false },
  { code: 'VAB', name: 'Visual Arts Building', mapped: false },
  { code: 'LIB', name: 'John C. Hitt Library', mapped: false },
  { code: 'SU', name: 'Student Union', mapped: false },
];

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Suggestions whose code or name contains the query, mapped places first. */
export function searchPlaces(query: string, limit = 4): CampusPlace[] {
  const q = normalize(query);
  if (!q) return [];
  const hits = CAMPUS_PLACES.filter((place) =>
    (place.mapped && matchesDestination(query)) ||
    normalize(place.code).includes(q) || normalize(place.name).includes(q));
  return hits.sort((a, b) => Number(b.mapped) - Number(a.mapped)).slice(0, limit);
}

/** Shown when the search box is focused but empty. */
export const DEFAULT_SUGGESTIONS = CAMPUS_PLACES.slice(0, 4);

/**
 * Inline completion: the rest of `code` after what the user typed, ignoring case and spaces.
 * "eng1" against "ENG 118" returns "18"; returns null when the query is not a prefix.
 */
export function completeCode(query: string, code: string): string | null {
  const q = query.toLowerCase();
  if (!q.trim()) return null;
  let qi = 0;
  let ci = 0;
  while (qi < q.length && ci < code.length) {
    if (q[qi] === ' ') { qi++; continue; }
    if (code[ci] === ' ') { ci++; continue; }
    if (q[qi] !== code[ci].toLowerCase()) return null;
    qi++;
    ci++;
  }
  return qi === q.length && ci < code.length ? code.slice(ci) : null;
}

const ROOM_PREFIXES = ['', 'eng', 'engr', 'engineering', 'engineering1', 'eng1', 'room', 'classroom'];

/** Forgiving room search: "ENG 118", "eng118", "Engineering 118" and "118" all match. */
export function matchesDestination(query: string): boolean {
  const normalized = normalize(query);
  if (!normalized.endsWith('118')) return false;
  const prefix = normalized.slice(0, -3);
  return ROOM_PREFIXES.includes(prefix) || (prefix.length >= 2 && 'engineering'.startsWith(prefix));
}

export const PRELOAD_IMAGES = [
  ...ROUTE_STEPS.map((step) => step.photo),
  ARRIVAL_PHOTO,
  FOREST_BACKGROUND,
  CANOPY_LAYER,
  ...GUIDES.map((guide) => guide.sprite),
];
