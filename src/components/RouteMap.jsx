// Full-screen game map to the next location: a clean 3D world that follows the
// player and turns with their heading, a glowing trail to a beacon, a short
// turn-by-turn banner and a bottom sheet. Players never leave the app.
// Loaded lazily (MapLibre is big), so it only downloads once a riddle is solved.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { checkAtHook, distanceMeters, formatDistance, watchPosition } from '../lib/location.js'
import { MAP_THEME, buildMapStyle } from '../lib/mapTheme.js'
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

const FOLLOW_ZOOM = 18.6
const FOLLOW_PITCH = 60
const EASE_MS = 500

const OFF_ROUTE = 25 // meters from the line before re-routing
const FALLBACK_RETRY = 30 // meters moved before retrying a failed route request
const MIN_REQUEST_GAP = 4000 // ms between route requests
const ADVANCE_WITHIN = 15 // meters from a maneuver before showing the next one

const BEACON_HEIGHT = 70 // m, sticks out above Antwerp's roofs
const BEACON_LABEL_WITHIN = 250 // m: show the location name when this close

const errorText = {
  insecure: 'Your location only works on a secure (https) page.',
  unsupported: 'This browser can’t share your location.',
  denied: 'Location access is blocked. Allow location for this site in your browser settings and reload.',
  unavailable: 'We can’t find your location right now. Step away from tall buildings and keep walking.',
  timeout: 'Finding your location is taking long. Keep walking.',
}

// ---------- Data hooks ----------

/** Live position from GPS, or from the dev panel's fake location. */
function usePosition() {
  const [state, setState] = useState({ position: null, error: null })
  useEffect(
    () =>
      watchPosition(
        (position) => setState({ position, error: null }),
        // A slow or lost fix keeps the last known position; no permission clears it
        (error) =>
          setState((s) => ({
            position: ['timeout', 'unavailable'].includes(error.code) ? s.position : null,
            error: error.code,
          })),
      ),
    [],
  )
  return state
}

/**
 * Walking route with steps. Fetched once, then only again when the player is
 * more than 25 m off the line (or has moved 30 m since a failed request).
 */
