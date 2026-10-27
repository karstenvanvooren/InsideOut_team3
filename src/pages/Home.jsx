import { Link } from 'react-router-dom'
import ProgressBar from '../components/ProgressBar.jsx'
import ResetButton from '../components/ResetButton.jsx'
import { getChapter, getHooks, meta, totalFragments } from '../lib/story.js'
import { useProgress } from '../lib/useProgress.js'

export default function Home() {
  const { foundFragments, unlockedChapters, foundHooks, finaleUnlocked } = useProgress()
  const started = foundHooks.length > 0
  const allHooksFound = foundHooks.length === getHooks().length

  return (
    <div className="page stack">
      <header>
        <div className="eyebrow">Antwerp · case file</div>
        <h1>{meta.title}</h1>
        <p className="muted">{meta.tagline}</p>
      </header>

      <p>{meta.intro}</p>

      <section className="card">
        <ProgressBar value={foundFragments.length} max={totalFragments()} label="Fragments found" />
      </section>

      {!started && (
        <section className="card card-accent">
          <h3>How to start</h3>
          <ol>
            <li>Look for a street-art trace with a QR code or NFC tag.</li>
            <li>Scan it with your phone camera, or tap your phone on the tag.</li>
            <li>A chapter opens. Read the fragments and follow the clue.</li>
          </ol>
          <Link to="/scan" className="btn btn-block">
            Open the scanner
          </Link>
        </section>
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

      {allHooksFound && !finaleUnlocked && (
        <Link to="/finale" className="btn btn-block">
          Go to the finale
        </Link>
      )}

      {finaleUnlocked && (
        <Link to="/share" className="btn btn-block">
          Get your solved case card
        </Link>
      )}

      <Link to="/collection" className="btn btn-ghost btn-block">
        View collection
      </Link>

      {import.meta.env.DEV && (
        <section className="card">
          <div className="eyebrow">Dev only · test hooks</div>
          <p className="muted">These links only show while running npm run dev.</p>
          <ul className="hook-list">
            {getHooks().map((hook) => (
              <li key={hook.id}>
                <Link to={`/hook/${hook.id}`}>/hook/{hook.id}</Link>
                <span className="muted">{hook.label}</span>
              </li>
            ))}
            <li>
              <Link to="/hook/does-not-exist">/hook/does-not-exist</Link>
            </li>
          </ul>
        </section>
      )}

      <ResetButton />
    </div>
  )
}
