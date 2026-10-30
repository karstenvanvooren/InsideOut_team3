import { useState } from 'react'
import { isCorrectRiddleAnswer } from '../lib/answers.js'

// A new hint after every wrong answer; after REVEAL_AFTER wrong answers the answer is shown.
const REVEAL_AFTER = 3

const wrongMessages = [
  'Not quite. Read it again, slowly.',
  'Close? Maybe. Correct? Not yet.',
  'The city doesn’t recognise that one. Try again.',
]

/**
 * A riddle whose answer is the name of the next location.
 * answerName: how to show the answer after 3 wrong tries (defaults to the first accepted answer).
 */
export default function Riddle({ riddle, answerName, wrongAnswers = 0, onCorrect, onWrong, onReveal }) {
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [shaking, setShaking] = useState(false)
  const { question, answers, hints = [] } = riddle
  const revealed = wrongAnswers >= REVEAL_AFTER
  const shownHints = hints.slice(0, Math.min(wrongAnswers, REVEAL_AFTER - 1))

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
    <form className={`stack riddle-form ${shaking ? 'shake' : ''}`} onSubmit={submit} onAnimationEnd={() => setShaking(false)}>
      <h2 className="riddle-question">{question}</h2>

      {shownHints.map((hint, i) => (
        <p key={i} className="hint">
          <strong>Hint {i + 1}:</strong> {hint}
        </p>
      ))}

      {revealed ? (
        <>
          <p className="hint">
            The answer is <strong>{answerName ?? answers[0]}</strong>.
          </p>
          <button type="button" className="btn btn-block" onClick={onReveal}>
            Show me the way
          </button>
        </>
      ) : (
        <>
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
          <button type="submit" className="btn btn-block">
            Check
          </button>
        </>
      )}
    </form>
  )
}
