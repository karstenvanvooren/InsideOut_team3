import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FragmentViewer, { FragmentThumb } from '../components/FragmentViewer.jsx'
import BottomSheet from '../components/ui/BottomSheet.jsx'
import { Eyebrow } from '../components/ui/basics.jsx'
import { HookThumb } from '../components/ui/HookThumb.jsx'
import { LockIcon } from '../components/ui/icons.jsx'
import { useGame } from '../game/GameProvider.jsx'
import { STARTED_PHASES } from '../game/gameState.js'
import { fragmentNumber, getFragments, getHooks } from '../lib/story.js'
import story from '../data/story.json'

function LockedCard() {
  return (
    <li className="collect-card is-locked">
      <LockIcon className="collect-card-lock" />
      <span>Not found yet</span>
    </li>
  )
}

// One collection, two tabs: fragments (from the locations) and hooks (found on the way).
// Tap a found card to see it in full.
export default function Collection() {
  const navigate = useNavigate()
  const { phase, fragments: found, isHookCollected, hooksCollected, hooksTotal } = useGame()
  const [tab, setTab] = useState('fragments')
  const [open, setOpen] = useState(null) // { kind: 'fragment' | 'hook', item }
  const allFragments = getFragments()
  const hooks = getHooks()
  const finished = phase === 'finale' // after the finale: real or fake is revealed
  const finale = story.finale ?? {}
  const verdict = (fragment) =>
    finished ? (
      <span className={`collect-card-sub ${fragment.real ? 'is-real' : 'is-fake'}`}>{fragment.real ? 'Real' : 'Fake'}</span>
    ) : (
      <span className="collect-card-sub">Real or fake?</span>
    )

  return (
    <div className="page collection">
      <header className="collection-head">
        <h1 className="screen-title">Collection</h1>
        {/* The bottom nav takes you back during the game; before that there's no nav */}
        {!STARTED_PHASES.includes(phase) && (
          <button type="button" className="text-btn" onClick={() => navigate('/')}>
            Back
          </button>
        )}
      </header>

      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'fragments'} className="tab" onClick={() => setTab('fragments')}>
          Fragments {found.length}/{allFragments.length}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'hooks'} className="tab" onClick={() => setTab('hooks')}>
          Hooks {hooksCollected}/{hooksTotal}
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
        <ul className="collect-grid">
          {allFragments.map((fragment) =>
            found.includes(fragment.id) ? (
              <li key={fragment.id}>
                <button type="button" className="collect-card" onClick={() => setOpen({ kind: 'fragment', item: fragment })}>
                  <FragmentThumb fragment={fragment} className="collect-card-image" />
                  <span className="collect-card-name">Fragment {fragmentNumber(fragment.id)}</span>
                  {verdict(fragment)}
                </button>
              </li>
            ) : (
              <LockedCard key={fragment.id} />
            ),
          )}
        </ul>
      ) : (
        <ul className="collect-grid">
          {hooks.map((hook) =>
            isHookCollected(hook.id) ? (
              <li key={hook.id}>
                <button type="button" className="collect-card" onClick={() => setOpen({ kind: 'hook', item: hook })}>
                  <span className="collect-card-image collect-card-hook">
                    <HookThumb />
                  </span>
                  <span className="collect-card-name">{hook.content?.title ?? hook.id}</span>
                  <span className="collect-card-sub">Chapter {hook.content?.chapter ?? '–'}</span>
                </button>
              </li>
            ) : (
              <LockedCard key={hook.id} />
            ),
          )}
        </ul>
      )}

      <div className="page-fade" aria-hidden="true" />

      <BottomSheet open={Boolean(open)} onClose={() => setOpen(null)} label={open?.item.title ?? 'Hook'}>
        {open?.kind === 'fragment' && (
          <div className="stack">
            <Eyebrow>
              Fragment {fragmentNumber(open.item.id)} · {finished ? (open.item.real ? 'real' : 'fake') : 'real or fake?'}
            </Eyebrow>
            <FragmentViewer fragment={open.item} />
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
        {open?.kind === 'hook' && (
          <div className="stack">
            <Eyebrow>Hook{open.item.content?.chapter ? ` · chapter ${open.item.content.chapter}` : ''}</Eyebrow>
            <h2 className="sheet-title">{open.item.content?.title ?? open.item.id}</h2>
            {open.item.content?.text && <p className="hook-story-text">{open.item.content.text}</p>}
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
