// Multiple choice (Sint-Carolus Borromeuskerk). answer: index of the right option,
// or null while the team hasn't decided (then every option counts).
import { useState } from 'react'
import { PrimaryButton } from '../../components/ui/basics.jsx'
import ChallengeFrame, { useChallenge, useWrong } from './ChallengeFrame.jsx'

export default function Choice({ onClose }) {
  const { challenge, solve, solved } = useChallenge()
  const [picked, setPicked] = useState(null)
  const [feedback, shaking, showWrong, clear] = useWrong()

  const check = () => {
    if (picked === null) return
    if (challenge.answer == null || picked === challenge.answer) solve()
    else showWrong('Not this one – ask again or try another answer.')
  }

  return (
    <ChallengeFrame
      onClose={onClose}
      bottom={
        <PrimaryButton disabled={picked === null || solved} onClick={check}>
          Check
        </PrimaryButton>
      }
    >
      <h2 className="challenge-question">{challenge.question}</h2>
      <div className={`stack-sm ${shaking ? 'shake' : ''}`} role="radiogroup" aria-label="Answers">
        {challenge.options.map((option, i) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={picked === i}
            aria-pressed={picked === i}
            className="option-card option-radio"
            onClick={() => {
              setPicked(i)
              clear()
            }}
          >
            <span className="option-dot" aria-hidden="true" />
            {option}
          </button>
        ))}
      </div>
      {feedback && <p className="feedback" role="status">{feedback}</p>}
    </ChallengeFrame>
  )
}
