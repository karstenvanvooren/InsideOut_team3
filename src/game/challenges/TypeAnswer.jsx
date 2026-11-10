// Open answer (MoMu "use the word", Bourla statue). Small typos in spacing,
// capitals and accents are fine (same check as the riddles).
// Wrong answers get tips: the hints from story.json, then the first letters,
// then more letters, and after that the answer itself (nobody gets stuck).
import { useState } from 'react'
import { PrimaryButton } from '../../components/ui/basics.jsx'
import { isCorrectRiddleAnswer } from '../../lib/answers.js'
import ChallengeFrame, { useChallenge, useWrong } from './ChallengeFrame.jsx'

/** "Victor Driessens" → "V_____ D_______" (show = letters per word) */
const pattern = (answer, show) =>
  answer
    .split(' ')
    .map((w) => w.slice(0, show).toUpperCase() + '_'.repeat(Math.max(0, w.length - show)))
    .join(' ')

function tipFor(n, challenge) {
  const hints = challenge.hints ?? []
  const answer = challenge.answers?.[0] ?? ''
  if (n <= hints.length) return `That’s not it. Tip: ${hints[n - 1]}`
  const extra = n - hints.length // 1, 2, 3…
  if (extra === 1) return `That’s not it. It looks like: ${pattern(answer, 1)}`
  if (extra === 2) return `Close? It looks like: ${pattern(answer, 2)}`
  return `No shame: it’s “${answer.replace(/\b\w/g, (c) => c.toUpperCase())}”.`
}

export default function TypeAnswer({ onClose }) {
  const { challenge, solve, solved } = useChallenge()
  const [value, setValue] = useState('')
  const [feedback, shaking, showWrong, clear] = useWrong()
  const [wrong, setWrong] = useState(0)

  const submit = (e) => {
    e.preventDefault()
    if (!value.trim() || solved) return
    if (isCorrectRiddleAnswer(value, challenge.answers)) solve()
    else {
      const n = wrong + 1
      setWrong(n)
      showWrong(tipFor(n, challenge))
    }
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
