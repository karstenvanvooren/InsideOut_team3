import { lazy, Suspense, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import RiddleForm from '../components/Riddle.jsx'
import { getHook, getRiddleDestination } from '../lib/story.js'
import { useProgress } from '../lib/useProgress.js'
import { patterns, vibrate } from '../lib/vibrate.js'
import NotFound from './NotFound.jsx'

const RouteMap = lazy(() => import('../components/RouteMap.jsx'))

const SUCCESS_MS = 1300

// /riddle/:id — the riddle a hook gives for the NEXT location.
// Unsolved → riddle. Solved → map with the walking route (also after a reload).
export default function Riddle() {
  const { id } = useParams()
  const hook = getHook(id)
  const destination = getRiddleDestination(hook)
  const { hookStatus, hookProgress, isRiddleSolved, recordRiddleWrongAnswer, solveRiddle } = useProgress()
  const [celebrating, setCelebrating] = useState(false)

  if (!hook?.riddle || !destination) return <NotFound />

  if (hookStatus(hook.id) !== 'completed') {
    return (
      <div className="page stack center">
        <div className="eyebrow">Sealed riddle</div>
        <h1>Not yet</h1>
        <p className="muted">This riddle opens once you’ve solved the trace at {hook.location.name}.</p>
        <Link to="/" className="btn btn-block">
          Back home
        </Link>
      </div>
    )
  }

  const solve = (options) => {
    solveRiddle(hook.id, options)
    vibrate(patterns.found)
    setCelebrating(true)
    setTimeout(() => setCelebrating(false), SUCCESS_MS)
  }

  if (celebrating) {
    return (
      <div className="page stack center riddle-success">
        <div className="success-check" aria-hidden="true">
          ✓
        </div>
        <h1>That’s the place</h1>
        <p className="muted">Plotting your route to {destination.location.name}…</p>
      </div>
    )
  }

  if (isRiddleSolved(hook.id)) {
    return (
      <Suspense
        fallback={
          <div className="page stack center">
            <div className="pulse" aria-hidden="true" />
            <p className="muted">Loading the map to {destination.location.name}…</p>
          </div>
        }
      >
        <RouteMap destination={destination.location} kind={destination.kind} riddle={hook.riddle.question} />
      </Suspense>
    )
  }

  return (
    <div className="page stack">
      <header>
        <div className="eyebrow">{hook.start ? 'Your first riddle' : `After ${hook.location.name}`}</div>
        <h1>Where to next?</h1>
        <p className="muted">Solve the riddle to find the next location. Type the name of the place.</p>
      </header>
      <RiddleForm
        riddle={hook.riddle}
        wrongAnswers={hookProgress[hook.id]?.riddleWrongAnswers ?? 0}
        onCorrect={() => solve()}
        onWrong={() => recordRiddleWrongAnswer(hook.id)}
        onReveal={() => solve({ revealed: true })}
      />
    </div>
  )
}
