// Haptic feedback when the browser supports it (Android Chrome).
// iPhone Safari has no navigator.vibrate, so never rely on this.
export const patterns = {
  found: [60, 40, 60],
  unlock: [100, 60, 100, 60, 200],
  tap: 20,
  wrong: [30, 50, 30],
  stamp: [80],
}

export function vibrate(pattern = patterns.tap) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern)
    }
  } catch {
    // ignore
  }
}
