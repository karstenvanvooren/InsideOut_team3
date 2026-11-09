// The big moments of the game, full screen on deep burgundy (hi-fi v3):
//   DiaryPage       a hook = a page from her diary
//   FragmentReward  a new piece: confetti, the piece taped on, a FOUND stamp
import { useEffect, useMemo } from 'react'
import { fragmentNumber, getFragment, getFragments } from '../../lib/story.js'
import { patterns, vibrate } from '../../lib/vibrate.js'

const CONFETTI_COLOURS = ['var(--rose)', 'var(--cream)', 'var(--sage)', 'var(--blue)', 'var(--white)']

function Confetti({ count = 34 }) {
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: `${(i * 37) % 100}%`,
        background: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
        '--delay': `${(i % 9) * 90}ms`,
        '--dur': `${2.2 + (i % 5) * 0.35}s`,
        '--drift': `${((i % 7) - 3) * 18}px`,
        '--spin': `${360 + (i % 4) * 160}deg`,
        width: i % 3 ? 7 : 11,
        height: i % 3 ? 12 : 5,
      })),
    [count],
  )
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((style, i) => (
        <i key={i} style={style} />
      ))}
    </div>
  )
}

/** A hook: one chapter of her story, as a page torn from her diary. */
export function DiaryPage({ hook, collected, total, onClose }) {
  const content = hook?.content ?? {}
  useEffect(() => vibrate(patterns.found), [])
  return (
    <div className="deep-screen diary-screen" role="dialog" aria-modal="true" aria-label={content.title ?? 'Hook collected'}>
      <div className="deep-inner">
        <div className="diary-stickers">
          <span className="sticker is-dark" style={{ '--tilt': '-3deg' }}>
            hook {collected}/{total}
          </span>
          {content.chapter && (
            <span className="sticker" style={{ '--tilt': '2deg', '--delay': '120ms' }}>
              chapter {content.chapter}
            </span>
          )}
        </div>
        <article className="diary-page taped" style={{ '--tape-rot': '-5deg', '--tape-x': '-30px' }}>
          <h2 className="diary-title">{content.title ?? 'Hook collected'}</h2>
          {content.text && <p className="diary-text">{content.text}</p>}
          <span className="diary-scrap taped" aria-hidden="true" style={{ '--tape-rot': '14deg', '--delay': '500ms' }} />
        </article>
        <div className="deep-bottom">
          <button type="button" className="btn btn-block" onClick={onClose}>
            Keep walking
          </button>
          <p className="deep-note">saved in your collection</p>
        </div>
      </div>
    </div>
  )
}

/** What a challenge gave: one or two pieces. "Continue" → next challenge / riddle / finale. */
export function FragmentReward({ fragmentIds, found, nextLabel, onContinue }) {
  const fragments = fragmentIds.map(getFragment).filter(Boolean)
  useEffect(() => {
    const t = setTimeout(() => vibrate(patterns.unlock), 650) // when the stamp lands
    return () => clearTimeout(t)
  }, [])
  if (!fragments.length) return null
  const numbers = fragments.map((f) => fragmentNumber(f.id))
  return (
    <div className="deep-screen reward-screen" role="dialog" aria-modal="true" aria-label="New piece">
      <Confetti />
      <div className="deep-inner">
        <h2 className="big-title reward-title">{fragments.length === 1 ? 'new piece!' : `${fragments.length} new pieces!`}</h2>
        <div className={`reward-pieces count-${fragments.length}`}>
          {fragments.map((f, i) => (
            <figure key={f.id} className="reward-piece taped" style={{ '--tilt': `${i ? 5 : -5}deg`, '--delay': `${i * 180}ms`, '--tape-rot': `${i ? -6 : 5}deg` }}>
              <img src={f.src} alt={f.title} />
            </figure>
          ))}
          <span className="reward-stamp" aria-hidden="true">
            found
          </span>
        </div>
        <div className="reward-info">
          <span className="sticker" style={{ '--tilt': '-4deg', '--delay': '700ms' }}>
            {numbers.length === 1 ? `fragment ${numbers[0]}` : `fragments ${numbers.join(' & ')}`} · {found}/{getFragments().length}
          </span>
          <p className="hand reward-hand">real or fake? you’ll know at the museum.</p>
        </div>
        <div className="deep-bottom">
          <button type="button" className="btn btn-block" onClick={onContinue}>
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
