// Read-only helpers around story.json.
// Pages should use these instead of reading the JSON directly.
import story from '../data/story.json'

const byId = (list) => Object.fromEntries(list.map((item) => [item.id, item]))

const hooksById = byId(story.hooks)
const chaptersById = byId(story.chapters)
const fragmentsById = byId(story.fragments)

export const meta = story.meta

export const getHooks = () => story.hooks
export const getChapters = () => story.chapters
export const getFragments = () => story.fragments

export const getHook = (id) => hooksById[id] ?? null
export const getChapter = (id) => chaptersById[id] ?? null
export const getFragment = (id) => fragmentsById[id] ?? null

export const getFinaleChapter = () => getChapter(story.meta.finaleChapter)

/** Hook ids that must be completed before the museum finale opens. */
export const getFinaleRequires = () => story.meta.finaleRequires ?? story.hooks.map((h) => h.id)

/** Fragment objects of a chapter, in order (unknown ids are skipped). */
export const getChapterFragments = (chapterId) =>
  (getChapter(chapterId)?.fragments ?? []).map(getFragment).filter(Boolean)

/** Hook objects a chapter tells you to look for next. */
export const getNextHooks = (chapterId) =>
  (getChapter(chapterId)?.nextHooks ?? []).map(getHook).filter(Boolean)

/** The hook that opens a chapter (null for the finale). */
export const getHookForChapter = (chapterId) =>
  story.hooks.find((hook) => hook.chapter === chapterId) ?? null

export const totalFragments = () => story.fragments.length

/**
 * 'completed' | 'open' | 'locked' for a hook, given the ids of completed hooks.
 * A hook is open when every hook in its "requires" list is completed.
 */
export function getHookStatus(hookId, completedHooks) {
  const hook = getHook(hookId)
  if (!hook) return null
  if (completedHooks.includes(hookId)) return 'completed'
  const requires = hook.requires ?? []
  return requires.every((id) => completedHooks.includes(id)) ? 'open' : 'locked'
}

export const isFinaleAvailable = (completedHooks) =>
  getFinaleRequires().every((id) => completedHooks.includes(id))
