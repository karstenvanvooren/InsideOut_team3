import { useState } from 'react'
import { isCorrectAnswer } from '../lib/answers.js'

const HINT_AFTER = 2 // wrong answers before the hint shows

/** Step 2 of a hook: a question about the place. */
export default function Challenge({ hook, wrongAnswers = 0, onCorrect, onWrong }) {
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const { question, answers, hint } = hook.challenge

  const submit = (e) => {
    e.preventDefault()
    if (!answer.trim()) return
    if (isCorrectAnswer(answer, answers)) {
      setFeedback('')
      onCorrect()
    } else {
      onWrong()
      setFeedback('Not quite. Look around you.')
    }
  }

  return (
    <form className="card card-accent stack" onSubmit={submit}>
      <div className="eyebrow">Challenge · {hook.location.name}</div>
      <h2>{question}</h2>
      <input
        className="input"
        type="text"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Your answer"
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
      {wrongAnswers >= HINT_AFTER && hint && (
        <p className="hint">
          <strong>Hint:</strong> {hint}
        </p>
      )}
      <button type="submit" className="btn btn-block">
        Answer
      </button>
    </form>
  )
}
