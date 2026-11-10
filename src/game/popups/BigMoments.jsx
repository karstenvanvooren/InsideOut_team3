// The big moments of the game, full screen (hi-fi v2):
//   DiaryPage       a hook = a page from her diary, dark like the start (navy)
//   FragmentReward  a new piece: confetti, the piece taped on, a FOUND stamp (full screen, over the nav)
//   TicketMoment    at the KMSKA, before the last challenges: your museum ticket
//   VoucherMoment   after the 6th hook: coffee & cake on us (the bonus for her diary)
import { useEffect, useMemo } from 'react'
import { fragmentNumber, getFragment, getFragments } from '../../lib/story.js'
import { patterns, vibrate } from '../../lib/vibrate.js'

const CONFETTI_COLOURS = ['var(--rose)', 'var(--cream)', 'var(--sage)', 'var(--blue)', 'var(--white)']

export function Confetti({ count = 34 }) {
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

/** Her title, the v2 way: lowercase with a full stop ("Her mother’s needle" → "her mother’s needle."). */
const bigTitle = (title) => {
  const t = title.toLowerCase()
  return /[a-z]$/.test(t) ? `${t}.` : t
}

/** A hook: one chapter of her story. Dark like the start (the colours of the mystery), on a taped cream page. */
export function DiaryPage({ hook, collected, total, onClose }) {
  const content = hook?.content ?? {}
  useEffect(() => vibrate(patterns.found), [])
  return (
    <div className="deep-screen diary-screen" role="dialog" aria-modal="true" aria-label={content.title ?? 'Hook collected'}>
      <div className="deep-inner">
        <div className="diary-stickers">
          <span className="sticker is-rose" style={{ '--tilt': '-3deg' }}>
            hook {collected}/{total}
          </span>
          {content.chapter && (
            <span className="sticker" style={{ '--tilt': '2deg', '--delay': '120ms' }}>
              chapter {content.chapter}
            </span>
          )}
        </div>
        <h2 className="big-title diary-title">{bigTitle(content.title ?? 'Hook collected')}</h2>
        <p className="hand diary-aside">(a page from her diary{content.chapter ? ` – chapter ${content.chapter} of ${total}` : ''})</p>
        {content.text && (
          <article className="diary-page taped" style={{ '--tape-rot': '3deg', '--tape-x': '10px' }}>
            <p className="diary-text">{content.text}</p>
            <span className="diary-scrap taped" aria-hidden="true" style={{ '--tape-rot': '-8deg', '--delay': '500ms' }} />
          </article>
        )}
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

const ticketDate = (t) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

/** The ticket itself (also shown again in the stash). */
export function TicketCard({ ticket, place }) {
  return (
    <div className="ticket" role="img" aria-label={`Free entry ticket for ${place}, code ${ticket.code}`}>
      <div className="ticket-stub" aria-hidden="true">
        <span>admit one</span>
      </div>
      <div className="ticket-main">
        <span className="ticket-eyebrow">free entry · Inside Out</span>
        <span className="ticket-place">{place}</span>
        <span className="ticket-meta">valid on {ticketDate(ticket.at)} · 1 person</span>
        <span className="ticket-code">{ticket.code}</span>
      </div>
    </div>
  )
}

/** Before the last challenges: the museum ticket is yours. "Let’s go in" → the first challenge here. */
export function TicketMoment({ ticket, place, onContinue }) {
  useEffect(() => {
    const t = setTimeout(() => vibrate(patterns.unlock), 500)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="deep-screen ticket-screen" role="dialog" aria-modal="true" aria-label="Your museum ticket">
      <Confetti count={24} />
      <div className="deep-inner">
        <span className="sticker is-rose" style={{ '--tilt': '-3deg', alignSelf: 'flex-start' }}>
          ticket unlocked
        </span>
        <h2 className="big-title ticket-title">the last door opens.</h2>
        <p className="hand ticket-aside">(the last pieces are inside. this one’s on us.)</p>
        <TicketCard ticket={ticket} place={place} />
        <div className="deep-bottom">
          <button type="button" className="btn btn-block" onClick={onContinue}>
            Let’s go in
          </button>
          <p className="deep-note">show this at the desk · saved in your stash</p>
        </div>
      </div>
    </div>
  )
}

/** The café voucher (also shown again in the stash and at the end). */
export function VoucherCard({ voucher, place, hooks }) {
  return (
    <div className="ticket is-voucher" role="img" aria-label={`Voucher for coffee and cake at ${place}, code ${voucher.code}`}>
      <div className="ticket-stub" aria-hidden="true">
        <span>on us</span>
      </div>
      <div className="ticket-main">
        <span className="ticket-eyebrow">bonus · {hooks} chapters found</span>
        <span className="ticket-place">coffee &amp; cake</span>
        <span className="ticket-meta">
          at {place} · valid on {ticketDate(voucher.at)} · 1 person
        </span>
        <span className="ticket-code">{voucher.code}</span>
      </div>
    </div>
  )
}

/** Right after the diary page that completes the bonus: coffee & cake are on us. */
export function VoucherMoment({ voucher, place, hooks, onContinue }) {
  useEffect(() => {
    const t = setTimeout(() => vibrate(patterns.unlock), 500)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="deep-screen ticket-screen voucher-screen" role="dialog" aria-modal="true" aria-label="Your café voucher">
      <Confetti count={24} />
      <div className="deep-inner">
        <span className="sticker is-white" style={{ '--tilt': '3deg', alignSelf: 'flex-start' }}>
          {hooks} chapters found
        </span>
        <h2 className="big-title ticket-title">coffee &amp; cake are on us.</h2>
        <p className="hand ticket-aside">(you read her diary. time for a break.)</p>
        <VoucherCard voucher={voucher} place={place} hooks={hooks} />
        <div className="deep-bottom">
          <button type="button" className="btn btn-block" onClick={onContinue}>
            Keep walking
          </button>
          <p className="deep-note">show this at the counter · saved in your stash</p>
        </div>
      </div>
    </div>
  )
}
