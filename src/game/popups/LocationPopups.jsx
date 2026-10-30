import { Link } from 'react-router-dom'
import { FragmentThumb } from '../../components/FragmentViewer.jsx'
import { Chip, Eyebrow, PrimaryButton } from '../../components/ui/basics.jsx'
import { Icon } from '../../components/ui/icons.jsx'
import { fragmentNumber, getFragments, getLocationFragments, getLocations } from '../../lib/story.js'

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

/** The challenge card's labels. One (placeholder) challenge per location for now. */
function challengeInfo(location) {
  const challenges = [location.challenge].filter(Boolean)
  return { number: 1, total: Math.max(1, challenges.length), reward: plural(getLocationFragments(location).length, 'fragment') }
}

/** Arrived at a location: its name and the challenge. "Solve challenge" opens the challenge screen. */
export function ArrivedPopup({ location, index, onOpenChallenge }) {
  const { challenge } = location
  const info = challengeInfo(location)
  return (
    <div className="stack">
      <div>
        <Eyebrow>
          You’ve arrived · Location {index + 1}/{getLocations().length}
        </Eyebrow>
        <h2 className="sheet-title">{location.name}</h2>
      </div>
      <div className="challenge-card">
        <Eyebrow tone="blue">
          Challenge {info.number}/{info.total}
        </Eyebrow>
        <div className="challenge-card-title">{challenge?.title ?? location.name}</div>
        <Chip>Reward: {info.reward}</Chip>
      </div>
      <PrimaryButton onClick={onOpenChallenge}>Solve challenge</PrimaryButton>
    </div>
  )
}

/** The challenge itself, as a full screen. Placeholder for now: one "Solve challenge" button. */
export function ChallengeScreen({ location, onClose, onSolve }) {
  const { challenge } = location
  const info = challengeInfo(location)
  return (
    <div className="challenge-screen" role="dialog" aria-modal="true" aria-label="Challenge">
      <div className="challenge-screen-top">
        <button type="button" className="round-btn" onClick={onClose} aria-label="Back to the map">
          <Icon name="close" size={18} strokeWidth={2.4} />
        </button>
      </div>
      <div className="challenge-screen-body stack">
        <div>
          <Eyebrow tone="blue">{location.name}</Eyebrow>
          <div className="challenge-screen-count">
            Challenge {info.number}/{info.total}
          </div>
        </div>
        <div className="chip-row">
          <Chip>Reward: {info.reward}</Chip>
        </div>
        <h2 className="challenge-question">{challenge?.title ?? location.name}</h2>
        {challenge?.text && <p className="muted">{challenge.text}</p>}
      </div>
      <div className="challenge-screen-bottom">
        <PrimaryButton onClick={onSolve}>Solve challenge</PrimaryButton>
      </div>
    </div>
  )
}

/** What the challenge gave the player. "Continue" → the next riddle (or the finale). */
export function FragmentPopup({ location, found, last, onContinue }) {
  const fragments = getLocationFragments(location)
  const numbers = fragments.map((f) => fragmentNumber(f.id))
  return (
    <div className="stack center fragment-card">
      <Eyebrow>{fragments.length === 1 ? 'Fragment unlocked' : `${fragments.length} fragments unlocked`}</Eyebrow>
      <div className="fragment-card-visual">
        {fragments.map((fragment) => (
          <FragmentThumb key={fragment.id} fragment={fragment} className="fragment-card-thumb" />
        ))}
      </div>
      <div>
        <h2 className="fragment-card-title">
          {numbers.length === 1 ? `Fragment ${numbers[0]}` : `Fragments ${numbers.slice(0, -1).join(', ')} & ${numbers.at(-1)}`}
        </h2>
        <p className="fragment-card-text">Real or fake? You’ll find out at the museum.</p>
      </div>
      <div>
        <Chip tone="counter">
          Fragments {found}/{getFragments().length}
        </Chip>
      </div>
      <PrimaryButton onClick={onContinue}>{last ? 'To the finale' : 'Continue'}</PrimaryButton>
    </div>
  )
}

/** After the last location. Placeholder until the museum finale is built (old version in src/parked/). */
export function FinalePopup() {
  return (
    <div className="stack center">
      <Eyebrow>Finale</Eyebrow>
      <h2 className="sheet-title">Finale – coming soon</h2>
      <p className="muted">You reached the last location. The museum finale is built in a later step.</p>
      <Link to="/collection" className="btn btn-block">
        View collection
      </Link>
    </div>
  )
}
