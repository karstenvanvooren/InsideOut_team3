import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createRecognizer } from '../finale/artworkRecognizer.js'
import { getFinaleChapter } from '../lib/story.js'
import { useProgress } from '../lib/useProgress.js'
import { patterns, vibrate } from '../lib/vibrate.js'

// The museum moment. The page only knows about the recognizer's
// start/stop interface, so the simulator can be swapped for MindAR later.
export default function Finale() {
  const navigate = useNavigate()
  const { finaleAvailable, finaleUnlocked, unlockFinale } = useProgress()
  const [status, setStatus] = useState('idle') // idle | scanning | matched
  const containerRef = useRef(null)
  const recognizerRef = useRef(null)
  const finale = getFinaleChapter()

  useEffect(() => () => recognizerRef.current?.stop(), [])

  const startScan = async () => {
    setStatus('scanning')
    recognizerRef.current = createRecognizer({ container: containerRef.current })
    await recognizerRef.current.start(() => {
      recognizerRef.current.stop()
      vibrate(patterns.unlock)
      setStatus('matched')
      setTimeout(() => {
        unlockFinale()
        navigate(`/chapter/${finale.id}`, { state: { isNew: true } })
      }, 900)
    })
  }

  if (finaleUnlocked) {
    return (
      <div className="page stack center">
        <div className="eyebrow">Finale</div>
        <h1>Case closed</h1>
        <p className="muted">You already opened the last page.</p>
        <Link to={`/chapter/${finale.id}`} className="btn btn-block">
          Read the final chapter
        </Link>
        <Link to="/share" className="btn btn-ghost btn-block">
          Get your solved case card
        </Link>
      </div>
    )
  }

  if (!finaleAvailable) {
    return (
      <div className="page stack center">
        <div className="eyebrow">Museum</div>
        <h1>The last page is still sealed</h1>
        <p className="muted">Solve every trace in the city first. Your clues will lead you here.</p>
        <Link to="/" className="btn btn-block">
          Back to my clue
        </Link>
      </div>
    )
  }

  return (
    <div className="page stack">
      <header>
        <div className="eyebrow">Museum</div>
        <h1>The last page</h1>
        <p>Stand in front of the artwork and point your camera at it.</p>
      </header>

      <div ref={containerRef} className={`artwork-frame ${status === 'scanning' ? 'scanning' : ''}`}>
        <span className="muted">
          {status === 'idle' && 'Camera preview goes here'}
          {status === 'scanning' && 'Looking for the artwork…'}
          {status === 'matched' && 'Artwork recognized!'}
        </span>
      </div>

      <button type="button" className="btn btn-block" onClick={startScan} disabled={status !== 'idle'}>
        {status === 'idle' ? 'Scan the artwork' : status === 'scanning' ? 'Scanning…' : 'Unlocked'}
      </button>
      <p className="muted center">Placeholder: scanning is simulated for now.</p>
    </div>
  )
}
