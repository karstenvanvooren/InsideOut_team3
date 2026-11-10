// The museum ticket: unlocked when you arrive at the last location (the KMSKA),
// before its challenges. Kept per game (startedAt), so a new game gets a new one.
import { safeGet, safeSet } from './storage.js'

const KEY = 'insideout.ticket.v1'

/** A short code to show at the desk, the same for the whole game: IO-XXXX-XX */
export function ticketCode(startedAt) {
  const n = Math.abs(Math.floor((startedAt ?? 0) / 1000)) % 36 ** 6
  const s = n.toString(36).toUpperCase().padStart(6, '0')
  return `IO-${s.slice(0, 4)}-${s.slice(4)}`
}

/** The ticket of this game, or null if it isn't unlocked yet. */
export function getTicket(startedAt) {
  const t = safeGet(KEY)
  return t && t.startedAt === startedAt ? t : null
}

export function unlockTicket(startedAt) {
  const t = getTicket(startedAt) ?? { startedAt, at: Date.now(), code: ticketCode(startedAt) }
  safeSet(KEY, t)
  return t
}
