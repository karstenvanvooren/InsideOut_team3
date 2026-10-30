import { useEffect, useRef, useState } from 'react'
import { distanceMeters, getFakeLocation, subscribeFakeLocation } from './location.js'
import { angleDiff, bearing } from './navigation.js'

const MIN_MOVE = 3 // meters walked before the walking direction counts as a heading
const COMPASS_INTERVAL = 200 // ms between compass updates (the sensor fires ~60×/s)

// iPhone Safari only shares the compass after a tap + permission prompt
const compassNeedsPermission = () =>
  typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function'

/**
 * Which way is the player facing? 0–360 (0 = north) or null.
 * Order: dev panel's fake heading → real compass → direction of the last GPS movement.
 * Returns { heading, source, compass: 'on' | 'needs-permission' | 'granted' | 'denied' | 'none', requestCompass }.
 */
export function useHeading(position) {
  const [fakeHeading, setFakeHeading] = useState(() => getFakeLocation().heading)
  const [compassHeading, setCompassHeading] = useState(null)
  // 'none' (no reading yet) | 'granted' (allowed, waiting for a reading) | 'on' | 'denied'
  const [compassState, setCompassState] = useState('none')
  const [listenKey, setListenKey] = useState(0) // bumped after permission, to listen again
  const [moveHeading, setMoveHeading] = useState(null)
  const anchorRef = useRef(null)

  useEffect(() => subscribeFakeLocation(() => setFakeHeading(getFakeLocation().heading)), [])

  // Walking direction from the last two positions that are > 3 m apart
  useEffect(() => {
    if (!position) return
    const anchor = anchorRef.current
    if (!anchor) {
      anchorRef.current = position
    } else if (distanceMeters(anchor, position) > MIN_MOVE) {
      setMoveHeading(bearing(anchor, position))
      anchorRef.current = position
    }
  }, [position])

  // Real compass. Listens right away (Android); an iPhone only sends readings after requestCompass().
  const denied = compassState === 'denied'
  useEffect(() => {
    if (denied) return
    let lastAt = 0
    let lastValue = null
    const onOrientation = (e) => {
      let heading = null
      if (typeof e.webkitCompassHeading === 'number') heading = e.webkitCompassHeading // iPhone
      else if (e.absolute && typeof e.alpha === 'number') heading = 360 - e.alpha // Android
      if (heading === null) return
      const screenAngle = window.screen?.orientation?.angle ?? window.orientation ?? 0
      heading = (heading + screenAngle + 360) % 360
      const now = performance.now()
      if (now - lastAt < COMPASS_INTERVAL) return
      if (lastValue !== null && angleDiff(heading, lastValue) < 2) return
      lastAt = now
      lastValue = heading
      setCompassHeading(heading)
      setCompassState('on')
    }
    const eventName = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation'
    window.addEventListener(eventName, onOrientation)
    return () => window.removeEventListener(eventName, onOrientation)
  }, [denied, listenKey])

  /** Must be called from a tap (iPhone). */
  const requestCompass = async () => {
    try {
      const result = await DeviceOrientationEvent.requestPermission()
      if (result !== 'granted') return setCompassState('denied')
      setCompassState((s) => (s === 'on' ? s : 'granted'))
      setListenKey((k) => k + 1)
    } catch {
      setCompassState('denied')
    }
  }

  // Only offer the "Use compass" button where a permission exists and no reading came in
  const compass = compassState === 'none' && compassNeedsPermission() ? 'needs-permission' : compassState

  if (fakeHeading !== null && fakeHeading !== undefined) {
    return { heading: fakeHeading, source: 'fake', compass, requestCompass }
  }
  if (compassHeading !== null) return { heading: compassHeading, source: 'compass', compass, requestCompass }
  return { heading: moveHeading, source: moveHeading === null ? null : 'movement', compass, requestCompass }
}
