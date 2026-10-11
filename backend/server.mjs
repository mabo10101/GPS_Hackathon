import { createServer } from 'node:http';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const coordinates = (value) => Array.isArray(value) && value.length === 2 &&
  value.every((n) => typeof n === 'number' && Number.isFinite(n)) && Math.abs(value[0]) <= 180 && Math.abs(value[1]) <= 90;

export function createRoutingServer({ apiKey = '', fetchImpl = fetch, requestLimit = 60 } = {}) {
  const clients = new Map();
  return createServer(async (req, res) => {
    const send = (status, data) => {
      if (res.destroyed) return;
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(data));
    };
    if (req.method === 'GET' && req.url === '/api/health') return send(200, { routingConfigured: Boolean(apiKey) });
    if (req.url !== '/api/routes') return send(404, { message: 'Endpoint not found.' });
    if (req.method !== 'POST') return send(405, { message: 'Use POST for routing.' });
    if (!apiKey) return send(503, { message: 'Walking routes are not configured on the server.' });
    const now = Date.now();
    for (const [id, client] of clients) if (now - client.since >= 60000) clients.delete(id);
    const id = req.socket.remoteAddress;
    const client = clients.get(id) ?? { since: now, count: 0 };
    if (client.count >= requestLimit) return send(429, { message: 'Routing request limit reached. Wait a minute and try again.' });
    client.count++;
    clients.set(id, client);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    res.on('close', () => controller.abort());
    try {
      let body = '';
      for await (const chunk of req) {
        body += chunk.toString();
        if (Buffer.byteLength(body) > 4096) { send(413, { message: 'Routing request is too large.' }); return; }
      }
      let input;
      try { input = JSON.parse(body); } catch { return send(400, { message: 'Send a valid JSON routing request.' }); }
      if (!input || !coordinates(input.start) || !coordinates(input.end)) return send(400, { message: 'Start and end must be valid [longitude, latitude] coordinates.' });
      const params = new URLSearchParams({
        waypoints: [input.start, input.end].map(([lng, lat]) => `${lat},${lng}`).join('|'),
        mode: 'walk', type: 'short', units: 'metric', lang: 'en', format: 'geojson', apiKey,
      });
      const upstream = await fetchImpl(`https://api.geoapify.com/v1/routing?${params}`, { signal: controller.signal });
      if (!upstream.ok) {
        if ([401, 403].includes(upstream.status)) return send(502, { message: 'Geoapify rejected the server API key. Check its restrictions and configuration.' });
        if (upstream.status === 429) return send(429, { message: 'Geoapify request limit reached. Wait before trying again.' });
        const data = await upstream.json().catch(() => null);
        if ([400, 404].includes(upstream.status) && /no route|could not find|failed to find|no suitable|no path/i.test(data?.message ?? '')) {
          return send(200, { type: 'FeatureCollection', features: [] });
        }
        return send(502, { message: 'Walking route provider failed. Try again later.' });
      }
      const data = await upstream.json();
      // Forward only routing fields, never provider diagnostics or authentication data.
      if (!Array.isArray(data.features)) return send(502, { message: 'Unexpected response from the walking route provider.' });
      send(200, { type: 'FeatureCollection', features: data.features.map((feature) => ({
        type: 'Feature', geometry: feature.geometry,
        properties: { distance: feature.properties?.distance, time: feature.properties?.time, legs: feature.properties?.legs },
      })) });
    } catch {
      send(controller.signal.aborted ? 504 : 502, { message: controller.signal.aborted ? 'Walking route request timed out. Try again.' : 'Could not reach the walking route provider. Try again.' });
    } finally { clearTimeout(timer); }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { loadEnvFile(new URL('.env.local', import.meta.url)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const port = Number(process.env.PORT ?? 3001);
  createRoutingServer({ apiKey: process.env.GEOAPIFY_API_KEY?.trim() }).listen(port, '127.0.0.1', () => {
    console.log(`Campus routing backend listening on http://127.0.0.1:${port}`);
  });
}
