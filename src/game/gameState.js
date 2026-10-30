// The game's single source of truth, saved in localStorage so a reload never
// resets a player mid-game: the phase, which location they're on, the riddle
// attempts, collected hooks and unlocked fragments.
import { getLocation, getLocations, isLastLocation } from '../lib/story.js'
import { safeGet, safeRemove, safeSet } from '../lib/storage.js'

const STORAGE_KEY = 'insideout.game.v2'
const CHANGE_EVENT = 'insideout:game'

/** In order. riddle → … → fragmentUnlocked repeats for every location. */
export const PHASES = [
  'locked',
  'hooksIntro',
  'tutorial',
  'riddleIntro',
  'riddle',
  'navigating',
  'atLocation',
  'fragmentUnlocked',
  'finale',
]

// Which phase may follow which. Anything else is refused.
const NEXT = {
  locked: ['hooksIntro'],
  hooksIntro: ['tutorial'],
  tutorial: ['riddleIntro'],
  riddleIntro: ['riddle'],
  riddle: ['navigating'],
  navigating: ['atLocation'],
  atLocation: ['fragmentUnlocked'],
  fragmentUnlocked: ['riddle', 'finale'],
  finale: [],
}

/** Phases after the start: the bottom nav shows and hooks can be collected (scanning never changes the phase). */
export const STARTED_PHASES = ['riddle', 'navigating', 'atLocation', 'fragmentUnlocked', 'finale']

const freshRiddle = () => ({ wrong: 0, revealed: false })

const initialGame = () => ({
  phase: 'locked',
  phaseSince: null,
  startedAt: null,
  locationIndex: 0, // the location the current riddle / walk / challenge is about
  riddle: freshRiddle(),
  collectedHooks: {}, // { hook01: collectedAt }
  fragments: [], // fragment ids, in the order they were unlocked
})

const now = () => new Date().toISOString()

export function loadGame() {
  const data = safeGet(STORAGE_KEY)
  if (!data || !PHASES.includes(data.phase)) return initialGame()
  return { ...initialGame(), ...data }
}

function save(game) {
  safeSet(STORAGE_KEY, game)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** Moves to `next` if that's allowed from the current phase. Returns true if it happened. */
function goTo(next, changes = {}) {
  const game = loadGame()
  if (!NEXT[game.phase].includes(next)) return false
  save({ ...game, ...changes, phase: next, phaseSince: now() })
  return true
}

// ---------- Transitions ----------

/** Valid start scan at the Stadsfeestzaal. */
export const unlockStart = () => goTo('hooksIntro', { startedAt: now() })

/** The three intro screens, one after the other. `from` = the intro that was just finished. */
export function finishIntro(from) {
  const next = { hooksIntro: 'tutorial', tutorial: 'riddleIntro', riddleIntro: 'riddle' }[from]
  return loadGame().phase === from && next ? goTo(next) : false
}

export function recordRiddleWrong() {
  const game = loadGame()
  if (game.phase !== 'riddle') return
  save({ ...game, riddle: { ...game.riddle, wrong: game.riddle.wrong + 1 } })
}

/** Riddle solved (or answer shown after 3 wrong tries): walk to the location. */
export const solveRiddle = ({ revealed = false } = {}) =>
  goTo('navigating', { riddle: { ...loadGame().riddle, revealed } })

/** Inside the location's radius. */
export const arriveAtLocation = () => goTo('atLocation')

/** Challenge done: the location's fragments are added to the collection. */
export function completeChallenge() {
  const game = loadGame()
  const location = getLocation(game.locationIndex)
  const fragments = [...new Set([...game.fragments, ...(location?.fragments ?? [])])]
  return goTo('fragmentUnlocked', { fragments })
}

/** After the fragment screen: the riddle for the next location, or the finale after the last one. */
export function nextLocation() {
  const game = loadGame()
  if (isLastLocation(game.locationIndex)) return goTo('finale')
  return goTo('riddle', { locationIndex: game.locationIndex + 1, riddle: freshRiddle() })
}

/** Hooks are collectibles: saved, but the phase never changes. Returns false if already collected. */
export function collectHook(hookId) {
  const game = loadGame()
  if (game.collectedHooks[hookId]) return false
  save({ ...game, collectedHooks: { ...game.collectedHooks, [hookId]: now() } })
  return true
}

/** Back to the very beginning. */
export function resetGame() {
  safeRemove(STORAGE_KEY)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/**
 * Dev panel only ("Skip to phase…"): jumps anywhere, bypassing the rules above.
 * Fragments of the locations before `locationIndex` are filled in, so the collection looks plausible.
 */
export function devSetPhase(phase, locationIndex = loadGame().locationIndex) {
  if (!PHASES.includes(phase)) return
  const game = loadGame()
  const done = getLocations().slice(0, locationIndex + (phase === 'fragmentUnlocked' || phase === 'finale' ? 1 : 0))
  save({
    ...game,
    phase,
    phaseSince: now(),
    startedAt: game.startedAt ?? (phase === 'locked' ? null : now()),
    locationIndex,
    riddle: freshRiddle(),
    fragments: [...new Set(done.flatMap((location) => location.fragments))],
  })
}

export function subscribeGame(callback) {
  const onStorage = (e) => {
    if (e.key === null || e.key === STORAGE_KEY) callback()
  }
  window.addEventListener(CHANGE_EVENT, callback)
  window.addEventListener('storage', onStorage) // other tabs
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback)
    window.removeEventListener('storage', onStorage)
  }
}
