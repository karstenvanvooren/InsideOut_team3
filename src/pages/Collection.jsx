import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomSheet from '../components/ui/BottomSheet.jsx'
import { Eyebrow } from '../components/ui/basics.jsx'
import { useGame } from '../game/GameProvider.jsx'
import { STARTED_PHASES } from '../game/gameState.js'
import { fragmentNumber, getFragments, getHooks, getLocations } from '../lib/story.js'
import story from '../data/story.json'
import { TicketCard, VoucherCard } from '../game/popups/BigMoments.jsx'
import { getTicket } from '../lib/ticket.js'
import { getVoucher, hooksForVoucher, voucherPlace } from '../lib/voucher.js'

/** A found piece (pinned – it's linen) or diary page (taped) in the scrapbook. Tap → it turns around (more info on the back). */
function FlipItem({ index, flipped, onFlip, label, tall = false, children }) {
  return (
    <li className={`stash-item ${tall ? 'is-tall' : ''}`} style={{ '--tilt': `${[-4, 3, 2, -3, -2, 4][index % 6]}deg`, '--delay': `${index * 60}ms` }}>
      <button type="button" className={`stash-flip ${flipped ? 'is-flipped' : ''}`} onClick={onFlip} aria-pressed={flipped} aria-label={`${label}${flipped ? ' (back)' : ''}`}>
        <span className="stash-inner">{children}</span>
      </button>
    </li>
  )
}

/** One stitched spot for everything still to find. */
function MoreOutThere({ count, text, tall = false }) {
  if (count <= 0) return null
  return (
    <li className={`stash-item stash-more ${tall ? 'is-tall' : ''}`}>
      <span className="hand">
        {count} {text}
      </span>
    </li>
  )
}

