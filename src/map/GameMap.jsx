// The game map. Leaflet (https://leafletjs.com) is the base: it owns the map
// container, the view (centre + zoom) and the credits. Inside it, one Leaflet layer
// (@maplibre/maplibre-gl-leaflet) draws our calm vector style from mapTheme.js in
// 3D: tilted, first person, turning with the player's heading, with buildings.
// Leaflet itself can only show a flat map, so the 3D camera, the route line and the
// markers live in that layer; every time the camera stops, Leaflet's view is synced
// to it. Routes come from BRouter (src/lib/route.js).
// On top: the player (halo + direction cone on the ground, dot on top), optionally
// the destination beacon, the route line, hook markers and an arrow on the screen
// edge when the destination is off-screen.
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import '@maplibre/maplibre-gl-leaflet'
import { distanceMeters, formatDistance } from '../lib/location.js'
import { bearing } from '../lib/navigation.js'
import { MAP_ATTRIBUTION, applyMapTheme, buildMapStyle, getMapTheme } from './mapTheme.js'
import { STAGE_EVENT } from '../game/colourStage.js'

const ANTWERP = { lat: 51.2194, lng: 4.4025 }
const START_ZOOM = 17 // MapLibre zoom (Leaflet's zoom is always 1 higher)
const FOLLOW_ZOOM = 18.6
const FOLLOW_PITCH = 60
const EASE_MS = 500
const LAYER_PADDING = 0.1 // the 3D layer is drawn 10% larger than the screen on every side

const BEACON_LABEL_WITHIN = 250 // m: show the location name when this close
const SCAN_BUTTON_LIFT = 44 // px: the round Scan button sticks out above the nav into the map

// ---------- Map pieces ----------

const empty = { type: 'FeatureCollection', features: [] }

const lineData = (coords) => ({
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates: coords.map(([lat, lng]) => [lng, lat]) },
})

function addGameLayers(gl, theme) {
  gl.addSource('route', { type: 'geojson', data: empty })
  gl.addLayer({
    id: 'route',
    type: 'line',
    source: 'route',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': theme.route, 'line-width': 6 },
  })
}

const routeColour = () => getComputedStyle(document.documentElement).getPropertyValue('--map-route').trim()

// Player: a soft halo with a direction cone on the ground (turns with the heading)...
function playerGroundElement() {
  const el = document.createElement('div')
  el.className = 'game-player'
  el.innerHTML = '<span class="game-player-halo"></span><span class="game-player-cone"></span>'
  return el
}

// ...and the navy dot on top of it
function playerDotElement() {
  const el = document.createElement('div')
  el.className = 'game-player-dot'
  return el
}

// Destination: dot with a halo, the name above it when close
function destinationElement(name) {
  const el = document.createElement('div')
  el.className = 'game-beacon-marker'
  el.innerHTML = '<span class="game-beacon-label"></span><span class="game-beacon-halo"></span><span class="game-beacon-dot"></span>'
  el.querySelector('.game-beacon-label').textContent = name
  return el
}

/**
 * Camera padding (in the 3D layer's pixels) that puts the player ~70% down the
 * visible strip between the top banner and the bottom of the screen.
 */
function followPadding(gl, wrap, overlayRefs) {
  const h = wrap.clientHeight
  const H = gl.getContainer().clientHeight // the layer is taller than the screen
  const extra = (H - h) / 2
  const visibleTop = (overlayRefs?.top.current?.getBoundingClientRect().bottom ?? h * 0.15) - wrap.getBoundingClientRect().top
  const visibleBottom = h - (overlayRefs?.sheet.current?.offsetHeight ?? 0)
  const target = extra + visibleTop + (visibleBottom - visibleTop) * 0.7
  const top = Math.round(2 * target - H)
  return top >= 0 ? { top, bottom: 0, left: 0, right: 0 } : { top: 0, bottom: -top, left: 0, right: 0 }
}

/**
 * The game map: player, optional beacon on `destination`, optional trail, off-screen pointer.
 * destination: { name, lat, lng, radius } or null (no beacon, no pointer).
 * center: where to look before the first position fix, when there's no destination.
 * trail: [[lat, lng], ...] or null; trailIsStraight: no street route (BRouter failed) → dashed line.
 * arrived: the destination's halo pulses.
 * markers: [{ id, lat, lng, done }] small extra markers (hooks, when config.showHooksOnMap), or null.
 * overlayRefs: { top, sheet } — the banner and bottom area, so the pointer stays clear of them.
 */
