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

test('walking request converts longitude/latitude to Geoapify latitude/longitude', async () => {
  const fetchMock = mock.method(globalThis, 'fetch', async () => Response.json(responseData(100)));
  await getWalkingRoute(start, [-81.201, 28.601], 'test-key', new AbortController().signal);
  const url = new URL(fetchMock.mock.calls[0].arguments[0]);
  assert.equal(url.searchParams.get('waypoints'), '28.6,-81.2|28.601,-81.201');
  assert.equal(url.searchParams.get('mode'), 'walk');
  assert.equal(url.searchParams.get('type'), 'short');
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
  const result = await findNearestWalkingRoute(start, candidates, 'test-key', new AbortController().signal,
    (done, total) => progress.push([done, total]));
  assert.equal(result.poi.id, 'shorter-walk');
  assert.equal(result.unreachableCount, 1);
  assert.equal(new URL(fetchMock.mock.calls[1].arguments[0]).searchParams.get('waypoints'), '28.6,-81.2|28.603,-81.203');
  assert.deepEqual(progress, [[1, 3], [2, 3], [3, 3]]);
});

test('quota failures stop comparison instead of returning an incomplete nearest result', async () => {
  let count = 0;
  mock.method(globalThis, 'fetch', async () => ++count === 1
    ? Response.json(responseData(100)) : Response.json({}, { status: 429 }));
  await assert.rejects(findNearestWalkingRoute(start, [poi('a', start), poi('b', start)], 'test-key',
    new AbortController().signal, () => {}), /limit reached/);
});

test('cancellation stops pending route comparisons before making an API call', async () => {
  const fetchMock = mock.method(globalThis, 'fetch', async () => Response.json(responseData(100)));
  const controller = new AbortController();
  const pending = findNearestWalkingRoute(start, [poi('a', start)], 'test-key', controller.signal, () => {});
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(fetchMock.mock.calls.length, 0);
});

test('missing reachable routes report failure rather than drawing a straight line', async () => {
  mock.method(globalThis, 'fetch', async () => Response.json({ features: [] }));
  await assert.rejects(findNearestWalkingRoute(start, [poi('a', start)], 'test-key',
    new AbortController().signal, () => {}), /No walking routes/);
});
