# UCF campus map

A minimal React + TypeScript + Vite frontend using MapLibre GL JS and the
OpenFreeMap Liberty style. No API key or backend is required. Map tiles require
an internet connection, and rendering requires a browser with WebGL support.

## Run locally

Install Node.js 22.12 or newer, then run from this directory:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. For a production build, run `npm run build`.
Use `npm run preview` to serve the build locally.

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
