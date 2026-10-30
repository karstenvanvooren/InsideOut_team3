// Floating test panel (only with ?dev=1): game phase + shortcuts, teleport, fake
// scans, fake location on a map, GPS accuracy, compass, simulate walk, reset.
// Loaded lazily, so normal players never download Leaflet.
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useGame } from '../game/GameProvider.jsx'
import { PHASES, devSetPhase } from '../game/gameState.js'
import { distanceMeters, formatDistance, getFakeLocation, setFakeLocation, subscribeFakeLocation } from '../lib/location.js'
import { getPublishedRoute, subscribeRoute } from '../lib/route.js'
import { getFragments, getHooks, getLocations, getStart, legTo } from '../lib/story.js'
import { CLOSE_POPUPS_EVENT, setDevOptions } from './devSettings.js'
import { isWalking, startWalk, stopWalk, subscribeWalk } from './simulateWalk.js'
import { useDevOptions } from './useDevOptions.js'
import './devPanel.css'

const ANTWERP = { lat: 51.2194, lng: 4.4025 }
const FAR_AWAY = { lat: 51.2005, lng: 4.4305 } // ~3 km south-east, outside every radius
const FAKE_ACCURACIES = [0, 40, 150] // m: perfect, good, too weak ("looking for a better signal")

/** Every place you can teleport to: the start, the locations and the hooks. */
const places = () => [
  { id: 'start', label: `start · ${getStart().name}`, point: getStart(), kind: 'start' },
  ...getLocations().map((loc) => ({ id: loc.id, label: `${loc.id} · ${loc.name}`, point: loc, kind: 'location' })),
  ...getHooks().map((hook) => ({ id: hook.id, label: `${hook.id} · ${hook.leg}`, point: hook, kind: 'hook' })),
]

/** Every QR you can fake-scan: the start and the hooks. */
const qrCodes = () => [
  { qrId: getStart().qrId, label: `${getStart().qrId} · start` },
  ...getHooks().map((hook) => ({ qrId: hook.qrId, label: `${hook.qrId} · ${hook.id} (${hook.leg})` })),
]

function useFakeLocation() {
  const [fake, setFake] = useState(getFakeLocation)
  useEffect(() => subscribeFakeLocation(() => setFake(getFakeLocation())), [])
  return fake
}

/** Is a navigation route on screen, and is "Simulate walk" running? */
function useWalkState() {
  const [state, setState] = useState(() => ({ hasRoute: Boolean(getPublishedRoute()), walking: isWalking() }))
  useEffect(() => {
    const update = () => setState({ hasRoute: Boolean(getPublishedRoute()), walking: isWalking() })
    const offRoute = subscribeRoute(update)
    const offWalk = subscribeWalk(update)
    return () => {
      offRoute()
      offWalk()
    }
  }, [])
  return state
}

