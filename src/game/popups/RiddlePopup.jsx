import { useState } from 'react'
import RiddleForm from '../../components/Riddle.jsx'
import { Eyebrow } from '../../components/ui/basics.jsx'
import { Icon } from '../../components/ui/icons.jsx'
import { getLocations } from '../../lib/story.js'
import { patterns, vibrate } from '../../lib/vibrate.js'

const SUCCESS_MS = 1300

/**
 * The riddle whose answer is `location`. Can be minimised to a pill so the
 * player can look at the map or scan hooks. Correct answer → short success
 * moment → onSolve() (the pop-up closes and the route appears).
 */
export default function RiddlePopup({ location, index, wrong, onWrong, onSolve, onMinimise }) {
  const [celebrating, setCelebrating] = useState(false)

  const solve = (options) => {
    vibrate(patterns.found)
    setCelebrating(true)
    setTimeout(() => onSolve(options), SUCCESS_MS)
  }

  if (celebrating) {
    return (
      <div className="stack center riddle-success">
        <div className="success-check" aria-hidden="true">
          <Icon name="check" size={44} strokeWidth={2.6} />
        </div>
        <h2 className="sheet-title">That’s the place</h2>
        <p className="muted">Plotting your route to {location.name}…</p>
      </div>
    )
  }

  return (
    <div className="stack">
      <div className="sheet-head">
        <Eyebrow>
          Riddle {index + 1}/{getLocations().length}
        </Eyebrow>
        <button type="button" className="text-btn" onClick={onMinimise} aria-label="Minimise the riddle">
          Minimise <Icon name="chevronDown" size={14} strokeWidth={2.4} />
        </button>
      </div>
      <RiddleForm
        riddle={location.riddle}
        answerName={location.name}
        wrongAnswers={wrong}
        onCorrect={() => solve()}
        onWrong={onWrong}
        onReveal={() => solve({ revealed: true })}
      />
    </div>
  )
}

/** The solved riddle again, read-only (the "?" in the info strip while navigating). */
export function SolvedRiddle({ location, index }) {
  return (
    <div className="stack">
      <Eyebrow>
        Riddle {index + 1}/{getLocations().length} · solved
      </Eyebrow>
      <h2 className="riddle-question">{location.riddle.question}</h2>
      <p className="muted">
        Answer: <strong className="text-strong">{location.name}</strong>
      </p>
    </div>
  )
}
