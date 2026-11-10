// Real or fake? The first choice at the last challenge (KMSKA) is the one that
// counts for your score: "you spotted 4 of 6 fakes". Kept per game (startedAt).
import { safeGet, safeSet } from './storage.js'

const KEY = 'insideout.realfake.v1'

/** Only the first try is kept. selected = what the player picked as real. */
export function recordFirstChoice(startedAt, selected, fakeIds) {
  if (getFirstChoice(startedAt)) return
  safeSet(KEY, { startedAt, at: Date.now(), selected, fakeIds })
}

export function getFirstChoice(startedAt) {
  const r = safeGet(KEY)
  return r && r.startedAt === startedAt ? r : null
}

/** { spotted, total, fooledBy: [ids] }: fakes you didn't pick as real on your first try */
export function fakeScore(startedAt, ownedFakeIds) {
  const r = getFirstChoice(startedAt)
  const fooledBy = r ? ownedFakeIds.filter((id) => r.selected.includes(id)) : []
  return { spotted: ownedFakeIds.length - fooledBy.length, total: ownedFakeIds.length, fooledBy }
}
