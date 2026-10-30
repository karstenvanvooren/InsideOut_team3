import { useEffect, useId, useState } from 'react'

/** Pulls the hook id out of any URL like https://whatever/hook/h01 */
export function hookIdFromText(text) {
  const match = /\/hook\/([^/?#\s]+)/.exec(text)
  return match ? decodeURIComponent(match[1]) : null
}

const cameraHelp = {
  insecure: {
    title: 'The camera needs a secure connection',
    text: 'Browsers only open the camera on https pages. Open the game through its official link, or scan the QR with your phone’s camera app.',
  },
  denied: {
    title: 'Camera access is blocked',
    text: 'We need the camera to read the QR code. Allow the camera for this site and tap Try again.',
    steps: [
      'iPhone: Settings → Safari → Camera → Allow. Then tap Try again.',
      'Android (Chrome): tap the icon left of the address bar → Permissions → Camera → Allow.',
    ],
  },
  'no-camera': {
    title: 'No camera found',
    text: 'This device has no camera we can use. Scan the QR with another phone’s camera app instead.',
  },
  failed: {
    title: 'Couldn’t start the camera',
    text: 'Another app may be using it. Close other camera apps and try again.',
  },
}

function cameraErrorCode(err) {
  const text = `${err?.name ?? ''} ${err?.message ?? err ?? ''}`
  if (/NotAllowed|Permission|denied/i.test(text)) return 'denied'
  if (/NotFound|no camera|Requested device not found/i.test(text)) return 'no-camera'
  return 'failed'
}

/**
 * In-app QR scanner (html5-qrcode, loaded only when it opens).
 * onCode(text) is called for every code read. Return a string to show it as a
 * hint and keep scanning (wrong code), or nothing to stop (code accepted).
 */
export default function QrScanner({ onCode }) {
  const readerId = `qr-reader-${useId().replace(/:/g, '')}`
  const [error, setError] = useState(null)
  const [hint, setHint] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!window.isSecureContext) {
      setError('insecure')
      return
    }

    let scanner = null
    let cancelled = false
    let handled = false

    const stop = () => {
      if (scanner?.isScanning) scanner.stop().catch(() => {})
    }

    import('html5-qrcode')
      .then(({ Html5Qrcode }) => {
        if (cancelled) return
        scanner = new Html5Qrcode(readerId, { verbose: false })
        return scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: (w, h) => ({ width: Math.min(w, h) * 0.7, height: Math.min(w, h) * 0.7 }) },
          (text) => {
            if (handled) return
            const problem = onCode(text)
            if (problem) {
              setHint(problem)
              return
            }
            handled = true
            stop()
          },
          () => {}, // "no code in this frame" — ignore
        )
      })
      .then(() => {
        if (cancelled) stop() // closed while the camera was starting
      })
      .catch((err) => {
        if (!cancelled) setError(cameraErrorCode(err))
      })

    return () => {
      cancelled = true
      stop()
    }
    // onCode may change every render; the scanner keeps the first one on purpose
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readerId, attempt])

  if (error) {
    const help = cameraHelp[error]
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
        {error !== 'insecure' && (
          <button
            type="button"
            className="btn btn-block"
            onClick={() => {
              setError(null)
              setAttempt((n) => n + 1)
            }}
          >
            Try again
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      <div id={readerId} key={attempt} className="scanner-box" />
      {hint && (
        <p className="scanner-hint" role="status">
          {hint}
        </p>
      )}
    </>
  )
}
