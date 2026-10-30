// Is the dev panel visible? Only after opening any page with ?dev=1
// (remembered on this device); ?dev=0 turns it off again. Never on by default,
// not even in `npm run dev`.
import { safeGet, safeRemove, safeSet } from '../lib/storage.js'

const DEV_KEY = 'insideout.dev'
const OPTIONS_KEY = 'insideout.devOptions'
const CHANGE_EVENT = 'insideout:dev'

export function readDevFlagFromUrl(search) {
  const value = new URLSearchParams(search).get('dev')
  if (value === '1') safeSet(DEV_KEY, true)
  if (value === '0') safeRemove(DEV_KEY)
}

export function isDevEnabled() {
  return safeGet(DEV_KEY) === true
}

// ---------- Dev options (only count while dev mode is on) ----------

const defaultOptions = () => ({ skipLocationCheck: false })

export function getDevOptions() {
  return { ...defaultOptions(), ...(safeGet(OPTIONS_KEY) ?? {}) }
}

export function setDevOptions(changes) {
  safeSet(OPTIONS_KEY, { ...getDevOptions(), ...changes })
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function subscribeDevOptions(callback) {
  window.addEventListener(CHANGE_EVENT, callback)
  return () => window.removeEventListener(CHANGE_EVENT, callback)
}

/** "Skip location check": every location counts as reached. Ignored without ?dev=1. */
export const isLocationCheckSkipped = () => isDevEnabled() && getDevOptions().skipLocationCheck

/** Dev panel → main screen: hide every open pop-up (they come back as a pill). */
export const CLOSE_POPUPS_EVENT = 'insideout:close-popups'
