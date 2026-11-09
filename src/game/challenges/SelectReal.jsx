// Which fragments are real? (KMSKA, last challenge) – compare your fragments with
// the artwork and select the ones that belong to it. Fragments marked "real": true
// in story.json are the right ones; while none is marked, every choice counts.
import { useState } from 'react'
import { FragmentThumb } from '../../components/FragmentViewer.jsx'
import { PrimaryButton } from '../../components/ui/basics.jsx'
import { Icon } from '../../components/ui/icons.jsx'
import { fragmentNumber, getFragment, getFragments } from '../../lib/story.js'
import { useGame } from '../GameProvider.jsx'
import ChallengeFrame, { useChallenge, useWrong } from './ChallengeFrame.jsx'

export default function SelectReal({ onClose }) {
  const { solve, solved, challenge } = useChallenge()
  const { fragments } = useGame()
  const owned = fragments.map(getFragment).filter(Boolean)
  const [selected, setSelected] = useState([])
  const [feedback, shaking, showWrong, clear] = useWrong()
  const realIds = getFragments().filter((f) => f.real === true).map((f) => f.id)

  const toggle = (id) => {
    clear()
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }
  const confirm = () => {
    if (!realIds.length) return solve()
    const right = realIds.filter((id) => fragments.includes(id))
    const ok = right.length === selected.length && right.every((id) => selected.includes(id))
    if (ok) solve()
    else showWrong('Not quite – compare them with the artwork again.')
  }

  return (
    <ChallengeFrame
      onClose={onClose}
      counter={`${selected.length} selected`}
      bottom={
        <PrimaryButton className="btn-secondary" disabled={!selected.length || solved} onClick={confirm}>
          Confirm my choice
        </PrimaryButton>
      }
    >
      <div>
        <h2 className="challenge-question">{challenge.question}</h2>
        <p className="muted challenge-text">{challenge.text}</p>
      </div>
      {feedback && <p className="feedback" role="status">{feedback}</p>}
      <div className={`select-grid ${shaking ? 'shake' : ''}`}>
        {owned.map((fragment) => {
          const on = selected.includes(fragment.id)
          return (
            <button key={fragment.id} type="button" className="select-tile" aria-pressed={on} onClick={() => toggle(fragment.id)}>
              <FragmentThumb fragment={fragment} className="select-tile-thumb" />
              <span className="select-tile-label">F{fragmentNumber(fragment.id)}</span>
              {on && (
                <span className="select-tile-check">
                  <Icon name="check" size={14} strokeWidth={3} />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </ChallengeFrame>
  )
}
