// The café voucher: the bonus for the hooks. Find enough chapters of her story
// (story.json → rewards.hooksForVoucher) and coffee & cake are on us.
// Kept per game (startedAt), like the ticket.
import story from '../data/story.json'
import { safeGet, safeSet } from './storage.js'

const KEY = 'insideout.voucher.v1'

export const hooksForVoucher = () => story.rewards?.hooksForVoucher ?? 6
export const voucherPlace = () => story.rewards?.voucherPlace ?? 'the museum café'

/** A short code to show at the counter, the same for the whole game: CC-XXXX-XX */
export function voucherCode(startedAt) {
  const n = (Math.abs(Math.floor((startedAt ?? 0) / 1000)) * 7 + 12345) % 36 ** 6
  const s = n.toString(36).toUpperCase().padStart(6, '0')
  return `CC-${s.slice(0, 4)}-${s.slice(4)}`
}

/** The voucher of this game, or null if it isn't unlocked yet. */
export function getVoucher(startedAt) {
  const v = safeGet(KEY)
  return v && v.startedAt === startedAt ? v : null
}

export function unlockVoucher(startedAt) {
  const v = getVoucher(startedAt) ?? { startedAt, at: Date.now(), code: voucherCode(startedAt) }
  safeSet(KEY, v)
  return v
}
