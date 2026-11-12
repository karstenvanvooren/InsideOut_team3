// The end of the game (phase "finale", after the last challenge at the KMSKA).
// 1. reveal   The page appears blurred, like a memory ("sfumato"). The real fragments
//             the player found fly into their place, one by one, and the page becomes sharp.
//             Then: look up – the real pages hang on the wall in front of you.
// 2. story    Three cards to swipe: who she is, what the work is, why fabric (+ the long text).
// 3. verdict  Real or fake? Your score ("you spotted 4 of 6 fakes"), what gave each fake away, share.
// 4. sew      The player sews their own page from the real pieces (SewPage.jsx)…
// 5. page     …"ode à toi", to share as a story.
// 6. end      Everything you take home: ticket, voucher, her whole diary, play again, credits.
// The picture is the photo of Ode à l'oubli; the real pieces are cut from it.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getFragment, getFragments, getLocations, meta } from '../../lib/story.js'
import { fakeScore } from '../../lib/realfake.js'
import { getTicket } from '../../lib/ticket.js'
import { getVoucher, hooksForVoucher, voucherPlace } from '../../lib/voucher.js'
import { patterns, vibrate } from '../../lib/vibrate.js'
import { useGame } from '../GameProvider.jsx'
import { TicketCard, VoucherCard } from '../popups/BigMoments.jsx'
import story from '../../data/story.json'
import { OdePage, SewPage, clearPage, loadPage } from './SewPage.jsx'

const PIECE_MS = 650 // between two pieces flying in

