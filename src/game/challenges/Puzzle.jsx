// Puzzle the picture together (Maagdenhuis): tap a loose piece, then tap where it goes.
import { useMemo, useState } from 'react'
import ChallengeFrame, { shuffled, useChallenge } from './ChallengeFrame.jsx'

export default function Puzzle({ onClose }) {
  const { challenge, solve } = useChallenge()
  const size = challenge.size ?? 3
  const total = size * size
  const tray = useMemo(() => shuffled([...Array(total).keys()], total * 5 + 1), [total])
  const [placed, setPlaced] = useState([]) // piece numbers on the board (piece n belongs on spot n)
  const [selected, setSelected] = useState(null)
  const [wrongSpot, setWrongSpot] = useState(null)

  const pieceStyle = (n) => ({
    backgroundImage: `url(${challenge.image})`,
    backgroundSize: `${size * 100}% ${size * 100}%`,
    backgroundPosition: `${((n % size) / (size - 1)) * 100}% ${(Math.floor(n / size) / (size - 1)) * 100}%`,
  })

  const tapSpot = (spot) => {
    if (selected === null || placed.includes(spot)) return
    if (selected === spot) {
      const next = [...placed, spot]
      setPlaced(next)
      setSelected(null)
      if (next.length === total) setTimeout(solve, 400)
    } else {
      setWrongSpot(spot)
      setTimeout(() => setWrongSpot(null), 420)
    }
  }

  return (
    <ChallengeFrame onClose={onClose} counter={`Pieces ${placed.length}/${total}`}>
      <div>
        <h2 className="challenge-question">{challenge.question}</h2>
        <p className="muted challenge-text">{challenge.text}</p>
      </div>
      <div className="puzzle-board" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
        {[...Array(total).keys()].map((spot) => (
          <button
            key={spot}
            type="button"
            className={`puzzle-spot ${placed.includes(spot) ? 'is-placed' : ''} ${wrongSpot === spot ? 'shake' : ''} ${selected !== null && !placed.includes(spot) ? 'is-target' : ''}`}
            style={placed.includes(spot) ? pieceStyle(spot) : undefined}
            onClick={() => tapSpot(spot)}
            aria-label={placed.includes(spot) ? `Piece ${spot + 1} placed` : `Empty spot ${spot + 1}`}
          />
        ))}
      </div>
      <div className="eyebrow eyebrow-blue">Pieces</div>
      <div className="puzzle-tray">
        {tray
          .filter((n) => !placed.includes(n))
          .map((n, i) => (
            <button
              key={n}
              type="button"
              className={`puzzle-piece ${selected === n ? 'is-selected' : ''}`}
              style={{ ...pieceStyle(n), '--tilt': `${[3, -5, 4, -3, 5, -4, 2, -2, 3][i % 9]}deg` }}
              onClick={() => setSelected(selected === n ? null : n)}
              aria-pressed={selected === n}
              aria-label={`Piece ${n + 1}`}
            />
          ))}
      </div>
    </ChallengeFrame>
  )
}