/** Live real GPS position while the panel is open in "real GPS" mode. */
function useRealPosition(active) {
  const [state, setState] = useState({ position: null, error: null })
  useEffect(() => {
    if (!active) return
    if (!window.isSecureContext || !('geolocation' in navigator)) {
      setState({ position: null, error: 'Real GPS needs https (or localhost).' })
      return
    }
    const id = navigator.geolocation.watchPosition(
      (pos) =>
        setState({
          position: { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy },
          error: null,
        }),
      (err) => setState({ position: null, error: err.message || 'Location unavailable' }),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [active])
  return state
}

const placeStyle = {
  start: { color: '#ffb020', radius: 7 },
  location: { color: '#751ffe', radius: 6 },
  hook: { color: '#3ddc97', radius: 4 },
}

function DevMap({ position, onPick }) {
  const elRef = useRef(null)
  const meRef = useRef(null)
  const onPickRef = useRef(onPick)
  onPickRef.current = onPick

  useEffect(() => {
    const map = L.map(elRef.current, { zoomControl: true }).setView([ANTWERP.lat, ANTWERP.lng], 15)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    for (const place of places()) {
      const { lat, lng, radius = 50 } = place.point
      const style = placeStyle[place.kind]
      L.circle([lat, lng], { radius, color: style.color, weight: 1.5, fillOpacity: 0.12 }).addTo(map)
      L.circleMarker([lat, lng], { radius: style.radius, color: '#ffffff', weight: 2, fillColor: style.color, fillOpacity: 1 })
        .bindTooltip(place.label, { permanent: place.kind !== 'hook', direction: 'top', offset: [0, -8] })
        .addTo(map)
    }

    meRef.current = L.circleMarker([ANTWERP.lat, ANTWERP.lng], {
      radius: 8,
      color: '#ffffff',
      weight: 3,
      fillColor: '#ff4d6d',
      fillOpacity: 1,
    })
      .bindTooltip('You', { direction: 'bottom', offset: [0, 8] })
      .addTo(map)

    map.on('click', (e) => onPickRef.current({ lat: e.latlng.lat, lng: e.latlng.lng }))
    setTimeout(() => map.invalidateSize(), 50) // panel animates open

    return () => map.remove()
  }, [])

  useEffect(() => {
    if (!position || !meRef.current) return
    meRef.current.setLatLng([position.lat, position.lng])
  }, [position])

  return <div ref={elRef} className="dev-map" />
}

const round = (n) => Math.round(n * 100000) / 100000

export default function DevPanel() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const game = useGame()
  const { phase, location, locationIndex, fragments, hooksCollected, hooksTotal, completeChallenge, resetGame } = game
  const { skipLocationCheck } = useDevOptions()
  const fake = useFakeLocation()
  const real = useRealPosition(open && !fake.enabled)
  const walk = useWalkState()
  const [walkSpeed, setWalkSpeed] = useState(1)
  const [latInput, setLatInput] = useState('')
  const [lngInput, setLngInput] = useState('')
  const [teleportTo, setTeleportTo] = useState('start')
  const [scanQr, setScanQr] = useState(getStart().qrId)
  const [jumpPhase, setJumpPhase] = useState(phase)
  const [jumpLocation, setJumpLocation] = useState(locationIndex)

  useEffect(() => {
    setLatInput(String(round(fake.lat)))
    setLngInput(String(round(fake.lng)))
  }, [fake.lat, fake.lng])

  useEffect(() => {
    setJumpPhase(phase)
    setJumpLocation(locationIndex)
  }, [phase, locationIndex])

  const position = fake.enabled ? { lat: fake.lat, lng: fake.lng, accuracy: fake.accuracy ?? 0 } : real.position

  // Live info
  const toLocation = position && location ? distanceMeters(position, location) : null
  const nearestHook = position
    ? getHooks()
        .map((hook) => ({ hook, distance: distanceMeters(position, hook) }))
        .sort((a, b) => a.distance - b.distance)[0]
    : null

  const pick = (coords) => {
    stopWalk()
    setFakeLocation({ lat: coords.lat, lng: coords.lng, enabled: true })
  }

  const applyInputs = (e) => {
    e.preventDefault()
    const lat = parseFloat(latInput.replace(',', '.'))
    const lng = parseFloat(lngInput.replace(',', '.'))
    if (Number.isFinite(lat) && Number.isFinite(lng)) pick({ lat, lng })
  }

  // Same path as a real scan: the phase screen gets it as if the phone camera opened /hook/:qrId
  const fakeScan = () => {
    setOpen(false)
    navigate('/', { state: { scanned: scanQr } })
  }

  const jump = () => {
    stopWalk()
    devSetPhase(jumpPhase, Number(jumpLocation))
    navigate('/')
  }

  const resetAll = () => {
    if (!window.confirm('Reset the whole game?')) return
    stopWalk()
    resetGame()
    navigate('/')
  }

  if (!open) {
    return (
      <button type="button" className="dev-fab" onClick={() => setOpen(true)} aria-label="Open dev panel">
        DEV · {phase}
        {fake.enabled && <span className="dev-fab-dot" title="Fake location on" />}
      </button>
    )
  }

  return (
    <aside className="dev-panel" aria-label="Dev panel">
      <div className="dev-head">
        <strong>Dev panel</strong>
        <button type="button" className="dev-close" onClick={() => setOpen(false)} aria-label="Close">
          ✕
        </button>
      </div>

      <section className="dev-game">
        <div className="dev-live">
          <span>
            Phase <strong>{phase}</strong>
          </span>
          <span>
            {location ? `${location.id} · ${location.name}` : '—'} · leg {legTo(locationIndex)}
          </span>
          <span>To location: {toLocation === null ? '—' : formatDistance(toLocation)}</span>
          <span className={nearestHook && nearestHook.distance <= nearestHook.hook.radius ? 'dev-in' : ''}>
            Nearest hook:{' '}
            {nearestHook
              ? `${nearestHook.hook.id} ${formatDistance(nearestHook.distance)}${game.isHookCollected(nearestHook.hook.id) ? ' ✓' : ''}`
              : '—'}
          </span>
          <span>
            Fragments {fragments.length}/{getFragments().length} · Hooks {hooksCollected}/{hooksTotal}
          </span>
          <span>GPS ±{position ? Math.round(position.accuracy ?? 0) : '—'} m</span>
        </div>

        <div className="dev-row">
          <select className="dev-input" value={jumpPhase} onChange={(e) => setJumpPhase(e.target.value)} aria-label="Phase">
            {PHASES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select className="dev-input" value={jumpLocation} onChange={(e) => setJumpLocation(e.target.value)} aria-label="Location">
            {getLocations().map((loc, i) => (
              <option key={loc.id} value={i}>
                {loc.id} · {loc.name}
              </option>
            ))}
          </select>
          <button type="button" className="dev-btn" onClick={jump}>
            Skip to phase
          </button>
        </div>

        <div className="dev-row">
          <button type="button" className="dev-btn" disabled={phase !== 'atLocation'} onClick={completeChallenge}>
            Solve challenge
          </button>
          <button
            type="button"
            className="dev-btn"
            onClick={() => {
              setOpen(false)
              window.dispatchEvent(new Event(CLOSE_POPUPS_EVENT))
            }}
          >
            Close all pop-ups
          </button>
          <button type="button" className="dev-btn dev-danger" onClick={resetAll}>
            Reset game
          </button>
        </div>

        <label className="dev-check">
          <input type="checkbox" checked={skipLocationCheck} onChange={(e) => setDevOptions({ skipLocationCheck: e.target.checked })} />
          Skip location check
        </label>
      </section>

      <div className="dev-row">
        <select className="dev-input" value={teleportTo} onChange={(e) => setTeleportTo(e.target.value)} aria-label="Teleport to">
          {places().map((place) => (
            <option key={place.id} value={place.id}>
              {place.label}
            </option>
          ))}
        </select>
        <button type="button" className="dev-btn" onClick={() => pick(places().find((p) => p.id === teleportTo).point)}>
          Teleport
        </button>
        <button type="button" className="dev-btn" onClick={() => pick(FAR_AWAY)}>
          Far away
        </button>
      </div>

      <div className="dev-row">
        <select className="dev-input" value={scanQr} onChange={(e) => setScanQr(e.target.value)} aria-label="QR to fake-scan">
          {qrCodes().map((qr) => (
            <option key={qr.qrId} value={qr.qrId}>
              {qr.label}
            </option>
          ))}
        </select>
        <button type="button" className="dev-btn" onClick={fakeScan}>
          Fake scan
        </button>
      </div>

      <div className="dev-toggle" role="radiogroup" aria-label="Location source">
        <button type="button" role="radio" aria-checked={!fake.enabled} className={!fake.enabled ? 'on' : ''} onClick={() => setFakeLocation({ enabled: false })}>
          Use real GPS
        </button>
        <button type="button" role="radio" aria-checked={fake.enabled} className={fake.enabled ? 'on' : ''} onClick={() => setFakeLocation({ enabled: true })}>
          Use fake location
        </button>
      </div>

      <DevMap position={position} onPick={pick} />
      <p className="dev-small">Tap the map to set your fake location. Yellow = start, purple = locations, green = hooks.</p>

      <form className="dev-row" onSubmit={applyInputs}>
        <input className="dev-input" value={latInput} onChange={(e) => setLatInput(e.target.value)} inputMode="decimal" aria-label="Latitude" />
        <input className="dev-input" value={lngInput} onChange={(e) => setLngInput(e.target.value)} inputMode="decimal" aria-label="Longitude" />
        <button type="submit" className="dev-btn">
          Set
        </button>
      </form>

      <div className="dev-small">
        {fake.enabled ? 'Fake' : 'Real GPS'}:{' '}
        {position ? `${round(position.lat)}, ${round(position.lng)}` : real.error || 'waiting for GPS…'}
      </div>

      <div className="dev-row dev-heading">
        <span>Fake GPS accuracy</span>
        {FAKE_ACCURACIES.map((accuracy) => (
          <button
            key={accuracy}
            type="button"
            className={`dev-btn ${(fake.accuracy ?? 0) === accuracy ? 'dev-on' : ''}`}
            onClick={() => setFakeLocation({ accuracy, enabled: true })}
          >
            ±{accuracy} m
          </button>
        ))}
      </div>

      <div className="dev-row dev-heading">
        <label htmlFor="dev-heading">Compass {fake.heading === null ? 'real' : `${Math.round(fake.heading)}°`}</label>
        <input
          id="dev-heading"
          type="range"
          min="0"
          max="359"
          value={fake.heading ?? 0}
          onChange={(e) => setFakeLocation({ heading: Number(e.target.value) })}
        />
        <button type="button" className="dev-btn" disabled={fake.heading === null} onClick={() => setFakeLocation({ heading: null })}>
          Real
        </button>
      </div>

      <div className="dev-row">
        <button
          type="button"
          className="dev-btn"
          disabled={!walk.hasRoute && !walk.walking}
          onClick={() => (walk.walking ? stopWalk() : startWalk(walkSpeed))}
        >
          {walk.walking ? 'Stop walking' : 'Simulate walk'}
        </button>
        {[1, 5].map((factor) => (
          <button
            key={factor}
            type="button"
            className={`dev-btn ${walkSpeed === factor ? 'dev-on' : ''}`}
            onClick={() => {
              setWalkSpeed(factor)
              if (walk.walking) startWalk(factor) // continues from where the walker is now
            }}
          >
            {factor === 1 ? '1.3 m/s' : `×${factor}`}
          </button>
        ))}
        {!walk.hasRoute && !walk.walking && <span className="dev-small">Only while navigating.</span>}
      </div>

      <div className="dev-row">
        <Link to="/collection" className="dev-btn" onClick={() => setOpen(false)}>
          Collection
        </Link>
        <Link to="/hook/not-a-real-qr" className="dev-btn" onClick={() => setOpen(false)}>
          Unknown QR
        </Link>
      </div>
    </aside>
  )
}
