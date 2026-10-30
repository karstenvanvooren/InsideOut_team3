// Where is the player? Real GPS, or the fake position from the dev panel.
import { safeGet, safeSet } from './storage.js'

const FAKE_KEY = 'insideout.fakeLocation.v1'
const CHANGE_EVENT = 'insideout:location'

/** GPS accuracy worse than this is capped, so a bad fix can't count as "there". */
export const MAX_ACCURACY = 100

// ---------- Fake location (dev panel) ----------

// heading: a fake compass (0–360), or null to use the real compass / walking direction
const defaultFake = () => ({ enabled: false, lat: 51.2194, lng: 4.4025, heading: null })

export function getFakeLocation() {
  return { ...defaultFake(), ...(safeGet(FAKE_KEY) ?? {}) }
}

export function setFakeLocation(changes) {
  safeSet(FAKE_KEY, { ...getFakeLocation(), ...changes })
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function subscribeFakeLocation(callback) {
  window.addEventListener(CHANGE_EVENT, callback)
  return () => window.removeEventListener(CHANGE_EVENT, callback)
}

// ---------- Getting a position ----------

export class LocationError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code // 'insecure' | 'unsupported' | 'denied' | 'unavailable' | 'timeout'
  }
}

/** Resolves to { lat, lng, accuracy, fake }. Rejects with a LocationError. */
export function getCurrentPosition() {
  const fake = getFakeLocation()
  if (fake.enabled) {
    return Promise.resolve({ lat: fake.lat, lng: fake.lng, accuracy: 0, fake: true })
  }
  if (!window.isSecureContext) {
    return Promise.reject(new LocationError('insecure', 'Location only works on https.'))
  }
  if (!('geolocation' in navigator)) {
    return Promise.reject(new LocationError('unsupported', 'This browser has no location support.'))
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          fake: false,
        }),
      (err) => reject(new LocationError(geoErrorCodes[err.code] ?? 'unavailable', err.message)),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  })
}

const geoErrorCodes = { 1: 'denied', 2: 'unavailable', 3: 'timeout' }

/**
 * Live position: calls onPosition({ lat, lng, accuracy, fake }) on every update,
 * onError(LocationError) when real GPS fails. Follows the dev panel: switching
 * the fake location on, off or moving it takes effect immediately.
 * Returns a function that stops watching.
 */
export function watchPosition(onPosition, onError) {
  let geoId = null
  const stopGeo = () => {
    if (geoId !== null) navigator.geolocation.clearWatch(geoId)
    geoId = null
  }

  const start = () => {
    stopGeo()
    const fake = getFakeLocation()
    if (fake.enabled) {
      onPosition({ lat: fake.lat, lng: fake.lng, accuracy: 0, fake: true })
      return
    }
    if (!window.isSecureContext) {
      onError(new LocationError('insecure', 'Location only works on https.'))
      return
    }
    if (!('geolocation' in navigator)) {
      onError(new LocationError('unsupported', 'This browser has no location support.'))
      return
    }
    geoId = navigator.geolocation.watchPosition(
      (pos) =>
        onPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, fake: false }),
      (err) => onError(new LocationError(geoErrorCodes[err.code] ?? 'unavailable', err.message)),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    )
  }

  start()
  const unsubscribe = subscribeFakeLocation(start)
  return () => {
    unsubscribe()
    stopGeo()
  }
}

// ---------- Distance ----------

/** Haversine distance in meters. */
export function distanceMeters(a, b) {
  const R = 6371000
  const rad = (deg) => (deg * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/**
 * Is this position at the hook? GPS accuracy is given the benefit of the doubt
 * (distance minus accuracy), but accuracy is capped at MAX_ACCURACY.
 */
export function checkAtHook(hook, position) {
  const distance = distanceMeters(position, hook.location)
  const accuracy = Math.min(position.accuracy ?? 0, MAX_ACCURACY)
  const radius = hook.location.radius ?? 50
  return {
    distance: Math.round(distance),
    accuracy: Math.round(position.accuracy ?? 0),
    isThere: distance - accuracy <= radius,
  }
}

export function formatDistance(meters) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`
}
