// Count the heads (Bourla): a number with − and +.
// Wrong answers get tips: too few / too many → the hint from story.json → a range.
import { useState } from 'react'
import { PrimaryButton } from '../../components/ui/basics.jsx'
import { Icon } from '../../components/ui/icons.jsx'
import ChallengeFrame, { useChallenge, useWrong } from './ChallengeFrame.jsx'

export default function Count({ onClose }) {
  const { challenge, solve, solved } = useChallenge()
  const [count, setCount] = useState(0)
  const [feedback, shaking, showWrong, clear] = useWrong()
  const [wrong, setWrong] = useState(0)
  const change = (d) => {
    clear()
    setCount((c) => Math.max(0, Math.min(99, c + d)))
  }
  const check = () => {
    if (count === challenge.answer) return solve()
    const n = wrong + 1
    setWrong(n)
    const way = count < challenge.answer ? 'too few' : 'too many'
    const hints = challenge.hints ?? []
    if (n >= 3) showWrong(`Almost: it’s between ${Math.max(0, challenge.answer - 2)} and ${challenge.answer + 2}.`)
    else if (n === 2 && hints[0]) showWrong(`Still ${way}. ${hints[0]}`)
    else showWrong(`Not quite – that’s ${way}.`)
  }

  return (
    <ChallengeFrame
      onClose={onClose}
      bottom={
        <PrimaryButton disabled={solved} onClick={check}>
          Check
        </PrimaryButton>
      }
    >
      <h2 className="challenge-question">{challenge.question}</h2>
      <p className="muted challenge-text">{challenge.text}</p>
      <div className={`stepper ${shaking ? 'shake' : ''}`}>
        <button type="button" className="stepper-btn" onClick={() => change(-1)} aria-label="One less" disabled={count === 0}>
          <Icon name="minus" size={24} strokeWidth={2.4} />
        </button>
        <output className="stepper-value" key={count} aria-live="polite">
          {count}
        </output>
        <button type="button" className="stepper-btn stepper-plus" onClick={() => change(1)} aria-label="One more">
          <Icon name="plus" size={24} strokeWidth={2.4} />
        </button>
      </div>
      {feedback && <p className="feedback center" role="status">{feedback}</p>}
    </ChallengeFrame>
  )
}
