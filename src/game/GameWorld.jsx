// The game world: the map that stays on screen for the whole game (after the
// start), with the route, the turn-by-turn banner and the info strip while
// navigating. Pop-ups (riddle, challenge, ...) are drawn on top by MainScreen.
// Loaded lazily (MapLibre is big).
import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon as UiIcon } from '../components/ui/icons.jsx'
import { useDevOptions } from '../dev/useDevOptions.js'
import { checkAtLocation, distanceMeters, formatDistance } from '../lib/location.js'
import {
  bearing,
  instructionFor,
  lineFrom,
  maneuverIcon,
  measureLine,
  projectOnLine,
  stepPositions,
} from '../lib/navigation.js'
import { fetchWalkingRoute, formatWalkingTime, publishRoute, straightRoute } from '../lib/route.js'
import { useHeading } from '../lib/useHeading.js'
import { usePosition } from '../lib/usePosition.js'
import GameMap from '../map/GameMap.jsx'
import { useGameScreen } from '../map/useGameScreen.js'

const OFF_ROUTE = 25 // meters from the line before re-routing
const FALLBACK_RETRY = 30 // meters moved before retrying a failed route request
const MIN_REQUEST_GAP = 4000 // ms between route requests
const ADVANCE_WITHIN = 15 // meters from a maneuver before showing the next one

const errorText = {
  insecure: 'Your location only works on a secure (https) page.',
  unsupported: 'This browser can’t share your location.',
  denied: 'Location access is blocked. Allow location for this site in your browser settings and reload.',
  unavailable: 'We can’t find your location right now. Step away from tall buildings and keep walking.',
  timeout: 'Finding your location is taking long. Keep walking.',
}

// ---------- Data hooks ----------

/**
 * Walking route with steps. Fetched once, then only again when the player is
 * more than 25 m off the line (or has moved 30 m since a failed request).
 */
function useWalkingRoute(position, destination, enabled) {
  const [route, setRoute] = useState(null)
  const requestRef = useRef({ controller: null, from: null, at: 0 })

  // A new destination (next location) starts with a fresh route
  useEffect(() => {
    requestRef.current.controller?.abort()
    requestRef.current = { controller: null, from: null, at: 0 }
    setRoute(null)
  }, [destination])

  useEffect(() => {
    if (!enabled || !position || !destination) return
    const request = requestRef.current
    if (request.controller) return // one at a time

    let needed = !request.from
    if (route && !route.fallback) needed = projectOnLine(route.line, position).offset > OFF_ROUTE
    if (route?.fallback) needed = distanceMeters(request.from, position) > FALLBACK_RETRY
    if (!needed || (request.from && Date.now() - request.at < MIN_REQUEST_GAP)) return

    const controller = new AbortController()
    Object.assign(request, { controller, from: { lat: position.lat, lng: position.lng }, at: Date.now() })
    fetchWalkingRoute(position, destination, controller.signal)
      .then((result) => {
        const line = measureLine(result.coords)
        setRoute({ ...result, line, stepAlong: stepPositions(line, result.steps) })
      })
      .catch(() => !controller.signal.aborted && setRoute({ fallback: true }))
      .finally(() => {
        if (request.controller === controller) request.controller = null
      })
  }, [position, destination, enabled, route])

  useEffect(() => () => requestRef.current.controller?.abort(), [])
  return route
}

/** Where are we on the route? Next maneuver and what's left. */
function useProgressOnRoute(route, position, destination) {
  return useMemo(() => {
    if (!route || !position || !destination) return null
    if (route.fallback) {
      const straight = straightRoute(position, destination)
      return {
        fallback: true,
        coords: straight.coords,
        trail: straight.coords,
        remaining: straight.distance,
        remainingTime: straight.duration,
      }
    }
    const { along } = projectOnLine(route.line, position)
    const remaining = Math.max(0, route.line.length - along)
    const remainingTime = route.line.length ? route.duration * (remaining / route.line.length) : 0
    let index = route.steps.findIndex((_, i) => i > 0 && route.stepAlong[i] - along > ADVANCE_WITHIN)
    if (index === -1) index = route.steps.length - 1 // only "arrive" is left
    return {
      fallback: false,
      coords: route.coords, // the whole route (the dev panel's walk follows it)
      trail: lineFrom(route.line, along), // only what's left to walk, drawn on the map
      remaining,
      remainingTime,
      step: route.steps[index],
      stepDistance: Math.max(0, route.stepAlong[index] - along),
    }
  }, [route, position, destination])
}

// ---------- Small UI pieces ----------

const iconPaths = {
  straight: 'M12 20V5M6 11l6-6 6 6',
  right: 'M7 20v-6a5 5 0 0 1 5-5h7M15 5l4 4-4 4',
  left: 'M17 20v-6a5 5 0 0 0-5-5H5M9 5 5 9l4 4',
  'slight-right': 'M9 20v-6c0-2.5 1-4.5 3-6.5L17 3M11 3h6v6',
  'slight-left': 'M15 20v-6c0-2.5-1-4.5-3-6.5L7 3M13 3H7v6',
  'sharp-right': 'M7 20V6l10 10M17 9v7h-7',
  'sharp-left': 'M17 20V6L7 16M7 9v7h7',
  uturn: 'M8 20V9a4 4 0 0 1 8 0v7M12 12l4 4 4-4',
  arrive: 'M6 21V4M6 4h11l-2.5 4L17 12H6',
}

