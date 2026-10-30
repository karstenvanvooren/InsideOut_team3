// Floating test panel: fake your location on a map, skip challenges and riddles, reset.
// Loaded lazily, so normal players never download Leaflet.
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  checkAtHook,
  formatDistance,
  getFakeLocation,
  setFakeLocation,
  subscribeFakeLocation,
} from '../lib/location.js'
import { getPublishedRoute, subscribeRoute } from '../lib/route.js'
import { getHooks, meta } from '../lib/story.js'
import { useProgress } from '../lib/useProgress.js'
import { isWalking, startWalk, stopWalk, subscribeWalk } from './simulateWalk.js'
import './devPanel.css'

const ANTWERP = { lat: 51.2194, lng: 4.4025 }
const FAR_AWAY = { lat: 51.2005, lng: 4.4305 } // ~3 km south-east, outside every radius

/** Every place on the map: the hooks plus the museum finale. */
const places = () => [
  ...getHooks().map((hook) => ({ id: hook.id, location: hook.location })),
  ...(meta.finale?.location ? [{ id: 'finale', location: meta.finale.location }] : []),
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

function DevMap({ position, onPick }) {
  const elRef = useRef(null)
  const mapRef = useRef(null)
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
      const { lat, lng, radius = 50, name } = place.location
      L.circle([lat, lng], { radius, color: '#751ffe', weight: 2, fillOpacity: 0.15 }).addTo(map)
      L.circleMarker([lat, lng], { radius: 6, color: '#ffffff', weight: 2, fillColor: '#751ffe', fillOpacity: 1 })
        .bindTooltip(`${place.id} · ${name}`, { permanent: true, direction: 'top', offset: [0, -8] })
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
    mapRef.current = map
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
  const fake = useFakeLocation()
  const real = useRealPosition(open && !fake.enabled)
  const navigate = useNavigate()
  const { hookStatus, isRiddleSolved, completeHook, markLocationVerified, solveRiddle, reset } = useProgress()
  const [latInput, setLatInput] = useState('')
  const [lngInput, setLngInput] = useState('')

  useEffect(() => {
    setLatInput(String(round(fake.lat)))
    setLngInput(String(round(fake.lng)))
  }, [fake.lat, fake.lng])

  const position = fake.enabled ? { lat: fake.lat, lng: fake.lng, accuracy: 0 } : real.position

  const walk = useWalkState()
  const [walkSpeed, setWalkSpeed] = useState(1)

  const pick = (coords) => {
    stopWalk()
    setFakeLocation({ ...coords, enabled: true })
  }

  const applyInputs = (e) => {
    e.preventDefault()
    const lat = parseFloat(latInput.replace(',', '.'))
    const lng = parseFloat(lngInput.replace(',', '.'))
    if (Number.isFinite(lat) && Number.isFinite(lng)) pick({ lat, lng })
  }

  const skip = (hookId) => {
    markLocationVerified(hookId)
    completeHook(hookId)
  }

  // Also completes the hook itself, then jumps straight to the map
  const skipRiddle = (hookId) => {
    skip(hookId)
    solveRiddle(hookId)
    setOpen(false)
    navigate(`/riddle/${hookId}`)
  }

  if (!open) {
    return (
      <button type="button" className="dev-fab" onClick={() => setOpen(true)} aria-label="Open dev panel">
        DEV{fake.enabled && <span className="dev-fab-dot" title="Fake location on" />}
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

      <div className="dev-toggle" role="radiogroup" aria-label="Location source">
        <button
          type="button"
          role="radio"
          aria-checked={!fake.enabled}
          className={!fake.enabled ? 'on' : ''}
          onClick={() => setFakeLocation({ enabled: false })}
        >
          Use real GPS
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={fake.enabled}
          className={fake.enabled ? 'on' : ''}
          onClick={() => setFakeLocation({ enabled: true })}
        >
          Use fake location
        </button>
      </div>

      <DevMap position={position} onPick={pick} />
      <p className="dev-small">Tap the map to set your fake location (switches fake mode on).</p>

      <div className="dev-row">
        {places().map((place) => (
          <button key={place.id} type="button" className="dev-btn" onClick={() => pick(place.location)}>
            I’m at {place.location.name}
          </button>
        ))}
        <button type="button" className="dev-btn" onClick={() => pick(FAR_AWAY)}>
          Far away
        </button>
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
        {!walk.hasRoute && !walk.walking && <span className="dev-small">Open a route map first.</span>}
      </div>

      <form className="dev-row" onSubmit={applyInputs}>
        <input className="dev-input" value={latInput} onChange={(e) => setLatInput(e.target.value)} inputMode="decimal" aria-label="Latitude" />
        <input className="dev-input" value={lngInput} onChange={(e) => setLngInput(e.target.value)} inputMode="decimal" aria-label="Longitude" />
        <button type="submit" className="dev-btn">
          Set
        </button>
      </form>

      <div className="dev-small">
        {fake.enabled ? 'Fake' : 'Real GPS'}:{' '}
        {position
          ? `${round(position.lat)}, ${round(position.lng)}${position.accuracy ? ` (±${Math.round(position.accuracy)} m)` : ''}`
          : real.error || 'waiting for GPS…'}
      </div>

      <table className="dev-table">
        <tbody>
          {getHooks().map((hook) => {
            const check = position ? checkAtHook(hook, position) : null
            return (
              <tr key={hook.id}>
                <td>
                  <Link to={`/hook/${hook.id}`} onClick={() => setOpen(false)}>
                    {hook.id}
                  </Link>{' '}
                  {hook.label}
                  <div className="dev-small">{hookStatus(hook.id)}</div>
                </td>
                <td className={check?.isThere ? 'dev-in' : ''}>
                  {check ? `${formatDistance(check.distance)}${check.isThere ? ' ✓' : ''}` : '—'}
                </td>
                <td>
                  <button
                    type="button"
                    className="dev-btn"
                    disabled={hookStatus(hook.id) === 'completed'}
                    onClick={() => skip(hook.id)}
                  >
                    Skip challenge
                  </button>
                  {hook.riddle && (
                    <button
                      type="button"
                      className="dev-btn"
                      disabled={isRiddleSolved(hook.id)}
                      onClick={() => skipRiddle(hook.id)}
                    >
                      Skip riddle
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="dev-row">
        <Link to="/hook/does-not-exist" className="dev-btn" onClick={() => setOpen(false)}>
          Unknown hook
        </Link>
        <Link to="/finale" className="dev-btn" onClick={() => setOpen(false)}>
          Finale
        </Link>
        <button
          type="button"
          className="dev-btn dev-danger"
          onClick={() => window.confirm('Reset all progress?') && reset()}
        >
          Reset progress
        </button>
      </div>
    </aside>
  )
}
