// Find the word (MoMu): tap the letters in the right order. The letter tiles are
// made from the answer itself, so they always fit.
import { useMemo, useState } from 'react'
import { PrimaryButton } from '../../components/ui/basics.jsx'
import ChallengeFrame, { shuffled, useChallenge, useWrong } from './ChallengeFrame.jsx'

export default function Letters({ onClose }) {
  const { challenge, solve, solved } = useChallenge()
  const words = challenge.answer.toUpperCase().split(/\s+/)
  const letters = useMemo(() => shuffled(words.join('').split(''), words.join('').length * 11), [challenge]) // eslint-disable-line react-hooks/exhaustive-deps
  const [picked, setPicked] = useState([]) // indexes into letters, in order
  const [feedback, shaking, showWrong, clear] = useWrong()
  const total = letters.length

  const tap = (i) => {
    if (picked.includes(i) || picked.length >= total || solved) return
    clear()
    const next = [...picked, i]
    setPicked(next)
    if (next.length === total) {
      const word = next.map((n) => letters[n]).join('')
      if (word === words.join('')) setTimeout(solve, 250)
      else {
        showWrong('Not quite – try again.')
        setTimeout(() => setPicked([]), 500)
      }
    }
  }

  // Slots per word
  let k = 0
  return (
    <ChallengeFrame
      onClose={onClose}
      bottom={
        <PrimaryButton className="btn-secondary" disabled={!picked.length || solved} onClick={() => setPicked((p) => p.slice(0, -1))}>
          Undo last letter
        </PrimaryButton>
      }
    >
      <h2 className="challenge-question">{challenge.question}</h2>
      <p className="muted challenge-text">Tap the letters in the right order.</p>
      <div className={`letter-slots ${shaking ? 'shake' : ''}`} aria-live="polite">
        {words.map((word, w) => (
          <div className="letter-word" key={w}>
            {word.split('').map(() => {
              const n = k++
              const letter = picked[n] != null ? letters[picked[n]] : ''
              return (
                <span key={n} className={`letter-slot ${letter ? 'is-filled' : ''}`}>
                  {letter}
                </span>
              )
            })}
          </div>
        ))}
      </div>
      {feedback && <p className="feedback" role="status">{feedback}</p>}
      <div className="letter-tiles">
        {letters.map((letter, i) => (
          <button key={i} type="button" className="letter-tile" disabled={picked.includes(i)} onClick={() => tap(i)}>
            {letter}
          </button>
        ))}
      </div>
    </ChallengeFrame>
  )
}
