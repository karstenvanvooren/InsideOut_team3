// Player progress, saved in localStorage.
//
// Only the raw facts are stored (which hooks were found, whether the finale
// was unlocked). Unlocked chapters and found fragments are derived from
// story.json, so changing the story never leaves saved progress out of sync.
import { getHook, getChapterFragments, meta } from './story.js'

const STORAGE_KEY = 'insideout.progress.v1'
const CHANGE_EVENT = 'insideout:progress'

const emptyProgress = () => ({
  foundHooks: [], // [{ id, at }] in the order they were found
  finaleUnlocked: false,
  finaleAt: null,
})

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyProgress()
    const data = JSON.parse(raw)
    return {
      ...emptyProgress(),
      ...data,
      // Drop hooks that no longer exist in story.json
      foundHooks: Array.isArray(data.foundHooks)
        ? data.foundHooks.filter((h) => h && getHook(h.id))
        : [],
    }
  } catch {
    return emptyProgress()
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // Private mode / storage full: progress just won't persist.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** Marks a hook as found. Returns true if it was new. */
export function markHookFound(hookId) {
  if (!getHook(hookId)) return false
  const progress = loadProgress()
  if (progress.foundHooks.some((h) => h.id === hookId)) return false
  progress.foundHooks.push({ id: hookId, at: new Date().toISOString() })
  saveProgress(progress)
  return true
}

export function unlockFinale() {
  const progress = loadProgress()
  if (progress.finaleUnlocked) return false
  progress.finaleUnlocked = true
  progress.finaleAt = new Date().toISOString()
  saveProgress(progress)
  return true
}

export function resetProgress() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** Everything the UI needs, computed from the stored facts. */
export function deriveProgress(progress) {
  const foundHookIds = progress.foundHooks.map((h) => h.id)
  const unlockedChapters = foundHookIds.map((id) => getHook(id).chapter)
  if (progress.finaleUnlocked) unlockedChapters.push(meta.finaleChapter)

  const uniqueChapters = [...new Set(unlockedChapters)]
  const foundFragments = [
    ...new Set(uniqueChapters.flatMap((id) => getChapterFragments(id).map((f) => f.id))),
  ]

  return {
    foundHooks: foundHookIds,
    unlockedChapters: uniqueChapters,
    foundFragments,
    finaleUnlocked: progress.finaleUnlocked,
    finaleAt: progress.finaleAt,
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
