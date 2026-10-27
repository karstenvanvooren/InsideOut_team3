import { useCallback, useEffect, useState } from 'react'
import { checkAtHook, formatDistance, getCurrentPosition, subscribeFakeLocation } from '../lib/location.js'

const errorHelp = {
  insecure: {
    title: 'Location needs a secure connection',
    text: 'Your browser only shares your location on https pages. Open the game through its official link (https://…).',
  },
  unsupported: {
    title: 'No location on this browser',
    text: 'Open the game in Safari (iPhone) or Chrome (Android).',
  },
  denied: {
    title: 'Location access is blocked',
    text: 'The game needs your location to check that you are really at the trace.',
    steps: [
      'iPhone: Settings → Privacy & Security → Location Services → ON, then Safari Websites → “While Using”. Then reload this page.',
      'Android (Chrome): tap the icon left of the address bar → Permissions → Location → Allow. Make sure Location is on in your quick settings.',
    ],
  },
  unavailable: {
    title: 'Couldn’t find your location',
    text: 'Turn on Location on your phone, step outside or away from tall buildings, and try again.',
  },
  timeout: {
    title: 'Finding your location took too long',
    text: 'GPS can be slow between buildings. Wait a moment and try again.',
  },
}

/** Step 1 of a hook: is the player really at the location? Calls onVerified() when they are. */
export default function LocationCheck({ hook, onVerified }) {
  const [state, setState] = useState({ status: 'checking' }) // checking | far | error | there

  const check = useCallback(async () => {
    setState({ status: 'checking' })
    try {
      const position = await getCurrentPosition()
      const result = checkAtHook(hook, position)
      if (result.isThere) {
        setState({ status: 'there', ...result })
        onVerified()
      } else {
        setState({ status: 'far', ...result, fake: position.fake })
      }
    } catch (err) {
      setState({ status: 'error', code: err.code ?? 'unavailable' })
    }
  }, [hook, onVerified])

  useEffect(() => {
    check()
    // Dev panel: re-check right away when the fake location changes
    return subscribeFakeLocation(check)
  }, [check])

  if (state.status === 'checking' || state.status === 'there') {
    return (
      <div className="card center">
        <div className="pulse" aria-hidden="true" />
        <p className="muted">{state.status === 'there' ? 'You’re here.' : 'Checking your location…'}</p>
      </div>
    )
  }

  if (state.status === 'error') {
    const help = errorHelp[state.code] ?? errorHelp.unavailable
    return (
      <div className="card stack">
        <h3>{help.title}</h3>
        <p className="muted">{help.text}</p>
        {help.steps && (
          <ul className="muted small">
            {help.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        )}
        <button type="button" className="btn btn-block" onClick={check}>
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="card stack center">
      <div className="eyebrow">Location check</div>
      <h2>You’re not there yet</h2>
      <p className="big-number">{formatDistance(state.distance)}</p>
      <p className="muted">
        away from {hook.location.name}.
        {state.accuracy > 0 && ` (GPS accuracy ±${state.accuracy} m)`}
        {state.fake && ' · fake location'}
      </p>
      <button type="button" className="btn btn-block" onClick={check}>
        Check again
      </button>
    </div>
  )
}