// Your stash: two tabs, the pieces (from the locations) and her diary (the hooks).
// Everything is taped into a scrapbook; tap something and it turns around.
export default function Collection() {
  const navigate = useNavigate()
  const { phase, fragments: found, hooksCollected, hooksTotal, startedAt } = useGame()
  const ticket = getTicket(startedAt) // the museum ticket, once unlocked at the KMSKA
  const voucher = getVoucher(startedAt) // coffee & cake, once you found enough hooks
  const [tab, setTab] = useState('fragments')
  const [open, setOpen] = useState(null) // { kind: 'artwork', item }
  const [flipped, setFlipped] = useState(null) // the card that shows its back
  const flip = (id) => setFlipped((now) => (now === id ? null : id))
  const allFragments = getFragments()
  const hooks = getHooks()
  const finished = phase === 'finale' // after the finale: real or fake is revealed
  const finale = story.finale ?? {}

  return (
    <div className="page collection">
      <header className="collection-head">
        <h1 className="screen-title">your stash.</h1>
        {(ticket || voucher) && (
          <div className="stash-tickets">
            {ticket && (
              <button type="button" className="sticker is-rose stash-ticket-btn" style={{ '--tilt': '3deg' }} onClick={() => setOpen({ kind: 'ticket' })}>
                your ticket
              </button>
            )}
            {voucher && (
              <button type="button" className="sticker stash-ticket-btn stash-voucher-btn" style={{ '--tilt': '-2deg' }} onClick={() => setOpen({ kind: 'voucher' })}>
                your voucher
              </button>
            )}
          </div>
        )}
        {/* The bottom nav takes you back during the game; before that there's no nav */}
        {!STARTED_PHASES.includes(phase) && (
          <button type="button" className="text-btn" onClick={() => navigate('/')}>
            Back
          </button>
        )}
      </header>

      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'fragments'} className="tab" onClick={() => setTab('fragments')}>
          Pieces {found.length}/{allFragments.length}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'hooks'} className="tab" onClick={() => setTab('hooks')}>
          Her diary {hooksCollected}/{hooksTotal}
        </button>
      </div>

      {tab === 'fragments' && finished && (
        <button type="button" className="collect-artwork" onClick={() => setOpen({ kind: 'artwork', item: { title: finale.title } })}>
          <img src={finale.image ?? '/fragments/artwork.svg'} alt="" />
          <span>
            <strong>{finale.title}</strong>
            <span>{finale.subtitle}</span>
          </span>
        </button>
      )}

      {tab === 'fragments' ? (
        <ul className="stash-grid">
          {allFragments
            .filter((fragment) => found.includes(fragment.id))
            .map((fragment, i) => (
              <FlipItem key={fragment.id} index={i} flipped={flipped === fragment.id} onFlip={() => flip(fragment.id)} label={`Fragment ${fragmentNumber(fragment.id)}`}>
                <span className="stash-front stash-piece pinned">
                  <img src={fragment.src} alt="" />
                  {/* after the finale: stamped real or fake, right on the piece */}
                  {finished && <span className={`stash-stamp ${fragment.real ? 'is-real' : 'is-fake'}`}>{fragment.real ? 'real' : 'fake'}</span>}
                </span>
                <span className="stash-back">
                  <span className="sticker is-tint">fragment {fragmentNumber(fragment.id)}</span>
                  <strong className="stash-title">{fragment.title}</strong>
                  {fragment.caption && <span className="stash-text">{fragment.caption}</span>}
                  <span className={`stash-verdict ${finished ? (fragment.real ? 'is-real' : 'is-fake') : ''}`}>
                    {finished ? (fragment.real ? 'real – part of the artwork' : 'fake – not hers') : 'real or fake?'}
                  </span>
                </span>
              </FlipItem>
            ))}
          <MoreOutThere count={allFragments.length - found.length} text="more out there" />
        </ul>
      ) : (
        <ul className="stash-grid">
          {/* her story in the order you found the hooks (see getChapter); after the finale the whole diary is open */}
          {hooks
            .slice(0, finished ? hooks.length : hooksCollected)
            .map((hook, i) => (
              <FlipItem key={hook.id} index={i} flipped={flipped === hook.id} onFlip={() => flip(hook.id)} label={hook.content?.title ?? 'Diary page'} tall>
                <span className="stash-front stash-diary taped">
                  <span className="sticker">chapter {hook.content?.chapter ?? '–'}</span>
                  {i >= hooksCollected && <span className="sticker is-rose stash-missed">missed</span>}
                  <strong className="hand stash-diary-title">{hook.content?.title ?? hook.id}</strong>
                  <span className="stash-turn hand">turn the page</span>
                </span>
                <span className="stash-back stash-diary-back">
                  <span className="hand stash-diary-text">{hook.content?.text}</span>
                </span>
              </FlipItem>
            ))}
          <MoreOutThere count={finished ? 0 : hooksTotal - hooksCollected} text={hooksTotal - hooksCollected === 1 ? 'page still hidden' : 'pages still hidden'} tall />
        </ul>
      )}

      <div className="page-fade" aria-hidden="true" />

      <BottomSheet open={Boolean(open)} onClose={() => setOpen(null)} label={open?.kind === 'ticket' ? 'Your ticket' : open?.kind === 'voucher' ? 'Your voucher' : 'The artwork'}>
        {open?.kind === 'voucher' && voucher && (
          <div className="stack">
            <Eyebrow>Coffee &amp; cake on us</Eyebrow>
            <VoucherCard voucher={voucher} place={voucherPlace()} hooks={hooksForVoucher()} />
            <p className="muted">Show this at the counter.</p>
          </div>
        )}
        {open?.kind === 'ticket' && ticket && (
          <div className="stack">
            <Eyebrow>Your museum ticket</Eyebrow>
            <TicketCard ticket={ticket} place={getLocations().at(-1)?.name ?? 'KMSKA'} />
            <p className="muted">Show this at the desk.</p>
          </div>
        )}
        {open?.kind === 'artwork' && (
          <div className="stack">
            <Eyebrow>The artwork</Eyebrow>
            <h2 className="sheet-title">{finale.title}</h2>
            <img className="collect-artwork-full" src={finale.image ?? '/fragments/artwork.svg'} alt={finale.alt ?? ''} />
            <p className="muted">{finale.subtitle}</p>
            {finale.text && <p className="hook-story-text">{finale.text}</p>}
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
