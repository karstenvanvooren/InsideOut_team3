// The end of the game (phase "finale", after the last challenge at the KMSKA).
// 1. The page appears blurred, like a memory ("sfumato"). The real fragments the
//    player found fly into their place, one by one, and the page becomes sharp.
// 2. The reveal: who she is and what the work is.
// 3. The player's trail (fragments, hooks, time) and a closing line.
// 4. Their collection stays open to browse (button + the Collection tab).
// The artwork picture and the places of the pieces are stand-ins for now
// (scripts/generate-fragments.js); swap them for our own photo later.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFragment, getFragments, meta } from '../../lib/story.js'
import { patterns, vibrate } from '../../lib/vibrate.js'
import { useGame } from '../GameProvider.jsx'
import story from '../../data/story.json'

const PIECE_MS = 650 // between two pieces flying in

function formatDuration(ms) {
  if (!ms || ms < 0) return null
  const minutes = Math.round(ms / 60000)
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`
}

export default function FinaleScreen() {
  const navigate = useNavigate()
  const { fragments: owned, hooksCollected, hooksTotal, startedAt, phaseSince } = useGame()
  const finale = story.finale ?? {}
  const real = getFragments().filter((f) => f.real)
  const foundReal = real.filter((f) => owned.includes(f.id))
  const fakes = owned.map(getFragment).filter((f) => f && !f.real)
  const [placed, setPlaced] = useState(0)
  const done = placed >= foundReal.length

  // The pieces fly in one by one
  useEffect(() => {
    if (done) {
      vibrate(patterns.unlock)
      return
    }
    const timer = setTimeout(() => setPlaced((n) => n + 1), placed === 0 ? 900 : PIECE_MS)
    return () => clearTimeout(timer)
  }, [placed, done])

  const duration = formatDuration((phaseSince ?? Date.now()) - (startedAt ?? 0))

  return (
    <div className="finale-screen">
      <div className="finale-scroll">
        <p className="eyebrow finale-eyebrow">The last page</p>

        <div className={`finale-artwork ${done ? 'is-complete' : ''}`}>
          <img className="finale-page" src={finale.image ?? '/fragments/artwork.svg'} alt={done ? finale.alt ?? 'The artwork' : ''} />
          {foundReal.map((f, i) => {
            const [x, y, w, h] = f.place ?? [0, 0, 0, 0]
            return (
              <img
                key={f.id}
                className={`finale-piece ${i < placed ? 'is-placed' : ''}`}
                src={f.src}
                alt=""
                style={{
                  left: `${(x / 600) * 100}%`,
                  top: `${(y / 800) * 100}%`,
                  width: `${(w / 600) * 100}%`,
                  height: `${(h / 800) * 100}%`,
                  '--from-x': `${(i % 2 ? 1 : -1) * (60 + i * 10)}px`,
                  '--from-y': `${140 + i * 20}px`,
                  '--turn': `${(i % 2 ? 1 : -1) * (8 + i * 3)}deg`,
                }}
              />
            )
          })}
        </div>

        <div className={`finale-reveal ${done ? 'is-visible' : ''}`} aria-live="polite">
          {done && (
            <>
              <h1 className="finale-title">{finale.title ?? meta.title}</h1>
              {finale.subtitle && <p className="finale-subtitle">{finale.subtitle}</p>}
              {finale.text && <p className="finale-text">{finale.text}</p>}

              <ul className="finale-stats">
                <li>
                  <strong>
                    {foundReal.length}/{real.length}
                  </strong>
                  <span>real pieces</span>
                </li>
                <li>
                  <strong>{fakes.length}</strong>
                  <span>fakes you saw through</span>
                </li>
                <li>
                  <strong>
                    {hooksCollected}/{hooksTotal}
                  </strong>
                  <span>chapters of her story</span>
                </li>
                {duration && (
                  <li>
                    <strong>{duration}</strong>
                    <span>on the trail</span>
                  </li>
                )}
              </ul>

              {finale.closing && <p className="finale-closing">{finale.closing}</p>}

              <button type="button" className="btn btn-block" onClick={() => navigate('/collection')}>
                View my collection
              </button>
              <p className="finale-note">Your collection stays here: every fragment, now marked real or fake, and every chapter of her story.</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
