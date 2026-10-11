import test, { afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Use the existing TypeScript compiler without adding a test framework.
function moduleUrl(path, imports = {}) {
  let source = readFileSync(new URL(path, import.meta.url), 'utf8');
  for (const [name, url] of Object.entries(imports)) source = source.replace(`from '${name}'`, `from '${url}'`);
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
}

const dataUrl = moduleUrl('../src/data/pois.ts');
const { validatePois } = await import(dataUrl);
const { watchUserLocation, distanceMeters } = await import(moduleUrl('../src/services/location.ts'));
const { advanceGuidance } = await import(moduleUrl('../src/services/guidance.ts', {
  './location': moduleUrl('../src/services/location.ts'),
}));
const reactStub = 'data:text/javascript,export const useEffect=()=>{},useRef=()=>{},useState=()=>{};';
const { compassHeading } = await import(moduleUrl('../src/services/compass.ts', { react: reactStub }));
const { parseWalkingRoute, getWalkingRoute, findNearestWalkingRoute } = await import(
  moduleUrl('../src/services/routing.ts', { '../data/pois': dataUrl }),
);
afterEach(() => mock.restoreAll());

const start = [-81.2, 28.6];
const poi = (id, coordinates, entranceCoordinates) => ({ id, name: id, category: 'vending', coordinates, entranceCoordinates });
const responseData = (distance, time = 60) => ({
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    geometry: { type: 'MultiLineString', coordinates: [[start, [-81.201, 28.601]]] },
    properties: { distance, time, legs: [{ steps: [{ instruction: { text: 'Continue on the path.' } }] }] },
  }],
});

test('invalid coordinates and duplicate POIs are excluded', () => {
  const result = validatePois([
    poi('valid', start), poi('valid', start), poi('out-of-range', [-181, 28]),
    poi('invalid-entrance', start, [-81, Number.NaN]),
  ]);
  assert.deepEqual(result.valid.map((item) => item.id), ['valid']);
  assert.equal(result.errors.length, 3);
});

test('route parser handles geometry and instructions, rejects invalid routes', () => {
  const route = parseWalkingRoute(responseData(150));
  assert.equal(route.feature.properties.distance, 150);
  assert.deepEqual(route.instructions, ['Continue on the path.']);
  assert.equal(parseWalkingRoute({ features: [] }), null);
  assert.throws(() => parseWalkingRoute(responseData(Number.NaN)), /invalid route/);
  const invalidGeometry = responseData(150);
  invalidGeometry.features[0].geometry.coordinates = [[[-81, 900], start]];
  assert.throws(() => parseWalkingRoute(invalidGeometry), /invalid route/);
});

test('walking request sends coordinates to backend without an API key', async () => {
  const fetchMock = mock.method(globalThis, 'fetch', async () => Response.json(responseData(100)));
  await getWalkingRoute(start, [-81.201, 28.601], new AbortController().signal);
  assert.equal(fetchMock.mock.calls[0].arguments[0], '/api/routes');
  const options = fetchMock.mock.calls[0].arguments[1];
  assert.equal(options.method, 'POST');
  assert.deepEqual(JSON.parse(options.body), { start, end: [-81.201, 28.601] });
});

test('nearest uses walking distance and entrance coordinates, skipping unreachable routes', async () => {
  const candidates = [
    poi('near-straight-line', [-81.2001, 28.6001]),
    poi('shorter-walk', [-81.205, 28.605], [-81.203, 28.603]),
    poi('unreachable', [-81.21, 28.61]),
  ];
  const replies = [responseData(800), responseData(200), { features: [] }];
  const fetchMock = mock.method(globalThis, 'fetch', async () => Response.json(replies.shift()));
  const progress = [];
  const result = await findNearestWalkingRoute(start, candidates, new AbortController().signal,
    (done, total) => progress.push([done, total]));
  assert.equal(result.poi.id, 'shorter-walk');
  assert.equal(result.unreachableCount, 1);
  assert.deepEqual(JSON.parse(fetchMock.mock.calls[1].arguments[1].body).end, [-81.203, 28.603]);
  assert.deepEqual(progress, [[1, 3], [2, 3], [3, 3]]);
});

test('quota failures stop comparison instead of returning an incomplete nearest result', async () => {
  let count = 0;
  mock.method(globalThis, 'fetch', async () => ++count === 1
    ? Response.json(responseData(100)) : Response.json({ message: 'Routing request limit reached.' }, { status: 429 }));
  await assert.rejects(findNearestWalkingRoute(start, [poi('a', start), poi('b', start)],
    new AbortController().signal, () => {}), /limit reached/);
});

