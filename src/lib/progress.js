// Player progress, saved in localStorage.
//
// Per hook we store the raw facts: when it was scanned, when the location was
// verified, how many wrong answers were given and when the challenge was
// completed. Unlocked chapters and found fragments are derived from
// story.json, and only count once a hook's challenge is completed.
// The riddle a hook gives for the next location is tracked on that same hook.
import { getChapterFragments, getHook, getHookStatus, isFinaleAvailable, meta } from './story.js'
import { safeGet, safeRemove, safeSet } from './storage.js'

const STORAGE_KEY = 'insideout.progress.v2'
const CHANGE_EVENT = 'insideout:progress'

const emptyProgress = () => ({
  // { h01: { scannedAt, locationVerifiedAt, wrongAnswers, completedAt,
  //          riddleWrongAnswers, riddleSolvedAt, riddleRevealed } }
  hooks: {},
  tutorialSeenAt: null,
  finaleUnlocked: false,
  finaleAt: null,
})

export function loadProgress() {
  const data = safeGet(STORAGE_KEY)
  if (!data || typeof data !== 'object') return emptyProgress()
  // Drop hooks that no longer exist in story.json
  const hooks = Object.fromEntries(
    Object.entries(data.hooks ?? {}).filter(([id, value]) => getHook(id) && value && typeof value === 'object'),
  )
  return { ...emptyProgress(), ...data, hooks }
}

function save(progress) {
  safeSet(STORAGE_KEY, progress)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function updateHook(hookId, update) {
  if (!getHook(hookId)) return null
  const progress = loadProgress()
  const current = progress.hooks[hookId] ?? { wrongAnswers: 0 }
  progress.hooks[hookId] = { ...current, ...update(current) }
  save(progress)
  return progress.hooks[hookId]
}

const now = () => new Date().toISOString()

export const markHookScanned = (hookId) => updateHook(hookId, (h) => ({ scannedAt: h.scannedAt ?? now() }))

export const markLocationVerified = (hookId) =>
  updateHook(hookId, (h) => ({ locationVerifiedAt: h.locationVerifiedAt ?? now() }))

export const recordWrongAnswer = (hookId) => updateHook(hookId, (h) => ({ wrongAnswers: (h.wrongAnswers ?? 0) + 1 }))

/** Marks the challenge as done. Returns true if it was newly completed. */
export function completeHook(hookId) {
  const before = loadProgress().hooks[hookId]
  if (before?.completedAt) return false
  updateHook(hookId, (h) => ({ completedAt: now(), scannedAt: h.scannedAt ?? now() }))
  return true
}

export const recordRiddleWrongAnswer = (hookId) =>
  updateHook(hookId, (h) => ({ riddleWrongAnswers: (h.riddleWrongAnswers ?? 0) + 1 }))

/** Marks a hook's riddle as solved (revealed = the player used "Show the answer"). */
export const solveRiddle = (hookId, { revealed = false } = {}) =>
  updateHook(hookId, (h) => ({
    riddleSolvedAt: h.riddleSolvedAt ?? now(),
    riddleRevealed: Boolean(h.riddleRevealed || revealed),
  }))

export function markTutorialSeen() {
  const progress = loadProgress()
  if (progress.tutorialSeenAt) return
  progress.tutorialSeenAt = now()
  save(progress)
}

export function unlockFinale() {
  const progress = loadProgress()
  if (progress.finaleUnlocked) return false
  progress.finaleUnlocked = true
  progress.finaleAt = now()
  save(progress)
  return true
}

export function resetProgress() {
  safeRemove(STORAGE_KEY)
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** Everything the UI needs, computed from the stored facts. */
export function deriveProgress(progress) {
  const entries = Object.entries(progress.hooks)
  const scannedHooks = entries.filter(([, h]) => h.scannedAt).map(([id]) => id)
  const completedHooks = entries
    .filter(([, h]) => h.completedAt)
    .sort(([, a], [, b]) => a.completedAt.localeCompare(b.completedAt))
    .map(([id]) => id)

  const unlockedChapters = completedHooks.map((id) => getHook(id).chapter).filter(Boolean) // the start hook has none
  if (progress.finaleUnlocked) unlockedChapters.push(meta.finaleChapter)
  const uniqueChapters = [...new Set(unlockedChapters)]

  const foundFragments = [
    ...new Set(uniqueChapters.flatMap((id) => getChapterFragments(id).map((f) => f.id))),
  ]

  return {
    hookProgress: progress.hooks,
    scannedHooks,
    completedHooks,
    unlockedChapters: uniqueChapters,
    foundFragments,
    finaleAvailable: isFinaleAvailable(completedHooks),
    finaleUnlocked: progress.finaleUnlocked,
    finaleAt: progress.finaleAt,
    tutorialSeen: Boolean(progress.tutorialSeenAt),
    isRiddleSolved: (id) => Boolean(progress.hooks[id]?.riddleSolvedAt),
    hookStatus: (id) => getHookStatus(id, completedHooks),
  }
}

export function subscribe(callback) {
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
