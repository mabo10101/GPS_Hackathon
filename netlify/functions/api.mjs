// Runs the existing routing backend (backend/server.mjs) as a Netlify Function.
// The server listens on a private loopback port inside the function and each
// /api request is forwarded to it unchanged. Set GEOAPIFY_API_KEY in Netlify.
import { createRoutingServer } from '../../backend/server.mjs';

let origin;

function start() {
  origin ??= new Promise((resolve, reject) => {
    // Every request reaches the inner server from 127.0.0.1, so its per-IP limit
    // would be shared by all visitors. Netlify's own limits apply instead.
    const server = createRoutingServer({ apiKey: process.env.GEOAPIFY_API_KEY?.trim(), requestLimit: Infinity });
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`));
  });
  return origin;
}

export default async (request) => {
  const { pathname } = new URL(request.url);
  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text();
  const response = await fetch(`${await start()}${pathname}`, {
    method: request.method,
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  return new Response(await response.text(), {
    status: response.status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};

export const config = { path: '/api/*' };
