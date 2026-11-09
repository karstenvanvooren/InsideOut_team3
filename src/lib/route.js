// Walking routes from BRouter (https://brouter.de, free, no API key).
// BRouter returns the route line; the turn-by-turn steps are worked out here from
// the shape of that line (see stepsFromLine in navigation.js).
// If BRouter fails, the map draws a dashed straight line instead.
import { config } from '../config.js'
import { distanceMeters } from './location.js'
import { stepsFromLine } from './navigation.js'

const BROUTER_URL = 'https://brouter.de/brouter'
const TIMEOUT_MS = 10000
const WALKING_SPEED = 4.5 / 3.6 // 4.5 km/h in m/s

async function brouter(from, to, profile, signal) {
  const params = new URLSearchParams({
    lonlats: `${from.lng},${from.lat}|${to.lng},${to.lat}`,
    profile,
    alternativeidx: '0',
    format: 'geojson',
  })
  const timeout = AbortSignal.timeout?.(TIMEOUT_MS)
  const res = await fetch(`${BROUTER_URL}?${params}`, {
    signal: timeout && AbortSignal.any ? AbortSignal.any([signal, timeout].filter(Boolean)) : signal,
  })
  if (!res.ok) throw new Error(`BRouter request failed (${res.status}): ${(await res.text()).slice(0, 120)}`)
  const data = await res.json()
  const feature = data.features?.[0]
  const coords = feature?.geometry?.coordinates
  if (!coords?.length) throw new Error('BRouter found no route')
  return { coords: coords.map(([lng, lat]) => [lat, lng]), length: Number(feature.properties?.['track-length']) }
}

/**
 * Resolves to { coords: [[lat, lng], ...], distance (m), duration (s), steps, fallback: false }.
 * steps: [{ type, modifier, name, bearingAfter, location: { lat, lng } }] — one per turn.
 */
export async function fetchWalkingRoute(from, to, signal) {
  // The walking profile first; "shortest" as a backup if that profile isn't on the server
  const profiles = [...new Set([config.routeProfile, 'shortest'])]
  let lastError
  for (const profile of profiles) {
    try {
      const { coords, length } = await brouter(from, to, profile, signal)
      const distance = Number.isFinite(length) && length > 0 ? length : lineLength(coords)
      return { coords, distance, duration: distance / WALKING_SPEED, steps: stepsFromLine(coords), fallback: false }
    } catch (err) {
      if (signal?.aborted) throw err
      lastError = err
    }
  }
  throw lastError
}

const lineLength = (coords) =>
  coords.reduce((sum, [lat, lng], i) => (i ? sum + distanceMeters({ lat: coords[i - 1][0], lng: coords[i - 1][1] }, { lat, lng }) : 0), 0)

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
