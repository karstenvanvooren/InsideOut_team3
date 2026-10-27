import { Link } from 'react-router-dom'
import FragmentViewer from '../components/FragmentViewer.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import { getFragments } from '../lib/story.js'
import { useProgress } from '../lib/useProgress.js'

export default function Collection() {
  const { isFragmentFound, foundFragments } = useProgress()
  const all = getFragments()
  const missing = all.length - foundFragments.length

  return (
    <div className="page stack">
      <header>
        <div className="eyebrow">Evidence</div>
        <h1>Collection</h1>
        <p className="muted">
          {missing === 0
            ? 'You found every fragment.'
            : `${missing} fragment${missing === 1 ? '' : 's'} still missing.`}
        </p>
      </header>

      <ProgressBar value={foundFragments.length} max={all.length} label="Fragments found" />

      {foundFragments.length === 0 && (
        <div className="card center">
          <p className="muted">No fragments yet. Find your first trace in the city.</p>
          <Link to="/scan" className="btn btn-block">
            Open the scanner
          </Link>
        </div>
      )}

      {all.map((fragment) => (
        <FragmentViewer key={fragment.id} fragment={fragment} locked={!isFragmentFound(fragment.id)} />
      ))}
    </div>
  )
}
