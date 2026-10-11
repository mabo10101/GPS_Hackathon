import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoutingServer } from '../server.mjs';

async function withServer(options, run) {
  const server = createRoutingServer(options);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); }); }
}
const body = { start: [-81.2, 28.6], end: [-81.201, 28.601] };
const post = (url, value = body) => fetch(`${url}/api/routes`, { method: 'POST', body: JSON.stringify(value) });

test('server owns the API key and sends walking coordinates to Geoapify', async () => {
  let providerUrl;
  await withServer({ apiKey: 'server-secret', fetchImpl: async (url) => {
    providerUrl = new URL(url);
    return Response.json({ features: [{ geometry: { type: 'LineString', coordinates: [body.start, body.end] }, properties: { distance: 100, time: 60, legs: [] } }], apiKey: 'server-secret' });
  } }, async (url) => {
    const health = await (await fetch(`${url}/api/health`)).json();
    assert.deepEqual(health, { routingConfigured: true });
    const response = await post(url);
    assert.equal(response.status, 200);
    assert.equal(providerUrl.searchParams.get('apiKey'), 'server-secret');
    assert.equal(providerUrl.searchParams.get('waypoints'), '28.6,-81.2|28.601,-81.201');
    assert.equal(providerUrl.searchParams.get('mode'), 'walk');
    assert.ok(!(await response.text()).includes('server-secret'));
  });
});

test('invalid requests never reach the provider', async () => {
  let calls = 0;
  await withServer({ apiKey: 'key', fetchImpl: async () => { calls++; } }, async (url) => {
    assert.equal((await post(url, { ...body, start: [181, 28] })).status, 400);
    assert.equal((await fetch(`${url}/api/routes`, { method: 'POST', body: 'invalid' })).status, 400);
    assert.equal((await fetch(`${url}/api/routes`, { method: 'POST', body: 'x'.repeat(5000) })).status, 413);
    assert.equal(calls, 0);
  });
});

test('missing server configuration disables routing without leaking configuration', async () => {
  await withServer({}, async (url) => {
    assert.deepEqual(await (await fetch(`${url}/api/health`)).json(), { routingConfigured: false });
    assert.equal((await post(url)).status, 503);
  });
});

test('provider errors are sanitized and no-route responses remain empty results', async () => {
  const replies = [Response.json({ message: 'secret' }, { status: 403 }), Response.json({ message: 'No route found' }, { status: 404 }), Response.json({}, { status: 429 })];
  await withServer({ apiKey: 'secret', fetchImpl: async () => replies.shift() }, async (url) => {
    const rejected = await post(url);
    assert.equal(rejected.status, 502);
    assert.ok(!(await rejected.text()).includes('secret'));
    assert.deepEqual(await (await post(url)).json(), { type: 'FeatureCollection', features: [] });
    assert.equal((await post(url)).status, 429);
  });
});

test('rate limiting stops extra provider calls', async () => {
  let calls = 0;
  await withServer({ apiKey: 'key', requestLimit: 1, fetchImpl: async () => { calls++; return Response.json({ features: [] }); } }, async (url) => {
    assert.equal((await post(url)).status, 200);
    assert.equal((await post(url)).status, 429);
    assert.equal(calls, 1);
  });
});
