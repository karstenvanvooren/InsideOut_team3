// The look of the game map (Leaflet). Calm tiles without street names
// (CARTO "Voyager, no labels", built on OpenStreetMap data, free with credits).
// Everything else is CSS in global.css ("Game map (Leaflet)"), driven by tokens:
//   --map-blur   how blurred the tiles are (mystery that clears up per stage)
//   --map-tint   colour wash over the tiles (begin cool grey → end the artwork's colours)
//   --map-route  the route line
// so the map follows the colour stage without any JavaScript.

export const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png'
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
