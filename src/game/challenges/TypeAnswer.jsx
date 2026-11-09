// Open answer (MoMu "use the word", Bourla statue). Small typos in spacing,
// capitals and accents are fine (same check as the riddles).
import { useState } from 'react'
import { PrimaryButton } from '../../components/ui/basics.jsx'
import { isCorrectRiddleAnswer } from '../../lib/answers.js'
import ChallengeFrame, { useChallenge, useWrong } from './ChallengeFrame.jsx'

export default function TypeAnswer({ onClose }) {
  const { challenge, solve, solved } = useChallenge()
  const [value, setValue] = useState('')
  const [feedback, shaking, showWrong, clear] = useWrong()

  const submit = (e) => {
    e.preventDefault()
    if (!value.trim() || solved) return
    if (isCorrectRiddleAnswer(value, challenge.answers)) solve()
    else showWrong('That’s not it – look again.')
  }

  return (
    <ChallengeFrame onClose={onClose}>
      <form id={`form-${challenge.id}`} className="stack" onSubmit={submit}>
        {challenge.image && <img className="challenge-photo" src={challenge.image} alt="" />}
        <h2 className="challenge-question">{challenge.question}</h2>
        {challenge.hint && <p className="muted challenge-text">{challenge.hint}</p>}
        <input
          className={`input ${shaking ? 'shake' : ''}`}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            clear()
          }}
          placeholder={challenge.placeholder ?? 'Type your answer…'}
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="done"
          aria-label="Your answer"
        />
        {feedback && <p className="feedback" role="status">{feedback}</p>}
        <PrimaryButton type="submit" disabled={!value.trim() || solved}>
          {challenge.button ?? 'Check'}
        </PrimaryButton>
      </form>
    </ChallengeFrame>
  )
}
