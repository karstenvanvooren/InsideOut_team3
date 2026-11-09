// Shared layout of every challenge screen (hi-fi H1–H12): close button, location,
// "Challenge 1/2", reward chip (+ optional counter chip), the challenge itself,
// a bottom area for the main button, and the short "Well done!" moment.
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Chip, Eyebrow } from '../../components/ui/basics.jsx'
import { Icon } from '../../components/ui/icons.jsx'
import { patterns, vibrate } from '../../lib/vibrate.js'

const SUCCESS_MS = 1300

export const ChallengeContext = createContext(null)
/** { location, challenge, number, total, solve() } – solve() plays the success moment, then completes the challenge. */
export const useChallenge = () => useContext(ChallengeContext)

export function ChallengeProvider({ location, challenge, number, total, onSolve, children }) {
  const [solved, setSolved] = useState(false)
  const onSolveRef = useRef(onSolve)
  onSolveRef.current = onSolve

  useEffect(() => {
    if (!solved) return
    vibrate(patterns.unlock)
    const timer = setTimeout(() => onSolveRef.current(), SUCCESS_MS)
    return () => clearTimeout(timer)
  }, [solved])

  const value = { location, challenge, number, total, solved, solve: () => setSolved(true) }
  return <ChallengeContext.Provider value={value}>{children}</ChallengeContext.Provider>
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`
export const rewardLabel = (challenge) =>
  challenge?.reward ?? plural(challenge?.fragments?.length ?? 0, 'fragment')

/** One challenge screen. `counter` = small navy chip top right ("Pairs 2/6"), `bottom` = main button(s). */
export default function ChallengeFrame({ onClose, counter, bottom, className = '', children }) {
  const { location, challenge, number, total, solved } = useChallenge()
  return (
    <div className={`challenge-screen ${className}`} role="dialog" aria-modal="true" aria-label={challenge.title}>
      <div className="challenge-screen-top challenge-head">
        <button type="button" className="round-btn" onClick={onClose} aria-label="Back to the map">
          <Icon name="close" size={18} strokeWidth={2.4} />
        </button>
        <div>
          <Eyebrow tone="blue">{location.name}</Eyebrow>
          <div className="challenge-screen-count">
            Challenge {number}/{total}
          </div>
        </div>
      </div>
      <div className="challenge-screen-body stack">
        <div className="chip-row challenge-chips">
          <Chip>Reward: {rewardLabel(challenge)}</Chip>
          {counter != null && (
            <Chip tone="counter" className="challenge-counter" key={String(counter)}>
              {counter}
            </Chip>
          )}
        </div>
        {children}
      </div>
      {bottom && <div className="challenge-screen-bottom">{bottom}</div>}

      {solved && (
        <div className="challenge-success" role="status">
          <div className="challenge-success-check">
            <Icon name="check" size={40} strokeWidth={3} />
          </div>
          <p className="challenge-success-title">Well done!</p>
        </div>
      )}
    </div>
  )
}

/** Shake + short message for a wrong try. Returns [feedback, shaking, showWrong(text), clear()]. */
export function useWrong() {
  const [feedback, setFeedback] = useState('')
  const [shaking, setShaking] = useState(false)
  const showWrong = (text) => {
    setFeedback(text)
    setShaking(true)
    vibrate(patterns.tap)
    setTimeout(() => setShaking(false), 420)
  }
  return [feedback, shaking, showWrong, () => setFeedback('')]
}

/** Stable shuffle (same order on every render for the same seed). */
export function shuffled(items, seed = 1) {
  const list = [...items]
  let s = seed
  const rand = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[list[i], list[j]] = [list[j], list[i]]
  }
  return list
}
