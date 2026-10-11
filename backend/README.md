# Campus routing backend

Requires Node.js 22.12 or newer. No dependencies to install.

Copy `.env.example` to `.env.local` and set `GEOAPIFY_API_KEY`, then run:

```powershell
cd backend
npm.cmd run dev
```

In another terminal, start the frontend with `npm.cmd run dev` from `frontend`.
Vite proxies `/api` to `127.0.0.1:3001` in development and preview.
Restart the backend after editing its environment file.

- `GET /api/health` returns only whether routing is configured.
- `POST /api/routes` accepts `{ "start": [longitude, latitude], "end": [longitude, latitude] }`.
  Returns GeoJSON with route geometry, distances, time, and maneuver legs.

The key stays on the server. Coordinates are validated, bodies limited to 4 KB,
provider requests cancelled on disconnect or after 20 seconds, and requests
limited to 60 per minute per socket IP. Location history is not stored.
Behind Vite or a production proxy, clients share the proxy's socket IP and quota.
For public deployment, apply per-client limits at the reverse proxy.

Production: run `npm.cmd start` with `GEOAPIFY_API_KEY` set in the server
environment. Serve the frontend build through an HTTPS reverse proxy that
forwards `/api` to this backend. The backend binds to loopback; Vite's proxy is
for local development/preview. Keys restricted to browser origins may need new
server-compatible restrictions (such as the server's outbound IP).

Run `npm.cmd test` for mocked HTTP integration tests without consuming credits.
