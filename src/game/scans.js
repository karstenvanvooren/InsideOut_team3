// What happens when a QR is scanned. One path for the in-app scanner, the phone
// camera (deep link /hook/:qrId) and the dev panel's "Fake scan".
// Scanning a hook never changes the phase; only the start QR does (via the unlock).
// The start QR is location-locked; hooks are not (their coordinates are only for the map and dev).
import { config } from '../config.js'
import { isLocationCheckSkipped } from '../dev/devSettings.js'
import { checkAtLocation, formatDistance, getCurrentPosition } from '../lib/location.js'
import { findQr } from '../lib/story.js'
import { STARTED_PHASES, collectHook, loadGame } from './gameState.js'

/** Where is the player compared to `place`? { status: 'there' | 'far' | 'weak-signal' | 'no-location', ... } */
async function checkPlayerAt(place) {
  if (isLocationCheckSkipped()) return { status: 'there', isThere: true, distance: 0 }
  try {
    return checkAtLocation(place, await getCurrentPosition())
  } catch (err) {
    return { status: 'no-location', code: err.code ?? 'unavailable' }
  }
}

const locationProblem = {
  denied: 'We need your location to check where you scanned. Allow location for this site in your browser settings and scan again.',
  insecure: 'Your location only works on a secure (https) page. Open the game through its official link.',
  unsupported: 'This browser can’t share your location. Open the game in Safari (iPhone) or Chrome (Android).',
  unavailable: 'We can’t find your location right now. Step outside and scan again.',
  timeout: 'Finding your location took too long. Step outside and scan again.',
}

const weakSignal = {
  kind: 'message',
  title: 'Looking for a better GPS signal',
  text: 'Step outside or wait a moment, then scan again.',
}

/**
 * Decides what a scan means right now, and collects the hook if it counts.
 * Returns { kind: 'start-unlock' } | { kind: 'hook-collected', hook } | { kind: 'message', title, text }.
 */
export async function resolveScan(qrId) {
  const game = loadGame()
  const found = findQr(qrId)
  if (!found) return { kind: 'message', title: 'Unknown QR code', text: 'This QR code isn’t part of Inside Out.' }

  if (found.kind === 'start') {
    if (game.phase !== 'locked') {
      return { kind: 'message', title: 'You’ve already started', text: 'No need to scan the start again. Keep going!' }
    }
    const where = await checkPlayerAt(found.item)
    if (where.status === 'there') return { kind: 'start-unlock' }
    if (where.status === 'weak-signal') return weakSignal
    if (where.status === 'no-location') return { kind: 'message', title: 'Location needed', text: locationProblem[where.code] }
    return {
      kind: 'message',
      title: 'Not here',
      text: `This only opens at the start.${config.showDistanceOnLock ? ` (${formatDistance(where.distance)} away)` : ''}`,
    }
  }

  const hook = found.item
  if (!STARTED_PHASES.includes(game.phase)) {
    return { kind: 'message', title: 'Not yet', text: 'Start the game at the Stadsfeestzaal first.' }
  }
  if (game.collectedHooks[hook.id]) return { kind: 'message', title: 'Already yours', text: 'You already found this one.' }
  collectHook(hook.id)
  return { kind: 'hook-collected', hook }
}
