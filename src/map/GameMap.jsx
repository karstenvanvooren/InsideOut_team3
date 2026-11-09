// The game map, built with Leaflet (https://leafletjs.com). A calm map without
// street names, blurred for mystery (the blur clears up while you play, see
// --map-blur in tokens.css), tinted in the colour of the current stage. On top:
// the player (with a direction cone), optionally the destination beacon, the
// route line, hook markers and an arrow on the screen edge when the destination
// is off-screen. Colours come from CSS tokens, so stage changes need no JS.
// Leaflet keeps north up (no tilt/rotation); the cone shows where you look.
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { distanceMeters, formatDistance } from '../lib/location.js'
import { bearing } from '../lib/navigation.js'
import { TILE_ATTRIBUTION, TILE_URL } from './mapTheme.js'

const ANTWERP = { lat: 51.2194, lng: 4.4025 }
const START_ZOOM = 17
const FOLLOW_ZOOM = 18
const MAX_ZOOM = 20
const PAN_SECONDS = 0.5

const BEACON_LABEL_WITHIN = 250 // m: show the location name when this close
const SCAN_BUTTON_LIFT = 44 // px: the round Scan button sticks out above the nav into the map

const divIcon = (className, html, size) =>
  L.divIcon({ className: `game-leaflet-icon ${className}`, html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] })

const playerIcon = () =>
  divIcon(
    'game-player',
    '<span class="game-player-halo"></span><span class="game-player-cone"></span><span class="game-player-dot"></span>',
    86,
  )

function beaconIcon(name) {
  const icon = divIcon('game-beacon-marker', '<span class="game-beacon-label"></span><span class="game-beacon-halo"></span><span class="game-beacon-dot"></span>', 24)
  icon.options.html = icon.options.html.replace('<span class="game-beacon-label"></span>', `<span class="game-beacon-label">${escapeHtml(name)}</span>`)
  return icon
}

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

/**
 * Where the map should be centred so the player sits ~70% down the visible strip
 * between the top banner and the bottom of the screen (above the nav).
 */
