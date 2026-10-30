// Phase "locked" (dark style): a navy screen with a glowing lock. No map, no distance
// (players know the start from the campaign). The Scan button itself is locked
// until the player is at the start: we keep watching their location and use
// checkAtLocation() with the start's radius + maxAccuracy from story.json.
// The deep link /hook/start still runs its own check in game/scans.js.
import { useEffect, useRef, useState } from 'react'
import { Icon, LockIcon } from '../../components/ui/icons.jsx'
import { config } from '../../config.js'
import { useDevOptions } from '../../dev/useDevOptions.js'
import { checkAtLocation, formatDistance, getFakeLocation, subscribeFakeLocation } from '../../lib/location.js'
import { getStart, meta } from '../../lib/story.js'
import { usePosition } from '../../lib/usePosition.js'
import { patterns, vibrate } from '../../lib/vibrate.js'
import { useScanner } from '../ScanProvider.jsx'

const otherLocationProblems = {
  insecure: 'Location only works on a secure (https) page.',
  unsupported: 'This browser can’t share your location.',
  unavailable: 'Can’t find your location. Step outside.',
  timeout: 'Finding your location takes long. Step outside.',
}

/**
 * Should we watch the location right away? Yes if the browser already allowed it
 * (no prompt will appear) or the dev panel's fake location is on. Otherwise we
 * first explain why, and start when the player taps "Allow location".
 */
function useLocationAccess() {
  const [allowed, setAllowed] = useState(() => getFakeLocation().enabled)

  useEffect(() => {
    let cancelled = false
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((status) => {
        if (!cancelled && status.state === 'granted') setAllowed(true)
      })
      .catch(() => {}) // no Permissions API: just ask with the button
    const off = subscribeFakeLocation(() => {
      if (getFakeLocation().enabled) setAllowed(true)
    })
    return () => {
      cancelled = true
      off()
    }
  }, [])

  return [allowed, () => setAllowed(true)]
}

export default function LockedScreen() {
  const { openScanner } = useScanner()
  const { skipLocationCheck } = useDevOptions()
  const [locationAllowed, allowLocation] = useLocationAccess()
  const { position, error, retry } = usePosition({ enabled: locationAllowed })
  const [shaking, setShaking] = useState(false)
  const start = getStart()

  const check = position ? checkAtLocation(start, position) : null
  const unlocked = skipLocationCheck || Boolean(check?.isThere)

  // A small buzz when the button unlocks (Android only)
  const wasUnlocked = useRef(unlocked)
  useEffect(() => {
    if (unlocked && !wasUnlocked.current) vibrate(patterns.found)
    wasUnlocked.current = unlocked
  }, [unlocked])

  const onScan = () => {
    if (unlocked) openScanner()
    else setShaking(true)
  }

  // The line above the Scan button: what's happening, or what the player needs to do
  let helper = <p>The scan unlocks at the {start.name}.</p>
  if (unlocked) {
    helper = <p>You’re at the start – scan the QR</p>
  } else if (!skipLocationCheck) {
    if (!locationAllowed) {
      helper = (
        <>
          <p>We need your location to unlock the game at the start.</p>
          <button type="button" className="locked-link" onClick={allowLocation}>
            Allow location
          </button>
        </>
      )
    } else if (error === 'denied') {
      helper = (
        <>
          <p>Location is blocked. Allow it for this site in your browser settings, then try again.</p>
          <button type="button" className="locked-link" onClick={retry}>
            Allow location
          </button>
        </>
      )
    } else if (error && !position) {
      helper = <p>{otherLocationProblems[error] ?? otherLocationProblems.unavailable}</p>
    } else if (check?.status === 'weak-signal') {
      helper = <p>Waiting for a better GPS signal…</p>
    }
  }

  return (
    <div className="locked-screen theme-dark">
      <div className="locked-hero">
        <div className="locked-glow" aria-hidden="true">
          <span className="locked-glow-burgundy" />
          <span className="locked-glow-olive" />
        </div>
        <LockIcon open={unlocked} className="locked-lock" />
        <h1 className="visually-hidden">{meta.title} – locked</h1>
        <p className="locked-title">Scan the QR to begin</p>

        <div className="start-card">
          <span className="start-card-pin" aria-hidden="true" />
          <div>
            <div className="start-card-name">{start.name}</div>
            <div className="start-card-address">{start.address}</div>
          </div>
        </div>
        {config.showDistanceOnLock && check && <p className="locked-distance">{formatDistance(check.distance)} away</p>}
      </div>

      <div className="locked-bottom">
        <div className="locked-helper" role="status">
          {helper}
        </div>
        <button
          type="button"
          className={`btn btn-block locked-scan ${unlocked ? 'is-unlocked' : 'is-locked'} ${shaking ? 'shake' : ''}`}
          aria-disabled={!unlocked}
          aria-label={unlocked ? 'Scan the QR' : 'Scan – locked until you are at the start'}
          onClick={onScan}
          onAnimationEnd={(e) => e.animationName === 'shake' && setShaking(false)}
        >
          {unlocked ? <Icon name="scan" size={18} strokeWidth={2.4} /> : <LockIcon className="locked-scan-lock" />}
          Scan
        </button>
      </div>
    </div>
  )
}
