# UCF campus map

A minimal React + TypeScript + Vite frontend using MapLibre GL JS and the
OpenFreeMap Liberty style. The basemap and custom POI highlights need no API
key or backend. Walking routes use a Geoapify API key. Map tiles require an
internet connection, and rendering requires a browser with WebGL2 support.

## Run locally

Install Node.js 22.12 or newer, then run from this directory:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. For a production build, run `npm run build`.
Use `npm run preview` to serve the build locally.

On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

## Custom POIs and walking routes

Add your locations to `src/data/pois.ts`; `src/data/README.md` documents the
record format, categories, coordinate order and optional entrance location.
The list includes clearly labeled, unverified demo points for testing. Replace
them with your real locations. Choose a category to highlight its points; clicking
a name in the list centers the map on that point.

To enable "Route to nearest":

1. Create a Geoapify API key at https://myprojects.geoapify.com/.
2. Copy `.env.example` to `.env.local` and set `VITE_GEOAPIFY_API_KEY`.
3. Restart Vite, select a populated category, and click "Route to nearest".
4. Allow location access. Deployed apps need HTTPS; localhost works for development.
   Opening a phone's browser at a plain HTTP LAN address does not enable location.

`.env.local` is ignored by Git. Vite embeds `VITE_` variables in the public
client bundle; restrict the key's allowed origins in your Geoapify project.
Use a server proxy later if the key must stay private. Never commit a live key.

The app compares actual walking routes for all matching POIs, selecting the
shortest returned distance. Each candidate uses one API request. Requests are
spaced 300 ms apart, in addition to their response time, to limit this client
to fewer than five requests per second. Large catalogs may benefit from a
matrix request or a candidate shortlist; no approximation is used here.

The result shows a gold route, highlights the destination, and lists walking
instructions, estimated time and distance. The blue point is your location at
the time of the request. Indoor POIs can route to an entrance; floor navigation,
live location tracking, automatic rerouting and voice guidance are not included.

Geoapify attribution is displayed while a route is shown, alongside the existing
map attribution. Routing implementation: `src/services/routing.ts`. Location
permission handling: `src/services/location.ts`. Map overlays and the panel are
separate from the reusable basemap component.

Run `npm run test` for routing/data checks using Node's built-in test runner;
these tests mock API calls and do not require a key or consume API credits.

## Map component

`src/components/MapView.tsx` centers the map on UCF at longitude -81.2001,
latitude 28.6024, zoom 15. Native pan, scroll zoom, rotation, keyboard, and touch
interactions are enabled. Zoom and compass controls appear at the top right;
standard map attribution is preserved.

## Retro theme

`src/map/ucfRetroTheme.ts` transforms the Liberty style before it renders, using
a near-black background, charcoal buildings, muted gold walking paths, and
gold labels. Edit `UCF_RETRO_COLORS` to adjust the palette. The transformation
preserves the original tile sources and label placement rules.

Pixelify Sans is bundled in `src/assets/fonts/` with its SIL Open Font License.
MapLibre's `font-faces` configuration applies it to Latin map labels; the
original Liberty fonts remain as fallbacks for other scripts. CSS loads the
same font for attribution. Controls use square dark borders and gold icons.
The map retains normal resolution and zoom behavior for readable navigation.

`MapView` fills its parent, which must have an explicit height. The app supplies
full viewport height, including dynamic viewport sizing on mobile. A
ResizeObserver updates the map when its container changes size. React effect
cleanup disconnects the observer and removes the map, including during
StrictMode development remounts.

For future extensions, pass a typed React ref:

```tsx
import { useRef } from 'react';
import MapView, { type MapViewHandle } from './components/MapView';

const mapRef = useRef<MapViewHandle>(null);
// Render <MapView ref={mapRef} /> inside a parent with an explicit height.
// After mounting, use mapRef.current?.getMap() to access the MapLibre instance.
```

`getMap()` returns null until initialization or after cleanup. For extensions
that modify sources or layers, wait for the map's `load` event (or check
`isStyleLoaded()` first) and clean up any extension event listeners on unmount.
The component accepts an optional `className` for layout customization.
