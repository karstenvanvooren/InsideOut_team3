// Is the dev panel visible? Only after opening any page with ?dev=1
// (remembered on this device); ?dev=0 turns it off again. Never on by default,
// not even in `npm run dev`.
import { safeGet, safeRemove, safeSet } from '../lib/storage.js'

const DEV_KEY = 'insideout.dev'
const OPTIONS_KEY = 'insideout.devOptions'
const CHANGE_EVENT = 'insideout:dev'

const ON_VALUES = ['', '1', 'true', 'on', 'yes']
const OFF_VALUES = ['0', 'false', 'off', 'no']

/** ?dev, ?dev=1, ?dev=true or #dev turn dev mode on; ?dev=0 / #nodev turn it off. */
export function readDevFlagFromUrl(search, hash = '') {
  const params = new URLSearchParams(search)
  if (params.has('dev')) {
    const value = (params.get('dev') ?? '').toLowerCase()
    if (ON_VALUES.includes(value)) safeSet(DEV_KEY, true)
    if (OFF_VALUES.includes(value)) safeRemove(DEV_KEY)
  }
  const h = hash.replace(/^#/, '').toLowerCase()
  if (h === 'dev') safeSet(DEV_KEY, true)
  if (h === 'nodev') safeRemove(DEV_KEY)
}

export function isDevEnabled() {
  return safeGet(DEV_KEY) === true
}

/** Secret gesture (5 quick taps in the top-left corner): switch dev mode on/off. */
export function toggleDevEnabled() {
  if (isDevEnabled()) safeRemove(DEV_KEY)
  else safeSet(DEV_KEY, true)
  return isDevEnabled()
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
