import { useState } from 'react'
import { isCorrectRiddleAnswer } from '../lib/answers.js'

const HINT_1_AFTER = 2 // wrong answers before hint 1
const HINT_2_AFTER = 4 // ... hint 2
const REVEAL_AFTER = 6 // ... the "Show the answer" button

const wrongMessages = [
  'Not quite. Read it again, slowly.',
  'Close? Maybe. Correct? Not yet.',
  'The city doesn’t recognise that one. Try again.',
]

/** A riddle that points to the next location. */
export default function Riddle({ riddle, wrongAnswers = 0, onCorrect, onWrong, onReveal }) {
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [shaking, setShaking] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const { question, answers, hints = [] } = riddle

  const submit = (e) => {
    e.preventDefault()
    if (!answer.trim()) return
    if (isCorrectRiddleAnswer(answer, answers)) {
      setFeedback('')
      onCorrect()
    } else {
      onWrong()
      setFeedback(wrongMessages[wrongAnswers % wrongMessages.length])
      setShaking(true)
    }
  }

  return (
    <form
      className={`card card-accent stack ${shaking ? 'shake' : ''}`}
      onSubmit={submit}
      onAnimationEnd={() => setShaking(false)}
    >
      <div className="eyebrow">Riddle · where to next?</div>
      <h2 className="riddle-question">{question}</h2>
      <input
        className="input"
        type="text"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Name of the place"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck="false"
        enterKeyHint="done"
        aria-label="Your answer"
      />
      {feedback && (
        <p className="feedback" role="status">
          {feedback}
        </p>
      )}
      {wrongAnswers >= HINT_1_AFTER && hints[0] && (
        <p className="hint">
          <strong>Hint 1:</strong> {hints[0]}
        </p>
      )}
      {wrongAnswers >= HINT_2_AFTER && hints[1] && (
        <p className="hint">
          <strong>Hint 2:</strong> {hints[1]}
        </p>
      )}
      <button type="submit" className="btn btn-block">
        Check
      </button>
      {wrongAnswers >= REVEAL_AFTER &&
        (revealed ? (
          <div className="hint stack">
            <p>
              The answer is <strong>{answers[0]}</strong>.
            </p>
            <button type="button" className="btn btn-block" onClick={onReveal}>
              Show me the way
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-ghost btn-block" onClick={() => setRevealed(true)}>
            Show the answer
          </button>
        ))}
    </form>
  )
}
