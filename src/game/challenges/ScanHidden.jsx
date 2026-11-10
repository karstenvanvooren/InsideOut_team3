// Scan inside a museum: the QR code(s) hidden there (MoMu: one, KMSKA: two).
import { useState } from 'react'
import QrScanner, { hookIdFromText } from '../../components/QrScanner.jsx'
import { isDevEnabled } from '../../dev/devSettings.js'
import { patterns, vibrate } from '../../lib/vibrate.js'
import ChallengeFrame, { useChallenge } from './ChallengeFrame.jsx'

export default function ScanHidden({ onClose }) {
  const { challenge, solve, solved } = useChallenge()
  const codes = challenge.codes ?? []
  const [found, setFound] = useState([])

  const register = (qrId) => {
    const code = codes.find((c) => c.qrId === qrId)
    if (!code) return codes.length > 1 ? 'That’s not one of the hidden fragments. Keep looking!' : 'That’s not the hidden code. Keep looking!'
    if (found.includes(qrId)) return 'You already found this one – find the other one!'
    const next = [...found, qrId]
    setFound(next)
    vibrate(patterns.found)
    if (next.length === codes.length) {
      setTimeout(solve, 300)
      return undefined // stop scanning
    }
    return `Found ${next.length}/${codes.length} – find the other one!`
  }

  return (
    <ChallengeFrame onClose={onClose} counter={`Found ${found.length}/${codes.length}`}>
      <h2 className="challenge-question">{challenge.question}</h2>
      {!solved && (
        <div className="challenge-scanner">
          <QrScanner onCode={(text) => register(hookIdFromText(text) ?? text.trim())} />
        </div>
      )}
      <p className="muted challenge-text center">{challenge.text}</p>
      <div className="found-row">
        {codes.map((c, i) => (
          <span key={c.qrId} className={`found-dot ${found.includes(c.qrId) ? 'is-found' : ''}`}>
            {i + 1}
          </span>
        ))}
      </div>
      {isDevEnabled() && (
        <div className="dev-inline">
          {codes.map((c) => (
            <button key={c.qrId} type="button" className="dev-inline-btn" disabled={found.includes(c.qrId)} onClick={() => register(c.qrId)}>
              Dev: fake scan {c.qrId}
            </button>
          ))}
        </div>
      )}
    </ChallengeFrame>
  )
}
