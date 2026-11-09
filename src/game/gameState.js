// The game's single source of truth, saved in localStorage so a reload never
// resets a player mid-game: the phase, which location (and which of its two
// challenges) they're on, the riddle attempts, collected hooks and fragments.
//
// Per location: riddle → navigating → atLocation (challenge 1) → fragmentUnlocked
//   → atLocation (challenge 2) → fragmentUnlocked → riddle for the next location.
// The last challenge at KMSKA gives no fragment and goes straight to the finale.
import { getChallenges, getLocation, getLocations, isLastLocation } from '../lib/story.js'
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
  atLocation: ['fragmentUnlocked', 'finale'],
  fragmentUnlocked: ['atLocation', 'riddle', 'finale'],
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
  challengeIndex: 0, // which challenge at that location (0 or 1)
  lastFragments: [], // what the last challenge gave (shown in the fragment pop-up)
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

/** The challenge the player is on right now (or null). */
export function currentChallenge(game = loadGame()) {
  return getChallenges(getLocation(game.locationIndex))[game.challengeIndex ?? 0] ?? null
}

const hasNextChallenge = (game) => (game.challengeIndex ?? 0) + 1 < getChallenges(getLocation(game.locationIndex)).length

/** Challenge done: its fragment(s) go into the collection. A challenge without fragments (the KMSKA choice) ends the game. */
export function completeChallenge() {
  const game = loadGame()
  if (game.phase !== 'atLocation') return false
  const reward = currentChallenge(game)?.fragments ?? []
  if (reward.length === 0) {
    if (hasNextChallenge(game)) return goTo('fragmentUnlocked', { lastFragments: [] })
    return goTo('finale', { lastFragments: [] })
  }
  const fragments = [...new Set([...game.fragments, ...reward])]
  return goTo('fragmentUnlocked', { fragments, lastFragments: reward })
}

/** After the fragment pop-up: the next challenge here, the riddle for the next location, or the finale. */
export function continueAfterFragment() {
  const game = loadGame()
  if (game.phase !== 'fragmentUnlocked') return false
  if (hasNextChallenge(game)) return goTo('atLocation', { challengeIndex: (game.challengeIndex ?? 0) + 1 })
  return nextLocation()
}

/** The riddle for the next location, or the finale after the last one. */
export function nextLocation() {
  const game = loadGame()
  if (isLastLocation(game.locationIndex)) return goTo('finale')
  return goTo('riddle', { locationIndex: game.locationIndex + 1, challengeIndex: 0, lastFragments: [], riddle: freshRiddle() })
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
export function devSetPhase(phase, locationIndex = loadGame().locationIndex, challengeIndex = 0) {
  if (!PHASES.includes(phase)) return
  const game = loadGame()
  const done = getLocations().slice(0, locationIndex + (phase === 'finale' ? 1 : 0))
  const here = getChallenges(getLocation(locationIndex))
  // challenges already finished at this location (fragmentUnlocked = the current one is done too)
  const doneHere = here.slice(0, challengeIndex + (phase === 'fragmentUnlocked' ? 1 : 0))
  save({
    ...game,
    phase,
    phaseSince: now(),
    startedAt: game.startedAt ?? (phase === 'locked' ? null : now()),
    locationIndex,
    challengeIndex,
    lastFragments: phase === 'fragmentUnlocked' ? here[challengeIndex]?.fragments ?? [] : [],
    riddle: freshRiddle(),
    fragments: [...new Set([...done.flatMap((location) => location.fragments), ...doneHere.flatMap((c) => c.fragments)])],
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
