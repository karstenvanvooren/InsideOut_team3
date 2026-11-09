// Memory (Plantin-Moretus). One pair is the fragment, the other pairs are things
// they used in the printing house. Easy: 6 pairs, hard: 10 pairs.
import { useEffect, useMemo, useState } from 'react'
import ChallengeFrame, { shuffled, useChallenge } from './ChallengeFrame.jsx'

const FLIP_BACK_MS = 850

export default function Memory({ onClose }) {
  const { challenge, solve } = useChallenge()
  const pairs = challenge.pairs ?? 6
  const cards = useMemo(() => {
    const objects = challenge.objects ?? []
    const faces = ['Fragment', ...Array.from({ length: pairs - 1 }, (_, i) => objects[i % objects.length] ?? `Object ${i + 1}`)]
    const deck = faces.flatMap((face, pair) => [0, 1].map((n) => ({ id: `${pair}-${n}`, pair, face, isFragment: pair === 0 })))
    return shuffled(deck, pairs * 7 + 3)
  }, [challenge, pairs])

  const [open, setOpen] = useState([]) // indexes of the (max 2) cards turned this move
  const [found, setFound] = useState([]) // pair numbers found
  const [moves, setMoves] = useState(0)

  useEffect(() => {
    if (open.length !== 2) return
    const [a, b] = open
    if (cards[a].pair === cards[b].pair) {
      setFound((f) => [...f, cards[a].pair])
      setOpen([])
      return
    }
    const timer = setTimeout(() => setOpen([]), FLIP_BACK_MS)
    return () => clearTimeout(timer)
  }, [open, cards])

  useEffect(() => {
    if (found.length === pairs) {
      const timer = setTimeout(solve, 450)
      return () => clearTimeout(timer)
    }
  }, [found, pairs]) // eslint-disable-line react-hooks/exhaustive-deps

  const turn = (i) => {
    if (open.length === 2 || open.includes(i) || found.includes(cards[i].pair)) return
    if (open.length === 1) setMoves((m) => m + 1)
    setOpen((o) => [...o, i])
  }

  const hard = pairs > 6
  return (
    <ChallengeFrame onClose={onClose} counter={`Pairs ${found.length}/${pairs} · Moves ${moves}`}>
      <div>
        <h2 className="challenge-question">{challenge.title}</h2>
        <p className="muted challenge-text">Find the pairs. One pair is the fragment, the others are things they used here.</p>
      </div>
      <div className={`memory-grid ${hard ? 'memory-hard' : ''}`}>
        {cards.map((card, i) => {
          const isFound = found.includes(card.pair)
          const faceUp = isFound || open.includes(i)
          return (
            <button
              key={card.id}
              type="button"
              className={`memory-card ${faceUp ? 'is-up' : ''} ${isFound ? 'is-found' : ''}`}
              onClick={() => turn(i)}
              aria-label={faceUp ? card.face : 'Hidden card'}
            >
              <span className="memory-card-inner">
                <span className="memory-back" aria-hidden="true">?</span>
                <span className={`memory-front ${card.isFragment ? 'memory-fragment' : ''}`}>
                  <span>{card.face}</span>
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </ChallengeFrame>
  )
}
