# Add your campus points

Edit `pois.ts` and add records to `campusPois`. The list includes five clearly
labeled demo points around UCF: three vending machines, one bus stop and one
classroom. These are approximate test coordinates, not verified real POIs or
entrances. Replace them with your own locations before publishing. Save the
file while Vite runs to update it.

To test routing away from campus in Chrome/Edge, open developer tools, choose
More tools > Sensors, and override Location with latitude `28.6015` and longitude
`-81.1995`. Allow location access and click "Route to nearest". This overrides
the starting location for testing only. A Geoapify key is still required.

```ts
export const campusPois: CampusPoi[] = [
  {
    id: 'your-unique-id',
    name: 'Your vending machine name',
    category: 'vending',
    coordinates: [-81.2001, 28.6024], // Example only: replace with real coordinates.
    entranceCoordinates: [-81.2001, 28.6024], // Optional: replace with a real entrance.
    building: 'Your building',
    floor: 1,
    description: 'Near the east entrance',
  },
];
```

Coordinates are always `[longitude, latitude]`. Categories are `vending`,
`bus-stop`, and `classroom`. Add more entries to `POI_CATEGORIES` to extend them.
IDs must be unique. Invalid coordinates and duplicate records are excluded and
reported in the app.

Markers show the actual POI coordinates. For indoor destinations, supply
`entranceCoordinates`: walking directions end at that entrance, not at the
room or machine. The app does not calculate indoor paths or floor transitions.

Selecting a category highlights all its points. "Route to nearest" obtains your
current device location and compares Geoapify walking routes to every point in
that category, choosing the shortest returned walking distance. It is not a
straight-line proximity estimate. One routing request is used per candidate;
requests are spaced out to stay below the free plan's 5 requests/second limit
for this app instance. Other tabs/users share the same key's quota.

Routes which Geoapify explicitly reports as unreachable are skipped, with a
notice when some candidates could not be compared. Other failures (including
authentication, quota and network failures) stop the comparison rather than
claiming the nearest point was found.

GPS is requested only when routing starts. Results include a highlighted route,
distance, estimated walking time and a list of directions. These are route
previews; live turn advancement, automatic rerouting and voice navigation are
not implemented.
