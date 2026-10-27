import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const READER_ID = 'qr-reader'

/** Pulls the hook id out of any URL like https://whatever/hook/h01 */
function hookIdFromText(text) {
  const match = /\/hook\/([^/?#\s]+)/.exec(text)
  return match ? decodeURIComponent(match[1]) : null
}

export default function Scan() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')

  useEffect(() => {
    if (!window.isSecureContext) {
      setError(
        'The camera only works on https or localhost. Use your phone’s normal camera app to scan the QR code instead, or run npm run dev:https.',
      )
      return
    }

    let scanner = null
    let cancelled = false
    let handled = false

    const stop = () => {
      if (scanner?.isScanning) scanner.stop().catch(() => {})
    }

    // html5-qrcode is loaded only when this page opens
    import('html5-qrcode')
      .then(({ Html5Qrcode }) => {
        if (cancelled) return
        scanner = new Html5Qrcode(READER_ID, { verbose: false })
        return scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: (w, h) => ({ width: Math.min(w, h) * 0.7, height: Math.min(w, h) * 0.7 }) },
          (text) => {
            if (handled) return
            const id = hookIdFromText(text)
            if (!id) {
              setHint('That QR code is not an Inside Out trace.')
              return
            }
            handled = true
            stop()
            navigate(`/hook/${id}`)
          },
          () => {}, // "no code in this frame" — ignore
        )
      })
      .then(() => {
        if (cancelled) stop() // page closed while the camera was starting
      })
      .catch(() => {
        if (!cancelled) setError('Could not open the camera. Check the camera permission, or use your phone’s camera app.')
      })

    return () => {
      cancelled = true
      stop()
    }
  }, [navigate])

  return (
    <div className="page stack">
      <header>
        <div className="eyebrow">Scanner</div>
        <h1>Scan a trace</h1>
        <p className="muted">Point your camera at the QR code. NFC tags open by themselves when you tap your phone on them.</p>
      </header>

      {error ? <div className="card">{error}</div> : <div id={READER_ID} className="scanner-box" />}
      {hint && <p className="muted center">{hint}</p>}
    </div>
  )
}