export default function GameMap({
  destination = null,
  center = null,
  position,
  heading,
  trail = null,
  trailIsStraight = false,
  arrived = false,
  markers = null,
  following,
  onUserMove,
  overlayRefs,
}) {
  const wrapRef = useRef(null)
  const elRef = useRef(null)
  const pointerRef = useRef(null)
  const glRef = useRef(null)
  const markersRef = useRef({})
  const [ready, setReady] = useState(false)
  const [mapProblem, setMapProblem] = useState(false)
  const live = useRef({}) // latest props for event handlers
  live.current = { ...live.current, position, destination, arrived, onUserMove }
  const wasFollowingRef = useRef(false)

  useEffect(() => {
    const start = destination ?? center ?? ANTWERP
    // Leaflet: the base map. Its own gestures are off; the 3D layer handles them.
    const map = L.map(elRef.current, {
      center: [start.lat, start.lng],
      zoom: START_ZOOM + 1,
      minZoom: 2,
      maxZoom: 23,
      zoomSnap: 0,
      zoomControl: false,
      attributionControl: true,
      dragging: false,
      touchZoom: false,
      doubleClickZoom: false,
      scrollWheelZoom: false,
      boxZoom: false,
      keyboard: false,
      zoomAnimation: false,
      fadeAnimation: false,
    })
    map.attributionControl.setPrefix(false)

    const pane = map.createPane('gameTiles')
    pane.classList.add('game-tiles-pane')
    pane.style.zIndex = 200

    // The 3D layer (MapLibre inside Leaflet)
    const layer = L.maplibreGL({
      style: buildMapStyle(),
      pane: 'gameTiles',
      attribution: MAP_ATTRIBUTION,
      interactive: true,
      padding: LAYER_PADDING,
      pitch: FOLLOW_PITCH,
      maxPitch: 70,
      dragRotate: true,
      touchPitch: true,
    }).addTo(map)
    const gl = layer.getMaplibreMap()
    glRef.current = gl

    // When the 3D camera stops, Leaflet's view follows (so Leaflet always knows where we are)
    const syncLeaflet = () => {
      const c = gl.getCenter()
      const z = gl.getZoom() + 1
      const now = map.getCenter()
      if (Math.abs(now.lat - c.lat) < 1e-7 && Math.abs(now.lng - c.lng) < 1e-7 && Math.abs(map.getZoom() - z) < 1e-4) return
      map.setView([c.lat, c.lng], z, { animate: false })
    }
    gl.on('moveend', syncLeaflet)

    gl.on('load', () => {
      addGameLayers(gl, { ...getMapTheme(), route: routeColour() })
      applyMapTheme(gl)
      gl.setPaintProperty('route', 'line-color', routeColour())
      setReady(true)
    })
    let problems = 0
    gl.on('error', (e) => {
      console.error('[Inside Out map] map error:', e.error?.message ?? e.error ?? e)
      problems += 1
      if (problems > 6) setMapProblem(true)
    })

    // New colour stage (begin → middle → end): repaint the map in place
    const repaint = () => {
      applyMapTheme(gl)
      if (gl.getLayer('route')) gl.setPaintProperty('route', 'line-color', routeColour())
    }
    window.addEventListener(STAGE_EVENT, repaint)

    // Only the player's own gestures have an originalEvent (not our easeTo calls)
    const userMoved = (e) => e.originalEvent && live.current.onUserMove?.()
    gl.on('dragstart', userMoved)
    gl.on('rotatestart', userMoved)
    gl.on('pitchstart', userMoved)

    // Leaflet (and with it the 3D layer) needs to know when the container changes size
    const resizeObserver = new ResizeObserver(() => map.invalidateSize({ pan: false }))
    resizeObserver.observe(wrapRef.current)

    // Off-screen pointer: an arrow on the screen edge towards the beacon
    const updatePointer = () => {
      const el = pointerRef.current
      const wrap = wrapRef.current
      const { position: me, destination } = live.current
      if (!el || !wrap) return
      if (!me || !destination || distanceMeters(me, destination) <= (destination.radius ?? 50)) {
        el.hidden = true
        return
      }
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      const wrapBox = wrap.getBoundingClientRect()
      const glBox = gl.getContainer().getBoundingClientRect()
      const toScreen = (lng, lat) => {
        const p = gl.project([lng, lat])
        return { x: p.x + glBox.left - wrapBox.left, y: p.y + glBox.top - wrapBox.top }
      }
      const top = (overlayRefs.top.current?.getBoundingClientRect().bottom ?? 120) - wrapBox.top + 36
      const bottom = h - (overlayRefs.sheet.current?.offsetHeight ?? 0) - 36 - SCAN_BUTTON_LIFT
      const rect = { left: 36, right: w - 36, top, bottom }
      const target = toScreen(destination.lng, destination.lat)
      if (target.x >= rect.left && target.x <= rect.right && target.y >= rect.top && target.y <= rect.bottom) {
        el.hidden = true
        return
      }
      const angle = bearing(me, destination) - gl.getBearing()
      const dx = Math.sin((angle * Math.PI) / 180)
      const dy = -Math.cos((angle * Math.PI) / 180)
      const from = toScreen(me.lng, me.lat)
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
    gl.on('move', updatePointer)
    gl.on('resize', updatePointer)

    return () => {
      window.removeEventListener(STAGE_EVENT, repaint)
      resizeObserver.disconnect()
      map.remove()
      glRef.current = null
      markersRef.current = {}
      wasFollowingRef.current = false
      setReady(false)
    }
    // The map lives as long as the screen; the destination is handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayRefs])

  // The destination marker follows the destination (or disappears without one)
  useEffect(() => {
    const gl = glRef.current
    if (!gl || !ready) return
    markersRef.current.label?.remove()
    markersRef.current.label = destination
      ? new maplibregl.Marker({ element: destinationElement(destination.name) }).setLngLat([destination.lng, destination.lat]).addTo(gl)
      : null
    live.current.updatePointer?.()
  }, [ready, destination])

  // Player: halo + direction cone on the ground, the dot on top
  useEffect(() => {
    const gl = glRef.current
    const marks = markersRef.current
    if (!gl || !ready) return
    if (!position) {
      marks.ground?.remove()
      marks.avatar?.remove()
      marks.ground = marks.avatar = null
    } else {
      const lngLat = [position.lng, position.lat]
      if (!marks.ground) {
        marks.ground = new maplibregl.Marker({ element: playerGroundElement(), rotationAlignment: 'map', pitchAlignment: 'map' }).setLngLat(lngLat).addTo(gl)
        marks.avatar = new maplibregl.Marker({ element: playerDotElement() }).setLngLat(lngLat).addTo(gl)
      }
      marks.ground.setLngLat(lngLat).setRotation(heading ?? 0)
      marks.ground.getElement().classList.toggle('no-heading', heading == null)
      marks.avatar.setLngLat(lngLat)
    }
    const beacon = marks.label?.getElement()
    if (beacon) {
      const near = position && destination && distanceMeters(position, destination) < BEACON_LABEL_WITHIN
      beacon.classList.toggle('is-visible', Boolean(near || arrived))
      beacon.classList.toggle('is-arrived', arrived)
    }
    live.current.updatePointer?.()
  }, [position, heading, destination, arrived, ready])

  // Follow mode camera: behind the player, looking where they look
  useEffect(() => {
    const gl = glRef.current
    if (!gl || !ready || !following || !position) {
      wasFollowingRef.current = following && wasFollowingRef.current
      return
    }
    const entering = !wasFollowingRef.current
    wasFollowingRef.current = true
    gl.easeTo({
      center: [position.lng, position.lat],
      bearing: heading ?? gl.getBearing(),
      pitch: FOLLOW_PITCH,
      padding: followPadding(gl, wrapRef.current, overlayRefs),
      duration: EASE_MS,
      ...(entering ? { zoom: FOLLOW_ZOOM } : {}), // pinch-zoom is kept while following
    })
  }, [position, heading, following, ready, overlayRefs])

  // Small extra markers (hooks)
  useEffect(() => {
    const gl = glRef.current
    if (!gl || !ready || !markers?.length) return
    const added = markers.map((m) => {
      const el = document.createElement('div')
      el.className = `game-hook-marker${m.done ? ' is-done' : ''}`
      return new maplibregl.Marker({ element: el }).setLngLat([m.lng, m.lat]).addTo(gl)
    })
    return () => added.forEach((marker) => marker.remove())
  }, [markers, ready])

  // Trail (dashed when it's only a straight line because BRouter failed)
  useEffect(() => {
    const gl = glRef.current
    if (!gl || !ready || !gl.getSource('route')) return
    gl.getSource('route').setData(trail ? lineData(trail) : empty)
    gl.setPaintProperty('route', 'line-dasharray', trailIsStraight ? [0.2, 2] : undefined)
  }, [ready, trail, trailIsStraight])

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
