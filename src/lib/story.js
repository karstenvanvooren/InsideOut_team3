// Read-only helpers around story.json.
// Screens should use these instead of reading the JSON directly.
import story from '../data/story.json'

const byId = (list) => Object.fromEntries(list.map((item) => [item.id, item]))

const hooksById = byId(story.hooks)
const fragmentsById = byId(story.fragments)

export const meta = story.meta

/** The Stadsfeestzaal: { id, name, lat, lng, radius, maxAccuracy, qrId }. */
export const getStart = () => story.start

/** The route, in order. */
export const getLocations = () => story.locations
export const getLocation = (index) => story.locations[index] ?? null
export const isLastLocation = (index) => index >= story.locations.length - 1

/** "start→loc1": the leg that leads to location `index`. */
export function legTo(index) {
  const from = index === 0 ? story.start.id : story.locations[index - 1]?.id
  return `${from}→${story.locations[index]?.id}`
}

export const getHooks = () => story.hooks
export const getHook = (id) => hooksById[id] ?? null
export const getHooksOnLeg = (leg) => story.hooks.filter((hook) => hook.leg === leg)

export const getFragments = () => story.fragments
export const getFragment = (id) => fragmentsById[id] ?? null
export const getLocationFragments = (location) => (location?.fragments ?? []).map(getFragment).filter(Boolean)
/** "Fragment 3": its place in the list (ordered along the route). */
export const fragmentNumber = (id) => story.fragments.findIndex((f) => f.id === id) + 1

/** What does a scanned QR id point to? { kind: 'start' | 'hook', item } or null. */
export function findQr(qrId) {
  if (qrId === story.start.qrId) return { kind: 'start', item: story.start }
  const hook = story.hooks.find((h) => h.qrId === qrId)
  return hook ? { kind: 'hook', item: hook } : null
}
