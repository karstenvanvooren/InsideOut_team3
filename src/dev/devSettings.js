// Is the dev panel visible?
// Always in `npm run dev`. On a deployed site: open any page with ?dev=1
// (remembered on this device) and ?dev=0 to turn it off again.
import { safeGet, safeRemove, safeSet } from '../lib/storage.js'

const DEV_KEY = 'insideout.dev'

export function readDevFlagFromUrl(search) {
  const value = new URLSearchParams(search).get('dev')
  if (value === '1') safeSet(DEV_KEY, true)
  if (value === '0') safeRemove(DEV_KEY)
}

export function isDevEnabled() {
  return import.meta.env.DEV || safeGet(DEV_KEY) === true
}
