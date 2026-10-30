// The game map: a light, calm 3D world (style in mapTheme.js) that follows the
// player and turns with their heading. Optionally a burgundy destination dot, the
// route line and an off-screen pointer. The map is created once; the
// destination can come and go (e.g. hidden until the riddle is solved).
// Import it lazily: MapLibre is big.
import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { distanceMeters, formatDistance } from '../lib/location.js'
import { bearing } from '../lib/navigation.js'
import { buildMapStyle, getMapTheme } from './mapTheme.js'

const ANTWERP = { lat: 51.2194, lng: 4.4025 }
const FOLLOW_ZOOM = 18.6
const FOLLOW_PITCH = 60
const EASE_MS = 500

const BEACON_LABEL_WITHIN = 250 // m: show the location name when this close

// ---------- Map pieces ----------

const empty = { type: 'FeatureCollection', features: [] }

const lineData = (coords) => ({
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates: coords.map(([lat, lng]) => [lng, lat]) },
})

function addGameLayers(map, theme) {
  // Route: one burgundy line with round ends
  map.addSource('route', { type: 'geojson', data: empty })
  map.addLayer({
    id: 'route',
    type: 'line',
    source: 'route',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': theme.route, 'line-width': 6 },
  })
}

// Player: a soft halo with a faint direction cone on the ground (rotates with the heading)...
function playerGroundElement() {
  const el = document.createElement('div')
  el.className = 'game-player'
  el.innerHTML = `<span class="game-player-halo"></span><span class="game-player-cone"></span>`
  return el
}

// ...and the navy dot on top of it
function playerDotElement() {
  const el = document.createElement('div')
  el.className = 'game-player-dot'
  return el
}

// Destination: burgundy dot with a halo, the name above it when close.
// MapLibre sets an inline opacity on the marker element itself, so the
// near/far visibility is toggled on an inner element.
function destinationElement(name) {
  const el = document.createElement('div')
  el.className = 'game-beacon-marker'
  el.innerHTML = '<span class="game-beacon-label"></span><span class="game-beacon-halo"></span><span class="game-beacon-dot"></span>'
  el.querySelector('.game-beacon-label').textContent = name
  return el
}

/**
 * Camera padding that puts the player at ~70% down the visible strip between
 * the top banner and the bottom sheet, whatever their current size.
 */
const followPadding = (map, overlayRefs) => {
  const h = map.getContainer().clientHeight
  const visibleTop = overlayRefs?.top.current?.getBoundingClientRect().bottom ?? h * 0.15
  const visibleBottom = h - (overlayRefs?.sheet.current?.offsetHeight ?? 0)
  const target = visibleTop + (visibleBottom - visibleTop) * 0.7
  const bottom = Math.max(0, h - visibleBottom)
  const top = Math.max(0, 2 * target - (h - bottom))
  return { top: Math.round(top), bottom: Math.round(bottom), left: 0, right: 0 }
}

/**
 * The MapLibre game map: player, optional beacon on `destination`, optional trail, off-screen pointer.
 * destination: { name, lat, lng, radius } or null (no beacon, no pointer).
 * center: where to look before the first position fix, when there's no destination.
 * trail: [[lat, lng], ...] or null. arrived: the destination's halo pulses.
 * markers: [{ id, lat, lng, done }] small extra markers (hooks, when config.showHooksOnMap), or null.
 * overlayRefs: { top, sheet } — the banner and bottom sheet, so the pointer stays clear of them.
 */
export default function GameMap({
  destination = null,
  center = null,
  position,
  heading,
  trail = null,
  arrived = false,
  markers = null,
  following,
  onUserMove,
  overlayRefs,
}) {
  const wrapRef = useRef(null)
  const elRef = useRef(null)
  const pointerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef({})
  const [ready, setReady] = useState(false)
  const [mapProblem, setMapProblem] = useState(false)
  const live = useRef({}) // latest props for event handlers and the animation loop
  live.current = { ...live.current, position, destination, arrived, onUserMove }
  const wasFollowingRef = useRef(false)

  useEffect(() => {
    const theme = getMapTheme()
    const map = new maplibregl.Map({
      container: elRef.current,
      style: buildMapStyle(),
      center: [(destination ?? center ?? ANTWERP).lng, (destination ?? center ?? ANTWERP).lat],
      zoom: 17,
      pitch: FOLLOW_PITCH,
      maxPitch: 70,
      attributionControl: { compact: true },
    })
    mapRef.current = map

    map.on('load', () => {
      addGameLayers(map, theme)
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

    // Off-screen pointer: an arrow on the screen edge towards the beacon
    const updatePointer = () => {
      const el = pointerRef.current
      const { position: me, destination } = live.current
      if (!el) return
      // No pointer without a position or destination, or when the player is already at the beacon
      if (!me || !destination || distanceMeters(me, destination) <= (destination.radius ?? 50)) {
        el.hidden = true
        return
      }
      const w = map.getContainer().clientWidth
      const h = map.getContainer().clientHeight
      const top = (overlayRefs.top.current?.getBoundingClientRect().bottom ?? 120) + 36
      const bottom = h - (overlayRefs.sheet.current?.offsetHeight ?? 0) - 36
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

    return () => {
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
      markersRef.current = {}
      wasFollowingRef.current = false
      setReady(false)
    }
    // The map lives as long as the screen; the destination is handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayRefs])

  // The destination marker follows the destination (or disappears without one)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    markersRef.current.label?.remove()
    markersRef.current.label = destination
      ? new maplibregl.Marker({ element: destinationElement(destination.name) }).setLngLat([destination.lng, destination.lat]).addTo(map)
      : null
    live.current.updatePointer?.()
  }, [ready, destination])

  // Player: halo + direction cone on the ground, the dot on top
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
        markers.avatar = new maplibregl.Marker({ element: playerDotElement() }).setLngLat(lngLat).addTo(map)
      }
      markers.ground.setLngLat(lngLat).setRotation(heading ?? 0)
      markers.avatar.setLngLat(lngLat)
      const near = destination && distanceMeters(position, destination) < BEACON_LABEL_WITHIN
      markers.label?.getElement().classList.toggle('is-visible', Boolean(near || arrived))
    }
    markersRef.current.label?.getElement().classList.toggle('is-arrived', arrived)
    live.current.updatePointer?.()
  }, [position, heading, destination, arrived, ready])

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
      padding: followPadding(map, overlayRefs),
      duration: EASE_MS,
      ...(entering ? { zoom: FOLLOW_ZOOM } : {}), // pinch-zoom is kept while following
    })
  }, [position, heading, following, overlayRefs])

  // Small extra markers (hooks)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !markers?.length) return
    const added = markers.map((m) => {
      const el = document.createElement('div')
      el.className = `game-hook-marker${m.done ? ' is-done' : ''}`
      return new maplibregl.Marker({ element: el }).setLngLat([m.lng, m.lat]).addTo(map)
    })
    return () => added.forEach((marker) => marker.remove())
  }, [markers])

  // Trail
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    map.getSource('route').setData(trail ? lineData(trail) : empty)
  }, [ready, trail])

  return (
    <>
      <div ref={wrapRef} className="nav-map">
        <div ref={elRef} className="nav-map-canvas" role="region" aria-label={destination ? `Map to ${destination.name}` : 'Map'} />
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
