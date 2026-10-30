// The look of the game map. Change colours here — nothing else needs to change.
// The style is built from OpenFreeMap's vector tiles (free, no API key) and keeps
// only ground, water, parks, roads/paths and buildings: no labels, no shop icons.

export const MAP_THEME = {
  background: '#f3f0f8', // land: very light lilac-white
  park: '#cdebc6', // parks, grass, woods: soft green
  water: '#b9dbf3', // rivers, docks: soft blue
  road: '#ffffff', // every road and path
  roadEdge: '#ddd6ea', // thin edge around roads so white reads on light land
  path: '#fbfaff', // footpaths, squares
  building: '#e3dcf2', // 3D buildings: light lilac-grey
  buildingOpacity: 0.8, // a little see-through, so the trail shows behind buildings
  buildingHeightScale: 0.45, // lower than real: a game world, and the trail stays visible

  accent: '#751ffe', // route, player, beacon
  accentDark: '#4a0fb8',
  accentGlow: '#b48cff',
}

const TILES_URL = 'https://tiles.openfreemap.org/planet'

// Road widths grow with zoom, like every game map
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

export function buildMapStyle(theme = MAP_THEME) {
  return {
    version: 8,
    name: 'Inside Out game map',
    sources: { omt: { type: 'vector', url: TILES_URL } },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': theme.background } },
      {
        id: 'greens',
        type: 'fill',
        source: 'omt',
        'source-layer': 'landcover',
        filter: classIn(['grass', 'wood']),
        paint: { 'fill-color': theme.park },
      },
      { id: 'parks', type: 'fill', source: 'omt', 'source-layer': 'park', filter: isArea, paint: { 'fill-color': theme.park } },
      { id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', filter: notTunnel, paint: { 'fill-color': theme.water } },
      {
        id: 'waterways',
        type: 'line',
        source: 'omt',
        'source-layer': 'waterway',
        filter: notTunnel,
        paint: { 'line-color': theme.water, 'line-width': width(1, 6) },
      },
      // Squares and pedestrian areas (the Meir, Groenplaats, ...)
      {
        id: 'squares',
        type: 'fill',
        source: 'omt',
        'source-layer': 'transportation',
        filter: isArea,
        paint: { 'fill-color': theme.path },
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
    ],
  }
}