function useWalkingRoute(position, destination, enabled) {
  const [route, setRoute] = useState(null)
  const requestRef = useRef({ controller: null, from: null, at: 0 })

  useEffect(() => {
    if (!enabled || !position) return
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

/** Where are we on the route? Next maneuver, the one after, and what's left. */
function useProgressOnRoute(route, position, destination) {
  return useMemo(() => {
    if (!route || !position) return null
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
      nextStep: route.steps[index + 1] ?? null,
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

const thenArrow = { left: '↰', 'slight-left': '↖', 'sharp-left': '↰', right: '↱', 'slight-right': '↗', 'sharp-right': '↱', uturn: '↶', arrive: '⚑', straight: '↑' }

/** "40 m" → rounded so it doesn't flicker every meter. */
function formatStepDistance(m) {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`
  if (m >= 100) return `${Math.round(m / 10) * 10} m`
  return `${Math.max(0, Math.round(m / 5) * 5)} m`
}

// ---------- Map pieces ----------

const empty = { type: 'FeatureCollection', features: [] }

const lineData = (coords) => ({
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates: coords.map(([lat, lng]) => [lng, lat]) },
})

/** A circle on the ground as a polygon (for the beacon pillar and its zone). */
function circleData(center, radius, points = 48) {
  const ring = []
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * 2 * Math.PI
    const dLat = ((radius * Math.sin(a)) / 6371000) * (180 / Math.PI)
    const dLng = ((radius * Math.cos(a)) / (6371000 * Math.cos((center.lat * Math.PI) / 180))) * (180 / Math.PI)
    ring.push([center.lng + dLng, center.lat + dLat])
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } }
}

// Forward-moving dashes: MapLibre's "animate a line" technique
const DASHES = [
  [0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0],
  [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5],
]

function addGameLayers(map, destination) {
  const t = MAP_THEME
  // Beacon: a zone on the ground + a glowing purple pillar
  map.addSource('beacon-zone', { type: 'geojson', data: circleData(destination, destination.radius ?? 50) })
  map.addSource('beacon-glow', { type: 'geojson', data: circleData(destination, 11) })
  map.addSource('beacon-core', { type: 'geojson', data: circleData(destination, 4) })
  map.addLayer({ id: 'beacon-zone', type: 'fill', source: 'beacon-zone', paint: { 'fill-color': t.accent, 'fill-opacity': 0.12 } })
  map.addLayer({
    id: 'beacon-zone-edge',
    type: 'line',
    source: 'beacon-zone',
    paint: { 'line-color': t.accent, 'line-width': 2, 'line-opacity': 0.55, 'line-dasharray': [2, 2] },
  })

  // Trail: soft glow + solid core + white dashes moving towards the beacon
  map.addSource('route', { type: 'geojson', data: empty })
  const round = { 'line-cap': 'round', 'line-join': 'round' }
  map.addLayer({
    id: 'route-glow',
    type: 'line',
    source: 'route',
    layout: round,
    paint: { 'line-color': t.accentGlow, 'line-width': 26, 'line-blur': 12, 'line-opacity': 0.7 },
  })
  map.addLayer({ id: 'route-core', type: 'line', source: 'route', layout: round, paint: { 'line-color': t.accent, 'line-width': 10 } })
  map.addLayer({
    id: 'route-dash',
    type: 'line',
    source: 'route',
    paint: { 'line-color': '#ffffff', 'line-width': 4, 'line-opacity': 0.9, 'line-dasharray': DASHES[0] },
  })

  // Pillar last, so it's drawn in 3D together with the buildings
  map.addLayer({
    id: 'beacon-glow',
    type: 'fill-extrusion',
    source: 'beacon-glow',
    paint: { 'fill-extrusion-color': t.accentGlow, 'fill-extrusion-height': BEACON_HEIGHT, 'fill-extrusion-opacity': 0.3 },
  })
  map.addLayer({
    id: 'beacon-core',
    type: 'fill-extrusion',
    source: 'beacon-core',
    paint: { 'fill-extrusion-color': t.accent, 'fill-extrusion-height': BEACON_HEIGHT, 'fill-extrusion-opacity': 0.9 },
  })
}

function playerGroundElement() {
  const el = document.createElement('div')
  el.className = 'game-player'
  el.innerHTML = `
    <span class="game-player-ring"></span>
    <svg class="game-player-cone" viewBox="0 0 100 100" aria-hidden="true">
      <defs><linearGradient id="cone" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0.5" stop-color="${MAP_THEME.accent}" stop-opacity="0.75"/>
        <stop offset="1" stop-color="${MAP_THEME.accent}" stop-opacity="0"/>
      </linearGradient></defs>
      <path d="M50 50 L22 2 Q50 -6 78 2 Z" fill="url(#cone)"/>
    </svg>
    <span class="game-player-dot"></span>`
  return el
}

function playerAvatarElement() {
  const el = document.createElement('div')
  el.className = 'game-avatar'
  el.innerHTML = `<svg viewBox="0 0 32 44" aria-hidden="true">
      <circle cx="16" cy="10" r="7.5" fill="${MAP_THEME.accent}" stroke="#fff" stroke-width="2.5"/>
      <path d="M4 38c0-8 5-15 12-15s12 7 12 15z" fill="${MAP_THEME.accent}" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>
    </svg>`
  return el
}

function beaconLabelElement(name) {
  const el = document.createElement('div')
  el.className = 'game-beacon-label'
  el.textContent = name
  return el
}

/** Camera padding that puts the player in the lower part of the screen. */
const followPadding = (map) => {
  const h = map.getContainer().clientHeight
  return { top: Math.round(h * 0.42), bottom: Math.round(h * 0.14), left: 0, right: 0 }
}

/**
 * The MapLibre map plus the off-screen pointer.
 * overlayRefs: { top, sheet } — the banner and bottom sheet, so the pointer stays clear of them.
 */
function GameMap({ destination, position, heading, nav, arrived, following, onUserMove, overlayRefs }) {
  const wrapRef = useRef(null)
  const elRef = useRef(null)
  const pointerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef({})
  const [ready, setReady] = useState(false)
  const [mapProblem, setMapProblem] = useState(false)
  const live = useRef({}) // latest props for event handlers and the animation loop
  live.current = { position, arrived, onUserMove }
  const wasFollowingRef = useRef(false)

  useEffect(() => {
    const map = new maplibregl.Map({
      container: elRef.current,
      style: buildMapStyle(),
      center: [destination.lng, destination.lat],
      zoom: 17,
      pitch: FOLLOW_PITCH,
      maxPitch: 70,
      attributionControl: { compact: true },
    })
    mapRef.current = map

    map.on('load', () => {
      addGameLayers(map, destination)
      // Credits start folded into the small (i) button
      map.getContainer().querySelector('.maplibregl-compact-show')?.classList.remove('maplibregl-compact-show')
      setReady(true)
    })
    map.on('error', (e) => {
      // Style or tiles didn't load: say so clearly instead of a silent blank map
      console.error('[Inside Out map] map error:', e.error?.message ?? e.error ?? e)
      setMapProblem(true)
    })
    // Only the player's own gestures have an originalEvent (not our easeTo calls)
    const userMoved = (e) => e.originalEvent && live.current.onUserMove()
    map.on('dragstart', userMoved)
    map.on('rotatestart', userMoved)
    map.on('pitchstart', userMoved)

    // MapLibre needs to know when the container changes size (rotation, address bar)
    const resizeObserver = new ResizeObserver(() => map.resize())
    resizeObserver.observe(wrapRef.current)
    requestAnimationFrame(() => map.resize())

    markersRef.current.label = new maplibregl.Marker({ element: beaconLabelElement(destination.name), anchor: 'bottom', offset: [0, -18] })
      .setLngLat([destination.lng, destination.lat])
      .addTo(map)

    // Off-screen pointer: an arrow on the screen edge towards the beacon
    const updatePointer = () => {
      const el = pointerRef.current
      const me = live.current.position
      if (!el) return
      if (!me) {
        el.hidden = true
        return
      }
      const w = map.getContainer().clientWidth
      const h = map.getContainer().clientHeight
      const top = (overlayRefs.top.current?.getBoundingClientRect().bottom ?? 120) + 36
      const bottom = h - (overlayRefs.sheet.current?.offsetHeight ?? 200) - 36
      const rect = { left: 36, right: w - 36, top, bottom }
      const target = map.project([destination.lng, destination.lat])
      if (target.x >= rect.left && target.x <= rect.right && target.y >= rect.top && target.y <= rect.bottom) {
        el.hidden = true
        return
      }
      const angle = bearing(me, destination) - map.getBearing()
      const dx = Math.sin((angle * Math.PI) / 180)
      const dy = -Math.cos((angle * Math.PI) / 180)
      const from = map.project([me.lng, me.lat])
      const x0 = Math.min(Math.max(from.x, rect.left), rect.right)
      const y0 = Math.min(Math.max(from.y, rect.top), rect.bottom)
      let t = Infinity
      if (dx > 0) t = Math.min(t, (rect.right - x0) / dx)
      if (dx < 0) t = Math.min(t, (rect.left - x0) / dx)
      if (dy > 0) t = Math.min(t, (rect.bottom - y0) / dy)
      if (dy < 0) t = Math.min(t, (rect.top - y0) / dy)
      if (!Number.isFinite(t)) t = 0
      el.hidden = false
      el.style.transform = `translate(${x0 + dx * t}px, ${y0 + dy * t}px)`
      el.querySelector('.game-pointer-arrow').style.transform = `rotate(${angle}deg)`
      el.querySelector('.game-pointer-distance').textContent = formatDistance(distanceMeters(me, destination))
    }
    live.current.updatePointer = updatePointer
    map.on('move', updatePointer)
    map.on('resize', updatePointer)

    // One animation loop: moving dashes on the trail + the beacon's pulse
    let frame
    let lastDash = 0
    let dashStep = 0
    const animate = (time) => {
      frame = requestAnimationFrame(animate)
      if (!map.getLayer('route-dash') || time - lastDash < 60) return
      lastDash = time
      dashStep = (dashStep + 1) % DASHES.length
      map.setPaintProperty('route-dash', 'line-dasharray', DASHES[dashStep])
      const isArrived = live.current.arrived
      const wave = (Math.sin(time / (isArrived ? 220 : 600)) + 1) / 2 // 0..1
      map.setPaintProperty('beacon-glow', 'fill-extrusion-opacity', isArrived ? 0.25 + wave * 0.5 : 0.18 + wave * 0.2)
      map.setPaintProperty('beacon-zone', 'fill-opacity', isArrived ? 0.12 + wave * 0.25 : 0.12)
    }
    frame = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
      markersRef.current = {}
      wasFollowingRef.current = false
      setReady(false)
    }
  }, [destination, overlayRefs])

  // Player: ring + direction cone on the ground, avatar standing on top
  useEffect(() => {
    const map = mapRef.current
    const markers = markersRef.current
    if (!map) return
    if (!position) {
      markers.ground?.remove()
      markers.avatar?.remove()
      markers.ground = markers.avatar = null
    } else {
      const lngLat = [position.lng, position.lat]
      if (!markers.ground) {
        markers.ground = new maplibregl.Marker({ element: playerGroundElement(), rotationAlignment: 'map', pitchAlignment: 'map' })
          .setLngLat(lngLat)
          .addTo(map)
        markers.avatar = new maplibregl.Marker({ element: playerAvatarElement(), anchor: 'bottom' }).setLngLat(lngLat).addTo(map)
      }
      markers.ground.setLngLat(lngLat).setRotation(heading ?? 0)
      markers.avatar.setLngLat(lngLat)
      const near = distanceMeters(position, destination) < BEACON_LABEL_WITHIN
      markers.label?.getElement().classList.toggle('is-visible', near || arrived)
    }
    live.current.updatePointer?.()
  }, [position, heading, destination, arrived])

  // Follow mode camera
  useEffect(() => {
    const map = mapRef.current
    if (!map || !following || !position) {
      wasFollowingRef.current = following && wasFollowingRef.current
      return
    }
    const entering = !wasFollowingRef.current
    wasFollowingRef.current = true
    map.easeTo({
      center: [position.lng, position.lat],
      bearing: heading ?? map.getBearing(),
      pitch: FOLLOW_PITCH,
      padding: followPadding(map),
      duration: EASE_MS,
      ...(entering ? { zoom: FOLLOW_ZOOM } : {}), // pinch-zoom is kept while following
    })
  }, [position, heading, following])

  // Trail
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    map.getSource('route').setData(nav && !arrived ? lineData(nav.trail) : empty)
  }, [ready, nav, arrived])

  return (
    <>
      <div ref={wrapRef} className="nav-map">
        <div ref={elRef} className="nav-map-canvas" role="region" aria-label={`Map to ${destination.name}`} />
      </div>
      <div ref={pointerRef} className="game-pointer" hidden aria-hidden="true">
        <span className="game-pointer-arrow">
          <svg viewBox="0 0 24 24">
            <path d="M12 2 20 20 12 15.5 4 20Z" />
          </svg>
        </span>
        <span className="game-pointer-distance" />
      </div>
      {mapProblem && !ready && <div className="nav-map-problem">The map couldn’t load. Check your internet connection.</div>}
    </>
  )
}

// ---------- The screen ----------

/**
 * destination: { name, address?, lat, lng, radius }
 * kind: 'hook' (look for the next trace) or 'finale' (go to the museum).
 * riddle: the solved riddle's question, shown again with "Back to riddle".
 */
export default function RouteMap({ destination, kind = 'hook', riddle }) {
  const { position, error } = usePosition()
  const { heading, compass, requestCompass } = useHeading(position)
  const check = position ? checkAtHook({ location: destination }, position) : null
  const arrived = Boolean(check?.isThere)
  const route = useWalkingRoute(position, destination, !arrived)
  const nav = useProgressOnRoute(route, position, destination)
  const [following, setFollowing] = useState(true)
  const [showRiddle, setShowRiddle] = useState(false)
  const topRef = useRef(null)
  const sheetRef = useRef(null)
  const overlayRefs = useMemo(() => ({ top: topRef, sheet: sheetRef }), [])

  // No compass and not walked yet: face the destination
  const effectiveHeading = heading ?? (position ? bearing(position, destination) : null)

  // Full-screen: no page scroll underneath, dev button moved out of the way
  useEffect(() => {
    document.body.classList.add('nav-open')
    return () => document.body.classList.remove('nav-open')
  }, [])

  // Map credits sit just above the bottom sheet, whatever its height
  const navRef = useRef(null)
  useEffect(() => {
    const observer = new ResizeObserver(() =>
      navRef.current?.style.setProperty('--sheet-height', `${sheetRef.current.offsetHeight}px`),
    )
    observer.observe(sheetRef.current)
    return () => observer.disconnect()
  }, [])

  // Let the dev panel's "Simulate walk" follow the line on screen
  useEffect(() => {
    publishRoute(nav && !arrived ? nav.coords : null)
  }, [nav, arrived])
  useEffect(() => () => publishRoute(null), [])

  let banner
  if (arrived) {
    banner = (
      <div className="nav-banner nav-banner-arrived" role="status">
        <Icon name="arrive" className="nav-banner-icon" />
        <div className="nav-banner-text">
          {kind === 'finale' ? 'You’ve arrived – find the artwork!' : 'You’ve arrived – find the QR code!'}
        </div>
      </div>
    )
  } else if (!position || !nav) {
    banner = (
      <div className="nav-banner" role="status">
        <Icon name="straight" className="nav-banner-icon" />
        <div className="nav-banner-text">
          {!position && !error ? 'Finding your location…' : position ? 'Plotting your trail…' : `Head towards ${destination.name}`}
        </div>
      </div>
    )
  } else if (nav.fallback) {
    const direction = following ? bearing(position, destination) - (effectiveHeading ?? 0) : 0
    banner = (
      <div className="nav-banner" role="status">
        <Icon name="straight" rotate={direction} className="nav-banner-icon" />
        <div className="nav-banner-text">
          Head towards {destination.name} <span className="nav-banner-distance">· {formatStepDistance(nav.remaining)}</span>
        </div>
      </div>
    )
  } else {
    banner = (
      <>
        <div className="nav-banner" role="status">
          <Icon name={maneuverIcon(nav.step)} className="nav-banner-icon" />
          <div className="nav-banner-text">
            {instructionFor(nav.step, destination.name)}{' '}
            <span className="nav-banner-distance">· {formatStepDistance(nav.stepDistance)}</span>
          </div>
        </div>
        {nav.nextStep && (
          <div className="nav-then">
            Then <span aria-hidden="true">{thenArrow[maneuverIcon(nav.nextStep)]}</span>
            <span className="visually-hidden">{instructionFor(nav.nextStep, destination.name)}</span>
          </div>
        )}
      </>
    )
  }

  return (
    <div ref={navRef} className="nav">
      <GameMap
        destination={destination}
        position={position}
        heading={effectiveHeading}
        nav={nav}
        arrived={arrived}
        following={following}
        onUserMove={() => setFollowing(false)}
        overlayRefs={overlayRefs}
      />

      <div ref={topRef} className="nav-top">
        {banner}
      </div>

      <section ref={sheetRef} className={`nav-sheet ${arrived ? 'is-arrived' : ''}`}>
        {!following && position && (
          <button type="button" className="nav-recenter" onClick={() => setFollowing(true)} aria-label="Recenter on my position">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3l6.5 17L12 16l-6.5 4z" />
            </svg>
          </button>
        )}

        {arrived ? (
          <>
            <div className="nav-dest-name">{destination.name}</div>
            <p className="muted small">
              {kind === 'finale'
                ? 'The last page is waiting inside.'
                : 'Look around: a piece of street art with a QR code or NFC tag is hidden here.'}
            </p>
            <Link to={kind === 'finale' ? '/finale' : '/scan'} className="btn btn-block nav-scan">
              {kind === 'finale' ? 'Go to the finale' : 'Scan the QR code'}
            </Link>
          </>
        ) : (
          <>
            <div className="nav-eta">
              {nav ? (
                <>
                  <span className="nav-eta-time">{formatWalkingTime(nav.remainingTime)}</span>
                  <span className="nav-eta-distance">{formatDistance(nav.remaining)}</span>
                </>
              ) : (
                <span className="muted">…</span>
              )}
            </div>
            <div className="nav-dest-name">{destination.name}</div>
            {error && !position && <p className="muted small">{errorText[error] ?? errorText.unavailable}</p>}
            {route?.fallback && position && <p className="muted small">Couldn’t plot the streets. Follow the trail straight to the beacon.</p>}
            {position?.fake && <p className="muted small">Dev: fake location</p>}
          </>
        )}

        <div className="nav-actions">
          {compass === 'needs-permission' && !arrived && (
            <button type="button" className="btn btn-ghost nav-small-btn" onClick={requestCompass}>
              Use compass
            </button>
          )}
          {riddle && (
            <button type="button" className="btn btn-ghost nav-small-btn" onClick={() => setShowRiddle(true)}>
              Back to riddle
            </button>
          )}
        </div>
      </section>

      {showRiddle && (
        <div className="nav-riddle" role="dialog" aria-modal="true" aria-label="The riddle">
          <div className="card card-accent stack">
            <div className="eyebrow">The riddle · solved</div>
            <h2 className="riddle-question">{riddle}</h2>
            <p>
              Answer: <strong>{destination.name}</strong>
            </p>
            <button type="button" className="btn btn-block" onClick={() => setShowRiddle(false)}>
              Back to the map
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
