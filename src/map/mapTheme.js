// The look of the game map: light and calm, so the UI on top stands out.
// Colours come from the design tokens (src/styles/tokens.css, the --map-* and
// palette variables); the amounts below only say how strong each one is.
// The style is built from OpenFreeMap's vector tiles (free, no API key) and keeps
// only ground, water, parks, roads/paths, buildings and subtle street names.

// A token's value, with var() references already resolved by the browser
const token = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

/** Read when the map is created (tokens.css is loaded by then, see main.jsx). */
export function getMapTheme() {
  return {
    land: token('--map-land'),
    road: token('--map-road'),
    roadEdge: token('--map-road-edge'),
    building: token('--map-building'),
    buildingOpacity: 0.6,
    buildingHeightScale: 0.45, // lower than real: the route stays visible
    park: token('--map-park'),
    parkOpacity: 0.35,
    water: token('--map-water'),
    waterOpacity: 0.25,
    label: token('--map-label'),
    labelOpacity: 0.5,
    route: token('--map-route'),
  }
}

const TILES_URL = 'https://tiles.openfreemap.org/planet'
const GLYPHS_URL = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf'

// Road widths grow with zoom
const width = (z15, z20) => ['interpolate', ['exponential', 1.6], ['zoom'], 15, z15, 20, z20]

// Major roads wider than minor ones (zoom must be the outer expression in MapLibre)
const MAJOR_OR_MINOR = (major, minor) => ['match', ['get', 'class'], MAJOR, major, minor]
const roadWidth = ([major15, major20], [minor15, minor20]) => width(MAJOR_OR_MINOR(major15, minor15), MAJOR_OR_MINOR(major20, minor20))

const notTunnel = ['!=', ['get', 'brunnel'], 'tunnel']
const isLine = ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false]
const isArea = ['match', ['geometry-type'], ['Polygon', 'MultiPolygon'], true, false]
const classIn = (classes) => ['match', ['get', 'class'], classes, true, false]

const MAJOR = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary']
const MINOR = ['minor', 'service', 'street', 'street_limited', 'busway']
const PATHS = ['path', 'pedestrian', 'track']

export function buildMapStyle(theme = getMapTheme()) {
  return {
    version: 8,
    name: 'Inside Out game map',
    glyphs: GLYPHS_URL,
    sources: { omt: { type: 'vector', url: TILES_URL } },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': theme.land } },
      {
        id: 'greens',
        type: 'fill',
        source: 'omt',
        'source-layer': 'landcover',
        filter: classIn(['grass', 'wood']),
        paint: { 'fill-color': theme.park, 'fill-opacity': theme.parkOpacity },
      },
      {
        id: 'parks',
        type: 'fill',
        source: 'omt',
        'source-layer': 'park',
        filter: isArea,
        paint: { 'fill-color': theme.park, 'fill-opacity': theme.parkOpacity },
      },
      {
        id: 'water',
        type: 'fill',
        source: 'omt',
        'source-layer': 'water',
        filter: notTunnel,
        paint: { 'fill-color': theme.water, 'fill-opacity': theme.waterOpacity },
      },
      {
        id: 'waterways',
        type: 'line',
        source: 'omt',
        'source-layer': 'waterway',
        filter: notTunnel,
        paint: { 'line-color': theme.water, 'line-opacity': theme.waterOpacity, 'line-width': width(1, 6) },
      },
      // Squares and pedestrian areas (the Meir, Groenplaats, ...)
      {
        id: 'squares',
        type: 'fill',
        source: 'omt',
        'source-layer': 'transportation',
        filter: isArea,
        paint: { 'fill-color': theme.road },
      },
      {
        id: 'road-edges',
        type: 'line',
        source: 'omt',
        'source-layer': 'transportation',
        filter: ['all', isLine, notTunnel, classIn([...MAJOR, ...MINOR])],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': theme.roadEdge,
          'line-width': roadWidth([9, 42], [6, 30]),
        },
      },
      {
        id: 'paths',
        type: 'line',
        source: 'omt',
        'source-layer': 'transportation',
        filter: ['all', isLine, notTunnel, classIn(PATHS)],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': theme.road, 'line-width': width(2, 12) },
      },
      {
        id: 'roads',
        type: 'line',
        source: 'omt',
        'source-layer': 'transportation',
        filter: ['all', isLine, notTunnel, classIn([...MAJOR, ...MINOR])],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': theme.road,
          'line-width': roadWidth([7, 38], [4.5, 26]),
        },
      },
      {
        id: 'buildings',
        type: 'fill-extrusion',
        source: 'omt',
        'source-layer': 'building',
        minzoom: 14,
        filter: ['!', ['has', 'hide_3d']],
        paint: {
          'fill-extrusion-color': theme.building,
          'fill-extrusion-height': ['*', ['coalesce', ['get', 'render_height'], 10], theme.buildingHeightScale],
          'fill-extrusion-base': ['*', ['coalesce', ['get', 'render_min_height'], 0], theme.buildingHeightScale],
          'fill-extrusion-opacity': theme.buildingOpacity,
        },
      },
      // Street names only (no shops, no POI icons), small and soft
      {
        id: 'street-names',
        type: 'symbol',
        source: 'omt',
        'source-layer': 'transportation_name',
        minzoom: 15.5,
        filter: classIn([...MAJOR, ...MINOR, 'pedestrian']),
        layout: {
          'symbol-placement': 'line',
          'text-field': ['coalesce', ['get', 'name'], ''],
          'text-font': ['Noto Sans Regular'],
          'text-size': 12,
          'text-rotation-alignment': 'map',
          'text-pitch-alignment': 'viewport',
        },
        paint: {
          'text-color': theme.label,
          'text-opacity': theme.labelOpacity,
          'text-halo-color': theme.road,
          'text-halo-width': 1.2,
        },
      },
    ],
  }
}
