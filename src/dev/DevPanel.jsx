// Floating test panel: fake your location on a map, skip challenges, reset.
// Loaded lazily, so normal players never download Leaflet.
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  checkAtHook,
  formatDistance,
  getFakeLocation,
  setFakeLocation,
  subscribeFakeLocation,
} from '../lib/location.js'
import { getHooks } from '../lib/story.js'
import { useProgress } from '../lib/useProgress.js'
import './devPanel.css'

const ANTWERP = { lat: 51.2194, lng: 4.4025 }
const FAR_AWAY = { lat: 51.2005, lng: 4.4305 } // ~3 km south-east, outside every radius

function useFakeLocation() {
  const [fake, setFake] = useState(getFakeLocation)
  useEffect(() => subscribeFakeLocation(() => setFake(getFakeLocation())), [])
  return fake
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

    for (const hook of getHooks()) {
      const { lat, lng, radius = 50, name } = hook.location
      L.circle([lat, lng], { radius, color: '#751ffe', weight: 2, fillOpacity: 0.15 }).addTo(map)
      L.circleMarker([lat, lng], { radius: 6, color: '#ffffff', weight: 2, fillColor: '#751ffe', fillOpacity: 1 })
        .bindTooltip(`${hook.id} · ${name}`, { permanent: true, direction: 'top', offset: [0, -8] })
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
  const { hookStatus, completeHook, markLocationVerified, reset } = useProgress()
  const [latInput, setLatInput] = useState('')
  const [lngInput, setLngInput] = useState('')

  useEffect(() => {
    setLatInput(String(round(fake.lat)))
    setLngInput(String(round(fake.lng)))
  }, [fake.lat, fake.lng])

  const position = fake.enabled ? { lat: fake.lat, lng: fake.lng, accuracy: 0 } : real.position

  const pick = (coords) => setFakeLocation({ ...coords, enabled: true })

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
        {getHooks().map((hook) => (
          <button key={hook.id} type="button" className="dev-btn" onClick={() => pick(hook.location)}>
            I’m at {hook.location.name}
          </button>
        ))}
        <button type="button" className="dev-btn" onClick={() => pick(FAR_AWAY)}>
          Far away
        </button>
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