function followCenter(map, latLng, overlayRefs) {
  const size = map.getSize()
  const visibleTop = overlayRefs?.top.current?.getBoundingClientRect().bottom ?? size.y * 0.15
  const visibleBottom = size.y - (overlayRefs?.sheet.current?.offsetHeight ?? 0)
  const targetY = visibleTop + (visibleBottom - visibleTop) * 0.7
  const zoom = map.getZoom()
  const point = map.project(latLng, zoom).subtract([0, targetY - size.y / 2])
  return map.unproject(point, zoom)
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
  const mapRef = useRef(null)
  const layersRef = useRef({})
  const [ready, setReady] = useState(false)
  const [mapProblem, setMapProblem] = useState(false)
  const live = useRef({}) // latest props for event handlers
  live.current = { ...live.current, position, destination, arrived, onUserMove }
  const wasFollowingRef = useRef(false)

  useEffect(() => {
    const start = destination ?? center ?? ANTWERP
    const map = L.map(elRef.current, {
      center: [start.lat, start.lng],
      zoom: START_ZOOM,
      maxZoom: MAX_ZOOM,
      zoomControl: false,
      attributionControl: true,
      zoomSnap: 0.25,
      fadeAnimation: true,
    })
    mapRef.current = map
    map.attributionControl.setPrefix(false)

    // Map tiles in their own pane, so only they get the mystery blur and the stage tint
    // (z-index set here: Leaflet's own CSS gives every pane 400 and loads after ours)
    const tilesPane = map.createPane('gameTiles')
    tilesPane.classList.add('game-tiles-pane')
    tilesPane.style.zIndex = 200
    let errors = 0
    L.tileLayer(TILE_URL, { pane: 'gameTiles', maxZoom: MAX_ZOOM, maxNativeZoom: 19, attribution: TILE_ATTRIBUTION, detectRetina: true })
      .on('tileerror', () => {
        errors += 1
        if (errors > 6) setMapProblem(true)
      })
      .on('tileload', () => setMapProblem(false))
      .addTo(map)

    // Stage colour wash over the tiles (multiply), below the route and markers
    const tintPane = map.createPane('gameTint')
    tintPane.classList.add('game-tint-pane')
    tintPane.style.zIndex = 250
    L.rectangle(
      [
        [-85, -180],
        [85, 180],
      ],
      { pane: 'gameTint', renderer: L.svg({ pane: 'gameTint', padding: 0.5 }), className: 'game-map-tint', stroke: false, interactive: false },
    ).addTo(map)

    // Route: one line in the stage colour (CSS: .game-route)
    layersRef.current.route = L.polyline([], { className: 'game-route', interactive: false }).addTo(map)

    // Only the player's own gestures stop "follow me" (not our own panTo calls)
    map.on('dragstart', () => live.current.onUserMove?.())
    setReady(true)

    // Leaflet needs to know when the container changes size (rotation, address bar)
    const resizeObserver = new ResizeObserver(() => map.invalidateSize({ pan: false }))
    resizeObserver.observe(wrapRef.current)

    // Off-screen pointer: an arrow on the screen edge towards the beacon
    const updatePointer = () => {
      const el = pointerRef.current
      const { position: me, destination } = live.current
      if (!el) return
      if (!me || !destination || distanceMeters(me, destination) <= (destination.radius ?? 50)) {
        el.hidden = true
        return
      }
      const { x: w, y: h } = map.getSize()
      const top = (overlayRefs.top.current?.getBoundingClientRect().bottom ?? 120) + 36
      const bottom = h - (overlayRefs.sheet.current?.offsetHeight ?? 0) - 36 - SCAN_BUTTON_LIFT
      const rect = { left: 36, right: w - 36, top, bottom }
      const target = map.latLngToContainerPoint([destination.lat, destination.lng])
      if (target.x >= rect.left && target.x <= rect.right && target.y >= rect.top && target.y <= rect.bottom) {
        el.hidden = true
        return
      }
      const angle = bearing(me, destination)
      const dx = Math.sin((angle * Math.PI) / 180)
      const dy = -Math.cos((angle * Math.PI) / 180)
      const from = map.latLngToContainerPoint([me.lat, me.lng])
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
    map.on('move zoom resize', updatePointer)

    return () => {
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
      layersRef.current = {}
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
    layersRef.current.beacon?.remove()
    layersRef.current.beacon = destination
      ? L.marker([destination.lat, destination.lng], { icon: beaconIcon(destination.name), interactive: false, keyboard: false, zIndexOffset: 500 }).addTo(map)
      : null
    live.current.updatePointer?.()
  }, [ready, destination])

  // Player: halo + direction cone + dot
  useEffect(() => {
    const map = mapRef.current
    const layers = layersRef.current
    if (!map || !ready) return
    if (!position) {
      layers.player?.remove()
      layers.player = null
    } else {
      if (!layers.player) {
        layers.player = L.marker([position.lat, position.lng], { icon: playerIcon(), interactive: false, keyboard: false, zIndexOffset: 1000 }).addTo(map)
      }
      layers.player.setLatLng([position.lat, position.lng])
      const cone = layers.player.getElement()?.querySelector('.game-player-cone')
      if (cone) {
        cone.style.transform = `rotate(${heading ?? 0}deg)`
        cone.style.opacity = heading == null ? '0' : '1'
      }
    }
    const beacon = layers.beacon?.getElement()
    if (beacon) {
      const near = position && destination && distanceMeters(position, destination) < BEACON_LABEL_WITHIN
      beacon.classList.toggle('is-visible', Boolean(near || arrived))
      beacon.classList.toggle('is-arrived', arrived)
    }
    live.current.updatePointer?.()
  }, [position, heading, destination, arrived, ready])

  // Follow mode camera
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !following || !position) {
      wasFollowingRef.current = following && wasFollowingRef.current
      return
    }
    const entering = !wasFollowingRef.current
    wasFollowingRef.current = true
    if (entering && map.getZoom() < FOLLOW_ZOOM - 0.5) map.setZoom(FOLLOW_ZOOM, { animate: false }) // pinch-zoom is kept while following
    map.panTo(followCenter(map, [position.lat, position.lng], overlayRefs), { animate: true, duration: PAN_SECONDS, easeLinearity: 0.4 })
  }, [position, following, ready, overlayRefs])

  // Small extra markers (hooks)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !markers?.length) return
    const added = markers.map((m) =>
      L.marker([m.lat, m.lng], { icon: divIcon(`game-hook-marker${m.done ? ' is-done' : ''}`, '', 16), interactive: false, keyboard: false }).addTo(map),
    )
    return () => added.forEach((marker) => marker.remove())
  }, [markers, ready])

  // Trail
  useEffect(() => {
    const route = layersRef.current.route
    if (!route || !ready) return
    route.setLatLngs(trail ?? [])
    route.getElement()?.classList.toggle('is-straight', trailIsStraight)
  }, [ready, trail, trailIsStraight])

  return (
    <>
      <div ref={wrapRef} className="nav-map">
        <div ref={elRef} className="nav-map-canvas" role="region" aria-label={destination ? `Map to ${destination.name}` : 'Map'} />
        <div className="nav-map-fog" aria-hidden="true" />
      </div>
      <div ref={pointerRef} className="game-pointer" hidden aria-hidden="true">
        <span className="game-pointer-arrow">
          <svg viewBox="0 0 24 24">
            <path d="M12 2 20 20 12 15.5 4 20Z" />
          </svg>
        </span>
        <span className="game-pointer-distance" />
      </div>
      {mapProblem && <div className="nav-map-problem">The map couldn’t load. Check your internet connection.</div>}
    </>
  )
}
