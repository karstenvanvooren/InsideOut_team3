// Find the word (MoMu): tap the letters in the right order. The letter tiles are
// made from the answer itself, so they always fit.
// - Tap a letter in the word to take it back (or use "Undo").
// - A wrong word = some letters get fixed in their right place (they turn dark),
//   so nobody gets stuck: every mistake makes it easier.
import { useMemo, useState } from 'react'
import { PrimaryButton } from '../../components/ui/basics.jsx'
import ChallengeFrame, { shuffled, useChallenge, useWrong } from './ChallengeFrame.jsx'

const FIX_PER_MISTAKE = 3

export default function Letters({ onClose }) {
  const { challenge, solve, solved } = useChallenge()
  const words = challenge.answer.toUpperCase().split(/\s+/)
  const target = words.join('').split('') // the right letter for every slot
  const letters = useMemo(() => shuffled([...target], target.length * 11), [challenge]) // eslint-disable-line react-hooks/exhaustive-deps
  const total = letters.length
  const [slots, setSlots] = useState(() => Array(total).fill(null)) // tile index per slot
  const [fixed, setFixed] = useState([]) // slots that are fixed after a mistake
  const [mistakes, setMistakes] = useState(0)
  const [feedback, shaking, showWrong, clear] = useWrong()
  const used = new Set(slots.filter((n) => n != null))

  // The order in which slots get fixed: first letter of every word, then the rest left to right
  const fixOrder = useMemo(() => {
    const starts = []
    let k = 0
    for (const w of words) {
      starts.push(k)
      k += w.length
    }
    return [...starts, ...target.map((_, i) => i).filter((i) => !starts.includes(i))]
  }, [challenge]) // eslint-disable-line react-hooks/exhaustive-deps

  const check = (next) => {
    if (next.some((n) => n == null)) return
    if (next.map((n) => letters[n]).join('') === target.join('')) {
      setTimeout(solve, 250)
      return
    }
    // Wrong: fix a few more letters in their right place, take the rest back
    const count = Math.min(total - 1, fixed.length + FIX_PER_MISTAKE)
    const nowFixed = fixOrder.slice(0, count)
    const after = Array(total).fill(null)
    const taken = new Set()
    for (const slot of nowFixed) {
      const tile = letters.findIndex((l, i) => l === target[slot] && !taken.has(i))
      after[slot] = tile
      taken.add(tile)
    }
    setMistakes((m) => m + 1)
    showWrong(`Not quite. I fixed ${count - fixed.length} letter${count - fixed.length === 1 ? '' : 's'} for you.`)
    setTimeout(() => {
      setFixed(nowFixed)
      setSlots(after)
    }, 500)
  }

  const tap = (i) => {
    if (used.has(i) || solved) return
    const slot = slots.findIndex((n, s) => n == null && !fixed.includes(s))
    if (slot < 0) return
    clear()
    const next = slots.map((n, s) => (s === slot ? i : n))
    setSlots(next)
    check(next)
  }

  const takeBack = (slot) => {
    if (slots[slot] == null || fixed.includes(slot) || solved) return
    clear()
    setSlots((s) => s.map((n, k) => (k === slot ? null : n)))
  }

  const undo = () => {
    const last = slots.map((n, s) => (n != null && !fixed.includes(s) ? s : -1)).filter((s) => s >= 0).pop()
    if (last != null) takeBack(last)
  }
  const canUndo = slots.some((n, s) => n != null && !fixed.includes(s))

  let k = 0
  return (
    <ChallengeFrame
      onClose={onClose}
      counter={mistakes ? `${fixed.length} fixed` : undefined}
      bottom={
        <PrimaryButton className="btn-secondary" disabled={!canUndo || solved} onClick={undo}>
          Undo last letter
        </PrimaryButton>
      }
    >
      <h2 className="challenge-question">{challenge.question}</h2>
      <p className="muted challenge-text">Tap the letters in the right order. Tap a letter in the word to take it back.</p>
      <div className={`letter-slots ${shaking ? 'shake' : ''}`} aria-live="polite">
        {words.map((word, w) => (
          <div className="letter-word" key={w}>
            {word.split('').map(() => {
              const n = k++
              const letter = slots[n] != null ? letters[slots[n]] : ''
              const isFixed = fixed.includes(n)
              return (
                <button
                  key={n}
                  type="button"
                  className={`letter-slot ${letter ? 'is-filled' : ''} ${isFixed ? 'is-fixed' : ''}`}
                  onClick={() => takeBack(n)}
                  disabled={!letter || isFixed || solved}
                  aria-label={letter ? `${letter}${isFixed ? ' (fixed)' : ', tap to take back'}` : 'Empty'}
                >
                  {letter}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      {feedback && <p className="feedback" role="status">{feedback}</p>}
      <div className="letter-tiles">
        {letters.map((letter, i) => (
          <button key={i} type="button" className="letter-tile" disabled={used.has(i)} onClick={() => tap(i)}>
            {letter}
          </button>
        ))}
      </div>
    </ChallengeFrame>
  )
}
