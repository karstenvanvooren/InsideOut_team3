import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import Challenge from '../components/Challenge.jsx'
import LocationCheck from '../components/LocationCheck.jsx'
import { getHook } from '../lib/story.js'
import { useProgress } from '../lib/useProgress.js'
import { patterns, vibrate } from '../lib/vibrate.js'
import UnknownHook from './UnknownHook.jsx'

// Entry point for every QR code / NFC tag: /hook/:id
// Flow: requires check → location check → challenge → chapter.
export default function Hook() {
  const { id } = useParams()
  const navigate = useNavigate()
  const hook = getHook(id)
  const progress = useProgress()
  const [unlocked, setUnlocked] = useState(false)

  const status = hook ? progress.hookStatus(hook.id) : null
  const hookProgress = hook ? progress.hookProgress[hook.id] ?? {} : {}
  const { markHookScanned, markLocationVerified, recordWrongAnswer, completeHook } = progress

  useEffect(() => {
    if (status === 'open') markHookScanned(hook.id)
  }, [status, hook, markHookScanned])

  const onVerified = useCallback(() => {
    markLocationVerified(hook.id)
  }, [hook, markLocationVerified])

  const onCorrect = () => {
    completeHook(hook.id)
    vibrate(patterns.unlock)
    setUnlocked(true)
    setTimeout(() => navigate(`/chapter/${hook.chapter}`, { replace: true, state: { isNew: true } }), 1100)
  }

  if (!hook) return <UnknownHook id={id} />

  if (unlocked) {
    return (
      <div className="page stack center">
        <div className="pulse" aria-hidden="true" />
        <h1>Trace unlocked</h1>
        <p className="muted">Opening the chapter…</p>
      </div>
    )
  }

  if (status === 'completed') return <Navigate to={`/chapter/${hook.chapter}`} replace />

  if (status === 'locked') {
    return (
      <div className="page stack center">
        <div className="eyebrow">Sealed trace</div>
        <h1>Not yet</h1>
        <p className="muted">You haven’t found the trace that leads here yet. Follow your clues — the city will bring you back.</p>
        <Link to="/" className="btn btn-block">
          Back to my clue
        </Link>
      </div>
    )
  }

  const verified = Boolean(hookProgress.locationVerifiedAt)

  return (
    <div className="page stack">
      <header>
        <div className="eyebrow">Trace found</div>
        <h1>{hook.label}</h1>
        <ol className="steps" aria-label="Steps">
          <li className={verified ? 'done' : 'active'}>Location</li>
          <li className={verified ? 'active' : ''}>Challenge</li>
          <li>Chapter</li>
        </ol>
      </header>

      {verified ? (
        <Challenge
          hook={hook}
          wrongAnswers={hookProgress.wrongAnswers ?? 0}
          onCorrect={onCorrect}
          onWrong={() => recordWrongAnswer(hook.id)}
        />
      ) : (
        <LocationCheck hook={hook} onVerified={onVerified} />
      )}
    </div>
  )
}