function formatDuration(ms) {
  if (!ms || ms < 0) return null
  const minutes = Math.round(ms / 60000)
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`
}

export default function FinaleScreen() {
  const game = useGame()
  const { fragments: owned, hooksCollected, startedAt, phaseSince } = game
  const real = getFragments().filter((f) => f.real)
  const foundReal = real.filter((f) => owned.includes(f.id))
  const fakes = owned.map(getFragment).filter((f) => f && !f.real)
  const [page, setPage] = useState(loadPage) // the player's own page, once sewn
  const [step, setStep] = useState(() => (loadPage() ? 'end' : 'reveal'))
  const go = (next) => {
    setStep(next)
    document.querySelector('.finale-scroll, .deep-screen')?.scrollTo?.(0, 0)
  }

  const duration = formatDuration((phaseSince ?? Date.now()) - (startedAt ?? 0))
  const stats = `${foundReal.length}/${real.length} real · ${hooksCollected} chapters${duration ? ` · ${duration}` : ''}`
  const score = fakeScore(
    startedAt,
    fakes.map((f) => f.id),
  )

  if (step === 'story') return <StoryCards onDone={() => go('verdict')} />
  if (step === 'verdict') return <Verdict score={score} fakes={fakes} reals={foundReal} onDone={() => go('sew')} />
  if (step === 'sew')
    return (
      <SewPage
        pieces={foundReal}
        onDone={(p) => {
          setPage(p)
          go('page')
        }}
      />
    )
  if (step === 'page' && page) return <OdePage page={page} stats={stats} onContinue={() => go('end')} />
  if (step === 'end')
    return <EndPage game={game} score={score} foundReal={foundReal} real={real} duration={duration} hasPage={Boolean(page)} onPage={() => go(page ? 'page' : 'sew')} />

  return <Reveal pieces={foundReal} onDone={() => go('story')} />
}

/* ---------- 1. The pieces fly in, then: look up ---------- */
function Reveal({ pieces, onDone }) {
  const finale = story.finale ?? {}
  const [placed, setPlaced] = useState(0)
  const done = placed >= pieces.length

  useEffect(() => {
    if (done) {
      vibrate(patterns.unlock)
      return
    }
    const timer = setTimeout(() => setPlaced((n) => n + 1), placed === 0 ? 900 : PIECE_MS)
    return () => clearTimeout(timer)
  }, [placed, done])

  const [W, H] = finale.size ?? [600, 800] // the picture's size; "place" of the pieces is in these units
  const lookUp = finale.lookUp ?? {}

  return (
    <div className="finale-screen">
      <div className="finale-scroll">
        <span className="sticker is-white finale-sticker" style={{ '--tilt': '-2deg' }}>
          the last page
        </span>

        <div className={`finale-artwork ${done ? 'is-complete' : ''}`} style={{ aspectRatio: `${W} / ${H}` }}>
          <img className="finale-page" src={finale.image ?? '/fragments/artwork.svg'} alt={done ? finale.alt ?? 'The artwork' : ''} />
          {pieces.map((f, i) => {
            const [x, y, w, h] = f.place ?? [0, 0, 0, 0]
            return (
              <img
                key={f.id}
                className={`finale-piece ${i < placed ? 'is-placed' : ''}`}
                src={f.src}
                alt=""
                style={{
                  left: `${(x / W) * 100}%`,
                  top: `${(y / H) * 100}%`,
                  width: `${(w / W) * 100}%`,
                  height: `${(h / H) * 100}%`,
                  '--from-x': `${(i % 2 ? 1 : -1) * (60 + i * 10)}px`,
                  '--from-y': `${140 + i * 20}px`,
                  '--turn': `${(i % 2 ? 1 : -1) * (8 + i * 3)}deg`,
                }}
              />
            )
          })}
        </div>

        <div className={`finale-reveal ${done ? 'is-visible' : ''}`} aria-live="polite">
          {done && (
            <>
              <ArtistCollage photos={finale.photos} />
              <h1 className="big-title finale-lookup">{lookUp.title ?? 'look up.'}</h1>
              <p className="hand finale-hand">{lookUp.text ?? '(your pieces are on the wall in front of you. can you find them?)'}</p>
              <p className="finale-count">
                {pieces.length} {pieces.length === 1 ? 'piece' : 'pieces'} back in their place
              </p>
              <button type="button" className="btn btn-block" onClick={onDone}>
                I found them
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/** Under the artwork: a collage of photos of the artist herself (story.json → finale.photos). */
function ArtistCollage({ photos = [] }) {
  if (!photos.length) return null
  return (
    <section className="artist-collage" aria-label="Photos of Louise Bourgeois">
      <p className="hand artist-collage-title">(this is her. Louise Bourgeois, 1911–2010)</p>
      <div className="artist-collage-grid">
        {photos.map((photo, i) => (
          <figure
            key={photo.src}
            className={`artist-photo ${i % 3 === 1 ? 'taped' : ''}`}
            style={{ '--tilt': `${[-4, 3, -2, 5, -3, 2][i % 6]}deg`, '--delay': `${200 + i * 90}ms` }}
          >
            <img src={photo.src} alt={photo.alt} loading="lazy" />
          </figure>
        ))}
      </div>
    </section>
  )
}

/* ---------- 2. Three cards to swipe: who she is, what the work is, why fabric ---------- */
function StoryCards({ onDone }) {
  const finale = story.finale ?? {}
  const cards = finale.cards ?? []
  const track = useRef(null)
  const [active, setActive] = useState(0)
  const [more, setMore] = useState(false)
  const last = active >= cards.length - 1

  const onScroll = () => {
    const el = track.current
    if (!el) return
    setActive(Math.round(el.scrollLeft / el.clientWidth))
  }
  const next = () => {
    if (last) return onDone()
    const el = track.current
    el?.scrollTo({ left: (active + 1) * el.clientWidth, behavior: 'smooth' })
  }

  return (
    <div className="finale-screen story-screen">
      <div className="finale-scroll">
        <span className="sticker is-white finale-sticker" style={{ '--tilt': '2deg' }}>
          who left the message?
        </span>

        <div className="story-track" ref={track} onScroll={onScroll} aria-roledescription="carousel">
          {cards.map((card, i) => (
            <article key={i} className={`story-card is-${i % 3}`} aria-label={`${i + 1} of ${cards.length}`}>
              <span className="sticker is-dark story-card-eyebrow" style={{ '--tilt': `${i % 2 ? 2 : -2}deg` }}>
                {card.eyebrow}
              </span>
              <h2 className="big-title story-card-title">{card.title}</h2>
              <p className="story-card-text">{card.text}</p>
              <span className="story-card-num hand">
                {i + 1}/{cards.length}
              </span>
            </article>
          ))}
        </div>

        <div className="story-dots" aria-hidden="true">
          {cards.map((_, i) => (
            <i key={i} className={i === active ? 'is-on' : ''} />
          ))}
        </div>
        <p className="hand story-swipe">{last ? '(that’s her.)' : '(swipe →)'}</p>

        <button type="button" className="btn btn-block story-next" onClick={next}>
          {last ? 'Real or fake?' : 'Next'}
        </button>
        {finale.text && (
          <div className="story-more">
            <button type="button" className="text-btn" aria-expanded={more} onClick={() => setMore((m) => !m)}>
              {more ? 'Hide the full story' : 'Read the full story'}
            </button>
            {more && (
              <div className="story-more-text">
                <strong>{finale.subtitle}</strong>
                <p>{finale.text}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------- 3. Real or fake: your score and what gave each fake away ---------- */
function Verdict({ score, fakes, reals, onDone }) {
  const [msg, setMsg] = useState('')
  const { spotted, total, fooledBy } = score
  const perfect = total > 0 && spotted === total

  const share = async () => {
    setMsg('')
    const text = `I spotted ${spotted} of ${total} fakes in Inside Out – a mystery through Antwerp. Can you do better?`
    const url = window.location.origin
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Inside Out', text, url })
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`)
        setMsg('Copied – paste it anywhere.')
      }
    } catch (err) {
      if (err?.name !== 'AbortError') setMsg('Couldn’t share. Try again.')
    }
  }

  return (
    <div className="finale-screen verdict-screen">
      <div className="finale-scroll">
        <span className="sticker is-rose finale-sticker" style={{ '--tilt': '-3deg' }}>
          real or fake?
        </span>
        <h1 className="big-title verdict-title">
          {total ? (
            <>
              you spotted <span className="verdict-score">{spotted}</span> of {total} fakes.
            </>
          ) : (
            'no fakes in your stash.'
          )}
        </h1>
        <p className="hand finale-hand">
          {perfect ? '(not one fooled you. sharp eyes.)' : total ? `(${fooledBy.length} got you on your first try.)` : '(you only kept the real ones.)'}
        </p>

        {fakes.length > 0 && (
          <ul className="fake-list">
            {fakes.map((f, i) => {
              const fooled = fooledBy.includes(f.id)
              return (
                <li key={f.id} className="fake-item" style={{ '--tilt': `${i % 2 ? 1.5 : -1.5}deg` }}>
                  <img className="fake-thumb taped" src={f.src} alt="" />
                  <div className="fake-body">
                    <div className="fake-head">
                      <strong>{f.title}</strong>
                      <span className={`fake-badge ${fooled ? 'is-fooled' : 'is-spotted'}`}>{fooled ? 'fooled you' : 'spotted'}</span>
                    </div>
                    <p>{f.off ?? 'Made by us. You won’t find it on her pages.'}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {reals.length > 0 && (
          <div className="real-strip">
            <span className="hand">and these were hers:</span>
            <div className="real-strip-row">
              {reals.map((f) => (
                <img key={f.id} src={f.src} alt={f.title} />
              ))}
            </div>
          </div>
        )}

        <div className="verdict-actions">
          {total > 0 && (
            <button type="button" className="btn btn-block btn-secondary" onClick={share}>
              Share my score
            </button>
          )}
          {msg && (
            <p className="muted verdict-msg" role="status">
              {msg}
            </p>
          )}
          <p className="hand verdict-sew">she mended her memories. now it’s your turn.</p>
          <button type="button" className="btn btn-block" onClick={onDone}>
            Sew your own page
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------- 6. The end: what you take home ---------- */
function EndPage({ game, score, foundReal, real, duration, hasPage, onPage }) {
  const navigate = useNavigate()
  const { startedAt, hooksCollected, hooksTotal, resetGame } = game
  const ticket = getTicket(startedAt)
  const voucher = getVoucher(startedAt)
  const need = hooksForVoucher()
  const hooks = story.hooks ?? []
  const credits = story.credits ?? {}
  const [open, setOpen] = useState(null) // the chapter that's open
  const [confirm, setConfirm] = useState(false)

  const playAgain = () => {
    clearPage()
    resetGame()
    navigate('/')
  }

  return (
    <div className="finale-screen end-screen">
      <div className="finale-scroll">
        <span className="sticker finale-sticker end-sticker" style={{ '--tilt': '-2deg' }}>
          the end
        </span>
        <h1 className="big-title end-title">that’s the last page.</h1>
        <p className="hand finale-hand">(for now. hers is still on the wall.)</p>

        <ul className="finale-stats">
          <li>
            <strong>
              {foundReal.length}/{real.length}
            </strong>
            <span>real pieces</span>
          </li>
          <li>
            <strong>
              {score.spotted}/{score.total}
            </strong>
            <span>fakes spotted</span>
          </li>
          <li>
            <strong>
              {hooksCollected}/{hooksTotal}
            </strong>
            <span>chapters found</span>
          </li>
          {duration && (
            <li>
              <strong>{duration}</strong>
              <span>on the trail</span>
            </li>
          )}
        </ul>

        <section className="end-section">
          <h2 className="end-heading">what you take home</h2>
          {ticket && <TicketCard ticket={ticket} place={getLocations().at(-1)?.name ?? 'KMSKA'} />}
          {voucher ? (
            <VoucherCard voucher={voucher} place={voucherPlace()} hooks={need} />
          ) : (
            <div className="end-voucher-todo">
              <strong>coffee &amp; cake</strong>
              <span>
                {hooksCollected}/{need} chapters · find {need - hooksCollected} more {need - hooksCollected === 1 ? 'hook' : 'hooks'} in the streets and it’s on us.
              </span>
              <span className="end-progress" aria-hidden="true">
                <i style={{ width: `${Math.min(100, (hooksCollected / need) * 100)}%` }} />
              </span>
            </div>
          )}
        </section>

        <section className="end-section">
          <h2 className="end-heading">her whole diary</h2>
          <p className="muted end-sub">All {hooks.length} chapters are open now – also the ones you missed.</p>
          <ol className="end-chapters">
            {hooks.map((hook, i) => {
              const c = hook.content ?? {}
              const isOpen = open === hook.id
              return (
                <li key={hook.id} className={`end-chapter ${isOpen ? 'is-open' : ''}`}>
                  <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : hook.id)}>
                    <span className="end-chapter-num">{c.chapter ?? i + 1}</span>
                    <span className="end-chapter-title">{c.title ?? hook.id}</span>
                    {i >= hooksCollected && <span className="end-missed">missed</span>}
                  </button>
                  {isOpen && <p className="hand end-chapter-text">{c.text}</p>}
                </li>
              )
            })}
          </ol>
        </section>

        <div className="end-actions">
          <button type="button" className="btn btn-block" onClick={onPage}>
            {hasPage ? 'See my page again' : 'Sew your own page'}
          </button>
          <button type="button" className="btn btn-block btn-secondary" onClick={() => navigate('/collection')}>
            View my stash
          </button>
          {confirm ? (
            <div className="end-confirm" role="alertdialog" aria-label="Play again?">
              <p>Start over? Your pieces, your page, your diary, your ticket and your voucher will be gone – use them first.</p>
              <div className="end-confirm-row">
                <button type="button" className="btn btn-secondary" onClick={() => setConfirm(false)}>
                  Keep this game
                </button>
                <button type="button" className="btn" onClick={playAgain}>
                  Yes, play again
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="text-btn end-again" onClick={() => setConfirm(true)}>
              Play again
            </button>
          )}
        </div>

        <footer className="end-credits">
          <strong className="end-credits-brand">Sfumato</strong>
          <span className="end-credits-by">is made by {credits.team ?? 'Frosinone · team 3'}</span>
          {credits.names?.length > 0 && (
            <ul className="end-credits-names">
              {credits.names.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          )}
          <span className="muted end-credits-art">Artwork: Louise Bourgeois, {story.finale?.subtitle}</span>
        </footer>
      </div>
    </div>
  )
}
