// Walking routes from the free OSRM foot server (no API key).
// If it fails, the map draws a dashed straight line instead.
import { distanceMeters } from './location.js'

const OSRM_URL = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot'
const TIMEOUT_MS = 8000
const WALKING_SPEED = 4.5 / 3.6 // 4.5 km/h in m/s

/**
 * Resolves to { coords: [[lat, lng], ...], distance (m), duration (s), steps, fallback: false }.
 * steps: [{ type, modifier, exit, name, bearingAfter, location: { lat, lng } }] — one per maneuver.
 */
export async function fetchWalkingRoute(from, to, signal) {
  const url = `${OSRM_URL}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`
  const timeout = AbortSignal.timeout?.(TIMEOUT_MS)
  const res = await fetch(url, { signal: timeout && AbortSignal.any ? AbortSignal.any([signal, timeout]) : signal })
  if (!res.ok) throw new Error(`Route request failed (${res.status})`)
  const data = await res.json()
  const route = data.routes?.[0]
  if (data.code !== 'Ok' || !route) throw new Error(data.message || 'No route found')
  return {
    coords: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distance: route.distance,
    duration: route.duration,
    steps: (route.legs ?? []).flatMap((leg) =>
      leg.steps.map(({ maneuver, name }) => ({
        type: maneuver.type,
        modifier: maneuver.modifier,
        exit: maneuver.exit,
        name: name || '',
        bearingAfter: maneuver.bearing_after,
        location: { lat: maneuver.location[1], lng: maneuver.location[0] },
      })),
    ),
    fallback: false,
  }
}

// ---------- The route on screen right now (the dev panel's "Simulate walk" follows it) ----------

const ROUTE_EVENT = 'insideout:route'
let activeRoute = null

export function publishRoute(coords) {
  activeRoute = coords
  window.dispatchEvent(new Event(ROUTE_EVENT))
}

export const getPublishedRoute = () => activeRoute

export function subscribeRoute(callback) {
  window.addEventListener(ROUTE_EVENT, callback)
  return () => window.removeEventListener(ROUTE_EVENT, callback)
}

/** Straight line "as the crow flies", timed at 4.5 km/h. */
export function straightRoute(from, to) {
  const distance = distanceMeters(from, to)
  return {
    coords: [
      [from.lat, from.lng],
      [to.lat, to.lng],
    ],
    distance,
    duration: distance / WALKING_SPEED,
    steps: [],
    fallback: true,
  }
}

export const formatWalkingTime = (seconds) => {
  const minutes = Math.max(1, Math.round(seconds / 60))
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`
}

