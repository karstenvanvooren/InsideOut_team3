// First thing a new player sees on the start screen: why the game needs their
// location and camera (and, on an iPhone, the compass), with one button per
// permission. Tapping a button triggers the browser's own question. Shown once;
// after that the start screen asks again by itself if something is still blocked.
import { useEffect, useState } from 'react'
import BottomSheet from '../../components/ui/BottomSheet.jsx'
import { Icon } from '../../components/ui/icons.jsx'
import { safeGet, safeSet } from '../../lib/storage.js'

const SEEN_KEY = 'insideout.permissions.v1'

export const permissionsSeen = () => Boolean(safeGet(SEEN_KEY))

const compassNeedsPermission = () =>
  typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function'

// 'ask' | 'busy' | 'granted' | 'denied' | 'unsupported'
async function askLocation() {
  if (!window.isSecureContext || !navigator.geolocation) return 'unsupported'
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      () => resolve('granted'),
      (err) => resolve(err.code === 1 ? 'denied' : 'granted'), // no fix yet, but allowed
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )
  })
}

async function askCamera() {
  if (!navigator.mediaDevices?.getUserMedia) return 'unsupported'
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
    stream.getTracks().forEach((track) => track.stop())
    return 'granted'
  } catch (err) {
    return err?.name === 'NotAllowedError' || err?.name === 'SecurityError' ? 'denied' : 'granted'
  }
}

async function askCompass() {
  try {
    return (await DeviceOrientationEvent.requestPermission()) === 'granted' ? 'granted' : 'denied'
  } catch {
    return 'denied'
  }
}

/** What the browser already knows (so a returning player sees ✓ right away). */
function usePermissionState(name) {
  const [state, setState] = useState('ask')
  useEffect(() => {
    navigator.permissions
      ?.query({ name })
      .then((status) => {
        if (status.state === 'granted') setState('granted')
        if (status.state === 'denied') setState('denied')
      })
      .catch(() => {}) // Safari doesn't know 'camera': just ask with the button
  }, [name])
  return [state, setState]
}

function PermissionRow({ icon, title, text, state, onAllow }) {
  return (
    <li className={`permission-row is-${state}`}>
      <span className="permission-icon" aria-hidden="true">
        <Icon name={icon} size={22} strokeWidth={2} />
      </span>
      <span className="permission-text">
        <strong>{title}</strong>
        <span>{state === 'denied' ? 'Blocked. Allow it for this site in your browser settings, then tap again.' : state === 'unsupported' ? 'Not available on this page or browser.' : text}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={state === 'granted'}
        aria-label={`Allow ${title.toLowerCase()}`}
        className={`permission-switch is-${state}`}
        onClick={state === 'granted' ? undefined : onAllow}
        disabled={state === 'busy' || state === 'unsupported'}
      >
        <span className="permission-switch-knob" />
      </button>
    </li>
  )
}

/**
 * open: show it. onDone(locationGranted): the player tapped Continue.
 */
export default function PermissionsPopup({ open, onDone }) {
  const [location, setLocation] = usePermissionState('geolocation')
  const [camera, setCamera] = usePermissionState('camera')
  const [compass, setCompass] = useState('ask')
  const showCompass = compassNeedsPermission()

  const run = (setState, ask) => async () => {
    setState('busy')
    setState(await ask())
  }

  const allDone = location === 'granted' && camera === 'granted' && (!showCompass || compass === 'granted')

  const finish = () => {
    safeSet(SEEN_KEY, { at: Date.now() })
    onDone?.(location === 'granted')
  }

  return (
    <BottomSheet open={open} dim label="Allow location and camera" className="permissions-sheet">
      <p className="eyebrow">Before you start</p>
      <h2 className="sheet-title">The city is your game board</h2>
      <p className="muted permissions-intro">To play, your phone needs to help a little. You’ll see your phone ask for each one.</p>
      <ul className="permission-list">
        <PermissionRow
          icon="pin"
          title="Location"
          text="To guide you through Antwerp and know when you’ve arrived."
          state={location}
          onAllow={run(setLocation, askLocation)}
        />
        <PermissionRow icon="camera" title="Camera" text="To scan the QR codes you find on the way." state={camera} onAllow={run(setCamera, askCamera)} />
        {showCompass && (
          <PermissionRow icon="compass" title="Direction" text="So the map turns with you." state={compass} onAllow={run(setCompass, askCompass)} />
        )}
      </ul>
      <button type="button" className="btn btn-block" onClick={finish}>
        {allDone ? 'Let’s go' : 'Continue'}
      </button>
      {!allDone && <p className="permissions-note">You can also allow them later, when the game needs them.</p>}
    </BottomSheet>
  )
}
