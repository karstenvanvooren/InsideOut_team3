import { useCallback, useEffect, useState } from 'react'
import { watchPosition } from './location.js'

/**
 * Live position from GPS, or from the dev panel's fake location.
 * const { position, error, retry } = usePosition()
 * error: null | 'insecure' | 'unsupported' | 'denied' | 'unavailable' | 'timeout'
 * enabled: false = don't watch (yet), e.g. until the player tapped "Allow location".
 */
export function usePosition({ enabled = true } = {}) {
  const [state, setState] = useState({ position: null, error: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!enabled) return
    return watchPosition(
      (position) => setState({ position, error: null }),
      // A slow or lost fix keeps the last known position; no permission clears it
      (error) =>
        setState((s) => ({
          position: ['timeout', 'unavailable'].includes(error.code) ? s.position : null,
          error: error.code,
        })),
    )
  }, [attempt, enabled])

  /** Ask again (e.g. after the player allowed location in their settings). */
  const retry = useCallback(() => {
    setState((s) => ({ ...s, error: null }))
    setAttempt((n) => n + 1)
  }, [])

  return { ...state, retry }
}
