// Dev only: walks the fake location along the route on screen, so the
// turn-by-turn navigation can be tested on a laptop.
import { getFakeLocation, setFakeLocation } from '../lib/location.js'
import { measureLine, pointAlong, projectOnLine } from '../lib/navigation.js'
import { getPublishedRoute } from '../lib/route.js'

const WALKING_SPEED = 1.3 // m/s
const TICK_MS = 250
const CHANGE_EVENT = 'insideout:simulate'

let timer = null

const notify = () => window.dispatchEvent(new Event(CHANGE_EVENT))

export const isWalking = () => timer !== null

export function subscribeWalk(callback) {
  window.addEventListener(CHANGE_EVENT, callback)
  return () => window.removeEventListener(CHANGE_EVENT, callback)
}

export function stopWalk() {
  if (timer === null) return
  clearInterval(timer)
  timer = null
  notify()
}

/** Starts walking from the nearest point on the route. Returns false if there's no route. */
export function startWalk(speedFactor = 1) {
  const coords = getPublishedRoute()
  if (!coords || coords.length < 2) return false
  stopWalk()

  const line = measureLine(coords)
  const fake = getFakeLocation()
  let along = fake.enabled ? projectOnLine(line, fake).along : 0
  const start = pointAlong(line, along)
  // No fake heading: the app works out the direction from the movement, like real GPS
  setFakeLocation({ enabled: true, heading: null, lat: start.lat, lng: start.lng })

  timer = setInterval(() => {
    along += (WALKING_SPEED * speedFactor * TICK_MS) / 1000
    const p = pointAlong(line, along)
    setFakeLocation({ enabled: true, lat: p.lat, lng: p.lng })
    if (along >= line.length) stopWalk()
  }, TICK_MS)
  notify()
  return true
}