function Icon({ name, rotate = 0, className = '' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined}
      aria-hidden="true"
    >
      <path d={iconPaths[name] ?? iconPaths.straight} />
    </svg>
  )
}

/** "40 m" → rounded so it doesn't flicker every meter. */
function formatStepDistance(m) {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`
  if (m >= 100) return `${Math.round(m / 10) * 10} m`
  return `${Math.max(0, Math.round(m / 5) * 5)} m`
}

// ---------- The game world ----------

/**
 * The map under every pop-up, from the hooks intro until the finale.
 * destination: the location to show (beacon), or null while its riddle isn't solved.
 * mode: 'free' (just the player), 'navigating' (route + banner + info strip) or 'arrived'.
 * onArrive(): in 'navigating', called once the player is inside the destination's radius.
 * onShowRiddle(): the "?" in the info strip (the solved riddle, read-only).
 * center: where to look before the first position fix. markers: see GameMap.
 * The game's bottom nav sits under the map.
 */
export default function GameWorld({ destination = null, mode = 'free', onArrive, onShowRiddle, markers = null, center }) {
  const { position, error } = usePosition()
  const { heading, compass, requestCompass } = useHeading(position)
  const { skipLocationCheck } = useDevOptions()
  const navigating = mode === 'navigating' && Boolean(destination)
  const check = navigating && position ? checkAtLocation(destination, position) : null
  const arrived = navigating && (skipLocationCheck || Boolean(check?.isThere))
  const route = useWalkingRoute(position, destination, navigating && !arrived)
  const nav = useProgressOnRoute(navigating ? route : null, position, destination)
  const [following, setFollowing] = useState(true)
  const { screenRef, topRef, overlayRefs } = useGameScreen()

  // No compass and not walked yet: face the destination (if there is one)
  const effectiveHeading = heading ?? (position && destination ? bearing(position, destination) : null)

  // Let the dev panel's "Simulate walk" follow the line on screen
  useEffect(() => {
    publishRoute(nav && !arrived ? nav.coords : null)
  }, [nav, arrived])
  useEffect(() => () => publishRoute(null), [])

  // Arriving is only location-based: no QR at the locations
  const onArriveRef = useRef(onArrive)
  onArriveRef.current = onArrive
  useEffect(() => {
    if (arrived) onArriveRef.current?.()
  }, [arrived])

  // The top card: the next turn ("in 30 m" / instruction), or a status while there's no route yet
  let turn = null
  if (mode === 'arrived' && destination) {
    turn = { icon: 'arrive', title: `You’ve arrived at ${destination.name}!` }
  } else if (navigating && (!position || !nav)) {
    turn = {
      icon: 'straight',
      title: !position && !error ? 'Finding your location…' : position ? 'Plotting your trail…' : `Head towards ${destination.name}`,
    }
  } else if (navigating && nav.fallback) {
    const direction = following ? bearing(position, destination) - (effectiveHeading ?? 0) : 0
    turn = { icon: 'straight', rotate: direction, sub: formatStepDistance(nav.remaining), title: `Head towards ${destination.name}` }
  } else if (navigating) {
    turn = { icon: maneuverIcon(nav.step), sub: `in ${formatStepDistance(nav.stepDistance)}`, title: instructionFor(nav.step, destination.name) }
  }

  const notes = [
    error && !position && (errorText[error] ?? errorText.unavailable),
    navigating && route?.fallback && position && 'Couldn’t plot the streets. Follow the trail straight to the beacon.',
    position?.fake && 'Dev: fake location',
  ].filter(Boolean)

  return (
    <div ref={screenRef} className="nav">
      <GameMap
        destination={destination}
        center={center}
        position={position}
        heading={effectiveHeading}
        trail={nav && !arrived ? nav.trail : null}
        arrived={mode === 'arrived' || arrived}
        markers={markers}
        following={following}
        onUserMove={() => setFollowing(false)}
        overlayRefs={overlayRefs}
      />

      <div ref={topRef} className="nav-top">
        {(turn || notes.length > 0) && (
          <div className={`nav-card ${turn ? '' : 'is-note'}`} role="status">
            {turn && (
              <div className="nav-card-turn">
                <span className="nav-turn-icon">
                  <Icon name={turn.icon} rotate={turn.rotate} />
                </span>
                <div className="nav-card-text">
                  {turn.sub && <div className="nav-card-sub">{turn.sub}</div>}
                  <div className="nav-card-title">{turn.title}</div>
                </div>
              </div>
            )}

            {/* While navigating: time · distance · destination, and "?" for the riddle */}
            {navigating && (
              <div className="nav-card-info">
                <span className="nav-card-info-text">
                  {nav && `${formatWalkingTime(nav.remainingTime)} · ${formatDistance(nav.remaining)} · `}
                  {destination.name}
                </span>
                {onShowRiddle && (
                  <button type="button" className="nav-help" onClick={onShowRiddle} aria-label="Show the riddle again">
                    ?
                  </button>
                )}
              </div>
            )}
            {notes.map((note) => (
              <div key={note} className="nav-card-note">
                {note}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="nav-floating">
        {compass === 'needs-permission' ? (
          <button type="button" className="nav-chip" onClick={requestCompass}>
            Use compass
          </button>
        ) : (
          <span />
        )}
        {!following && position && (
          <button type="button" className="nav-locate" onClick={() => setFollowing(true)} aria-label="Recenter on my position">
            <UiIcon name="locate" size={22} />
          </button>
        )}
      </div>
    </div>
  )
}
