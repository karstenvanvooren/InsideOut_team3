import { Link } from 'react-router-dom'
import ProgressBar from '../components/ProgressBar.jsx'
import ResetButton from '../components/ResetButton.jsx'
import { getChapter, getHook, getStartHook, meta, totalFragments } from '../lib/story.js'
import { useProgress } from '../lib/useProgress.js'

export default function Home() {
  const { foundFragments, unlockedChapters, completedHooks, finaleAvailable, finaleUnlocked, isRiddleSolved } =
    useProgress()
  const started = completedHooks.length > 0
  const lastHook = getHook(completedHooks.at(-1))
  const currentClue = lastHook?.chapter ? getChapter(lastHook.chapter)?.clue : null
  const riddleHook = lastHook?.riddle ? lastHook : null
  const startHook = getStartHook()

  return (
    <div className="page stack">
      <header>
        <div className="eyebrow">Antwerp · case file</div>
        <h1>{meta.title}</h1>
        <p className="muted">{meta.tagline}</p>
      </header>

      {!started && <p>{meta.intro}</p>}

      <section className="card">
        <ProgressBar value={foundFragments.length} max={totalFragments()} label="Fragments found" />
      </section>

      {!started && (
        <section className="card card-accent">
          <h3>How to play</h3>
          <ol>
            {startHook && (
              <li>
                Start at the {startHook.location.name}
                {startHook.location.address && ` (${startHook.location.address})`} and scan the first trace.
              </li>
            )}
            <li>Find a trace: street art with a QR code or NFC tag.</li>
            <li>Scan it with your phone camera, or tap your phone on the tag.</li>
            <li>Allow your location — you have to really be there.</li>
            <li>Answer the question about the place to open the chapter.</li>
            <li>Solve the riddle: the map shows you the way to the next trace.</li>
          </ol>
          <Link to="/scan" className="btn btn-block">
            Open the scanner
          </Link>
        </section>
      )}

      {started && !finaleUnlocked && (currentClue || riddleHook) && (
        <section className="card card-accent">
          <div className="eyebrow">Your current clue</div>
          <p className="clue">{currentClue ?? 'Solve the riddle to find your first location.'}</p>
          {riddleHook && (
            <Link to={`/riddle/${riddleHook.id}`} className="btn btn-block">
              {isRiddleSolved(riddleHook.id) ? 'Show the route' : 'Solve the riddle'}
            </Link>
          )}
          {finaleAvailable && !riddleHook && (
            <Link to="/finale" className="btn btn-block">
              Go to the museum
            </Link>
          )}
        </section>
      )}

      {finaleUnlocked && (
        <Link to="/share" className="btn btn-block">
          Get your solved case card
        </Link>
      )}

      {started && (
        <section>
          <div className="eyebrow">Your chapters</div>
          <ul className="hook-list">
            {unlockedChapters.map((id) => (
              <li key={id}>
                <Link to={`/chapter/${id}`}>{getChapter(id)?.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link to="/collection" className="btn btn-ghost btn-block">
        View collection
      </Link>

      <ResetButton />
    </div>
  )
}
