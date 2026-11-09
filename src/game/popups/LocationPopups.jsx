import { Link } from 'react-router-dom'
import { FragmentThumb } from '../../components/FragmentViewer.jsx'
import { Chip, Eyebrow, PrimaryButton } from '../../components/ui/basics.jsx'
import { fragmentNumber, getFragment, getFragments, getLocations } from '../../lib/story.js'
import { rewardLabel } from '../challenges/ChallengeFrame.jsx'

/**
 * Arrived at a location (or back from the first challenge): what the challenge is
 * about, its reward, and "Start challenge" to open it full screen.
 */
export function ArrivedPopup({ location, index, challenge, number, total, onOpenChallenge }) {
  if (!challenge) return null
  return (
    <div className="stack">
      <div>
        <Eyebrow>
          {number === 1 ? `You’ve arrived · Location ${index + 1}/${getLocations().length}` : `Next challenge · ${location.name}`}
        </Eyebrow>
        <h2 className="sheet-title">{number === 1 ? location.name : challenge.title}</h2>
      </div>
      <div className="challenge-card">
        <Eyebrow tone="blue">
          Challenge {number}/{total}
        </Eyebrow>
        <div className="challenge-card-title">{challenge.title}</div>
        {challenge.intro && <p className="challenge-card-text">{challenge.intro}</p>}
        <Chip>Reward: {rewardLabel(challenge)}</Chip>
      </div>
      <PrimaryButton onClick={onOpenChallenge}>Start challenge</PrimaryButton>
    </div>
  )
}

/** What the challenge gave the player. "Continue" → the next challenge, the next riddle or the finale. */
export function FragmentPopup({ fragmentIds, found, nextLabel, onContinue }) {
  const fragments = fragmentIds.map(getFragment).filter(Boolean)
  const numbers = fragments.map((f) => fragmentNumber(f.id))
  if (!fragments.length) return null
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
      <PrimaryButton onClick={onContinue}>{nextLabel}</PrimaryButton>
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