test('cancellation stops pending route comparisons before making an API call', async () => {
  const fetchMock = mock.method(globalThis, 'fetch', async () => Response.json(responseData(100)));
  const controller = new AbortController();
  const pending = findNearestWalkingRoute(start, [poi('a', start)], controller.signal, () => {});
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(fetchMock.mock.calls.length, 0);
});

test('missing reachable routes report failure rather than drawing a straight line', async () => {
  mock.method(globalThis, 'fetch', async () => Response.json({ features: [] }));
  await assert.rejects(findNearestWalkingRoute(start, [poi('a', start)],
    new AbortController().signal, () => {}), /No walking routes/);
});

test('GPS watch uses fresh high-accuracy fixes and stops delivering locations after cancellation', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  let success;
  let options;
  const cleared = [];
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { geolocation: {
    watchPosition(callback, _error, settings) { success = callback; options = settings; return 42; },
    clearWatch(id) { cleared.push(id); },
  } } });
  try {
    const controller = new AbortController();
    const locations = [];
    watchUserLocation(controller.signal, (location) => locations.push(location), () => {});
    assert.equal(options.enableHighAccuracy, true);
    assert.equal(options.maximumAge, 0);
    success({ coords: { longitude: -81.2, latitude: 28.6, accuracy: 8 } });
    assert.deepEqual(locations, [{ coordinates: start, accuracy: 8 }]);
    controller.abort();
    success({ coords: { longitude: -81.3, latitude: 28.7, accuracy: 8 } });
    assert.deepEqual(cleared, [42]);
    assert.equal(locations.length, 1);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'navigator', previous);
    else delete globalThis.navigator;
  }
});

test('movement thresholds use meters', () => {
  assert.equal(distanceMeters(start, start), 0);
  const distance = distanceMeters([0, 0], [0, 0.001]);
  assert.ok(distance > 110 && distance < 112);
});

test('compass uses north-referenced readings and adjusts for screen orientation', () => {
  assert.equal(compassHeading({ webkitCompassHeading: 90 }), 90);
  assert.equal(compassHeading({ alpha: 90, absolute: true }), 270);
  assert.equal(compassHeading({ alpha: 90, absolute: false }), null);
  assert.equal(compassHeading({ alpha: null, absolute: true }), null);
  assert.equal(compassHeading({ webkitCompassHeading: 350 }, 90), 80);
  assert.equal(compassHeading({ webkitCompassHeading: 90, webkitCompassAccuracy: -1 }), null);
  assert.equal(compassHeading({ webkitCompassHeading: Number.NaN }), null);
});

test('maneuver coordinates use indexes within each route leg', () => {
  const data = responseData(200);
  const secondLeg = [[-81.201, 28.601], [-81.202, 28.602]];
  data.features[0].geometry.coordinates.push(secondLeg);
  data.features[0].properties.legs[0].steps[0].from_index = 1;
  data.features[0].properties.legs.push({ steps: [{ from_index: 1, instruction: { text: 'Turn left.' } }] });
  assert.deepEqual(parseWalkingRoute(data).steps, [
    { instruction: 'Continue on the path.', coordinates: [-81.201, 28.601] },
    { instruction: 'Turn left.', coordinates: secondLeg[1] },
  ]);
});

test('guide advances only at the next checkpoint with an accurate fix', () => {
  const steps = [
    { instruction: 'Start walking.', coordinates: start },
    { instruction: 'Turn left.', coordinates: [-81.201, 28.601] },
    { instruction: 'Arrive.', coordinates: [-81.202, 28.602] },
  ];
  assert.equal(advanceGuidance(steps, 0, { coordinates: start, accuracy: 5 }), 0);
  assert.equal(advanceGuidance(steps, 0, { coordinates: steps[1].coordinates, accuracy: 5 }), 1);
  assert.equal(advanceGuidance(steps, 0, { coordinates: steps[1].coordinates, accuracy: 80 }), 0);
  assert.equal(advanceGuidance(steps, 0, { coordinates: steps[2].coordinates, accuracy: 5 }), 0);
  assert.equal(advanceGuidance(steps, 2, { coordinates: steps[2].coordinates, accuracy: 5 }), 2);
});

test('missing or invalid checkpoint indexes allow manual directions without invented coordinates', () => {
  const data = responseData(100);
  data.features[0].properties.legs[0].steps[0].from_index = -1;
  assert.equal(parseWalkingRoute(data).steps[0].coordinates, null);
  const steps = [{ instruction: 'Start', coordinates: start }, { instruction: 'Turn', coordinates: null }];
  assert.equal(advanceGuidance(steps, 0, { coordinates: start, accuracy: 5 }), 0);
});
